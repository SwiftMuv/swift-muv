import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { DriverStats } from "@/components/driver/DriverStats";
import { DriverJobsTabs } from "@/components/driver/DriverJobsTabs";
import { BottomNav } from "@/components/driver/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import { ActiveJobSheet } from "@/components/driver/ActiveJobSheet";
import WalletScreen from "@/components/driver/WalletScreen";
import ProfileScreen from "@/components/driver/ProfileScreen";
import HistoryScreen from "@/components/driver/HistoryScreen";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import { useI18n } from "@/contexts/I18nContext";
import TermsAgreementModal from "@/components/TermsAgreementModal";

export type JobStatus = "assigned" | "arrived" | "in_transit" | "completed";

export interface Job {
  id: string; // jobs.id (or booking.id when not yet accepted)
  bookingId: string;
  jobId?: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  moveSize: "Small" | "Medium" | "Large";
  price: number;
  status: JobStatus | "available";
  completionCode?: string;
}

const sizeLabel = (s: string): Job["moveSize"] =>
  s === "small" ? "Small" : s === "large" ? "Large" : "Medium";

const DriverDashboard = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isOnline, setIsOnline] = useState(true);

  // Stream GPS to driver_profiles while online so the 20km RLS filter works
  useDriverGeolocation(user?.id, isOnline);

  // Persist online/offline so RLS sees current state
  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    if (user) {
      await supabase.from("driver_profiles").update({ is_online: next }).eq("user_id", user.id);
    }
  };

  const [activeTab, setActiveTab] = useState("home");
  const [available, setAvailable] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [stats, setStats] = useState({ today: 0, week: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("driver_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setDriverName(data?.full_name ?? null));
  }, [user]);

  const loadAvailable = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, pickup_address, dropoff_address, move_size, total_price, status")
      .eq("status", "pending" as never)
      .order("created_at", { ascending: false });
    if (error) return;
    setAvailable(
      (data ?? []).map((b) => ({
        id: b.id,
        bookingId: b.id,
        customerName: "Customer",
        pickupAddress: b.pickup_address,
        dropoffAddress: b.dropoff_address,
        moveSize: sizeLabel(b.move_size as string),
        price: Number(b.total_price),
        status: "available",
      }))
    );
  }, []);

  const loadActiveJob = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("jobs")
      .select("id, booking_id, status, completion_code, bookings:booking_id(pickup_address,dropoff_address,move_size,total_price)")
      .eq("driver_id", user.id)
      .neq("status", "completed")
      .maybeSingle();
    if (!data || !data.bookings) {
      setActiveJob(null);
      return;
    }
    const b: any = data.bookings;
    setActiveJob({
      id: data.id,
      jobId: data.id,
      bookingId: data.booking_id,
      customerName: "Customer",
      pickupAddress: b.pickup_address,
      dropoffAddress: b.dropoff_address,
      moveSize: sizeLabel(b.move_size),
      price: Number(b.total_price),
      status: data.status as JobStatus,
      completionCode: data.completion_code ?? undefined,
    });
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const [{ data: completedRows }, { data: pendingRows }] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, completed_at, bookings:booking_id(total_price)")
        .eq("driver_id", user.id)
        .eq("status", "completed"),
      supabase
        .from("jobs")
        .select("driver_earnings")
        .eq("driver_id", user.id)
        .eq("earnings_status", "pending"),
    ]);
    const rows = completedRows ?? [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    let today = 0;
    let week = 0;
    rows.forEach((r: any) => {
      const price = Number(r.bookings?.total_price ?? 0);
      const dt = r.completed_at ? new Date(r.completed_at) : null;
      if (dt && dt >= startOfDay) today += price;
      if (dt && dt >= startOfWeek) week += price;
    });
    const pending = (pendingRows ?? []).reduce((s: number, r: any) => s + Number(r.driver_earnings ?? 0), 0);
    setStats({ today, week, completed: rows.length, pending });
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAvailable(), loadActiveJob(), loadStats()]).finally(() => setLoading(false));
  }, [loadAvailable, loadActiveJob, loadStats]);

  // Realtime: refresh available jobs when bookings change
  useEffect(() => {
    const channel = supabase
      .channel("driver-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          loadAvailable();
          const newRow: any = payload.new;
          if (payload.eventType === "INSERT" && newRow?.status === "available") {
            toast.success(t("driver.newJob"));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAvailable, t]);

  const handleAcceptJob = async (jobId: string) => {
    if (!user) return;
    if (activeJob) {
      toast.error(t("driver.finishCurrent"));
      return;
    }
    const booking = available.find((j) => j.id === jobId);
    if (!booking) return;
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        booking_id: booking.bookingId,
        driver_id: user.id,
        status: "assigned",
        completion_code: code,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("bookings").update({ status: "assigned" }).eq("id", booking.bookingId);
    toast.success(t("driver.jobAccepted"));
    setActiveJob({ ...booking, jobId: data.id, id: data.id, status: "assigned", completionCode: code });
    loadAvailable();
  };

  const handleUpdateJobStatus = async (nextStatus: JobStatus) => {
    if (!activeJob?.jobId) return;
    const patch: { status: JobStatus; started_at?: string; completed_at?: string } = { status: nextStatus };
    if (nextStatus === "in_transit") patch.started_at = new Date().toISOString();
    if (nextStatus === "completed") patch.completed_at = new Date().toISOString();

    const { error } = await supabase.from("jobs").update(patch).eq("id", activeJob.jobId);
    if (error) return toast.error(error.message);

    // mirror booking status
    const bookingStatus = nextStatus === "completed" ? "completed" : "in_progress";
    await supabase.from("bookings").update({ status: bookingStatus }).eq("id", activeJob.bookingId);

    setActiveJob({ ...activeJob, status: nextStatus });

    if (nextStatus === "completed") {
      // Release escrowed funds: 80% to driver, 20% platform fee
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          await supabase.functions.invoke("release-earnings", {
            headers: { Authorization: `Bearer ${token}` },
            body: { jobId: activeJob.jobId },
          });
        }
      } catch (e) {
        console.warn("release-earnings failed", e);
      }
      toast.success(t("driver.jobCompletedToast"));
      setTimeout(() => {
        setActiveJob(null);
        loadAvailable();
        loadStats();
      }, 1800);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col dark">
      <DriverHeader isOnline={isOnline} onToggleOnline={toggleOnline} rating={5.0} driverName={driverName} />

      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-2 space-y-5">
        {activeTab === "home" && (
          <>
            <DriverStats
              todayEarnings={stats.today}
              weekEarnings={stats.week}
              completedJobs={stats.completed}
              rating={5.0}
              pendingEarnings={stats.pending}
            />

            {!isOnline && (
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-muted-foreground text-sm font-medium">{t("driver.offlineTitle")}</p>
                <p className="text-muted-foreground text-xs mt-1">{t("driver.offlineSubtitle")}</p>
              </div>
            )}

            {isOnline && (
              <DriverJobsTabs
                loading={loading}
                available={available}
                activeJob={activeJob}
                onAccept={handleAcceptJob}
                onUpdateStatus={handleUpdateJobStatus}
              />
            )}
          </>
        )}

        {activeTab === "wallet" && <WalletScreen />}
        {activeTab === "history" && <HistoryScreen onRebook={() => setActiveTab("search")} />}
        {activeTab === "profile" && <ProfileScreen />}
      </main>

      <ActiveJobSheet job={activeJob} onUpdateStatus={handleUpdateJobStatus} />

      {/* Floating notification button */}
      <div className="fixed right-4 bottom-24 z-40">
        <div className="rounded-full shadow-lg shadow-black/30">
          <NotificationBell />
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default DriverDashboard;
