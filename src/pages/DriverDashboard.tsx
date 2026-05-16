import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  MapPin, DollarSign, Clock, LogOut, CheckCircle2, Truck,
  Package, ArrowRight, Star
} from "lucide-react";

type Booking = {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  total_price: number;
  move_size: string;
  status: string;
  created_at: string;
};

type JobRow = {
  id: string;
  booking_id: string;
  status: "assigned" | "en_route" | "arrived" | "loading" | "in_transit" | "completed";
  completed_at: string | null;
  created_at: string;
  bookings: Booking | null;
};

type DriverProfile = {
  id: string;
  full_name: string | null;
  profile_picture_url: string | null;
  avatar_url: string | null;
  is_online: boolean;
  rating: number | null;
};

const DriverDashboard = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [available, setAvailable] = useState<Booking[]>([]);
  const [activeJob, setActiveJob] = useState<JobRow | null>(null);
  const [history, setHistory] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("driver_profiles")
      .select("id, full_name, profile_picture_url, avatar_url, is_online, rating")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setProfile(data as DriverProfile);
  }, [user]);

  const loadJobs = useCallback(async () => {
    if (!user) return;
    const { data: mine } = await supabase
      .from("jobs")
      .select("id, booking_id, status, completed_at, created_at, bookings(*)")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });

    const myJobs = (mine ?? []) as unknown as JobRow[];
    const current = myJobs.find((j) => j.status !== "completed") ?? null;
    setActiveJob(current);
    setHistory(myJobs.filter((j) => j.status === "completed"));
  }, [user]);

  const loadAvailable = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setAvailable((data ?? []) as Booking[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadProfile(), loadJobs(), loadAvailable()]);
      setLoading(false);
    })();
  }, [loadProfile, loadJobs, loadAvailable]);

  // realtime on bookings + jobs
  useEffect(() => {
    const ch = supabase
      .channel("driver-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadAvailable())
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => loadJobs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAvailable, loadJobs]);

  const toggleOnline = async (next: boolean) => {
    if (!profile || !user) return;
    setProfile({ ...profile, is_online: next });
    const { error } = await supabase
      .from("driver_profiles")
      .update({ is_online: next })
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      setProfile({ ...profile, is_online: !next });
    } else {
      toast.success(next ? "You're online" : "You're offline");
    }
  };

  const acceptJob = async (booking: Booking) => {
    if (!user) return;
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { error: jErr } = await supabase
      .from("jobs")
      .insert({ booking_id: booking.id, driver_id: user.id, status: "assigned", completion_code: code });
    if (jErr) { toast.error(jErr.message); return; }
    await supabase.from("bookings").update({ status: "assigned" }).eq("id", booking.id);
    toast.success("Job accepted");
    await Promise.all([loadJobs(), loadAvailable()]);
  };

  const advanceJob = async (next: JobRow["status"]) => {
    if (!activeJob) return;
    const patch: { status: JobRow["status"]; started_at?: string; completed_at?: string } = { status: next };
    if (next === "in_transit") patch.started_at = new Date().toISOString();
    if (next === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("jobs").update(patch).eq("id", activeJob.id);
    if (error) { toast.error(error.message); return; }

    if (next === "completed" && activeJob.booking_id) {
      await supabase.from("bookings").update({ status: "completed" }).eq("id", activeJob.booking_id);
      toast.success("Trip completed!");
    } else if (next === "in_transit" && activeJob.booking_id) {
      await supabase.from("bookings").update({ status: "in_progress" }).eq("id", activeJob.booking_id);
    }
    await loadJobs();
  };

  const totalEarned = history.reduce((s, j) => s + Number(j.bookings?.total_price ?? 0), 0);
  const completedCount = history.length;
  const initials = (profile?.full_name ?? user?.email ?? "D")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const avatarSrc = profile?.profile_picture_url ?? profile?.avatar_url ?? undefined;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-14 w-14 ring-2 ring-primary/30">
              <AvatarImage src={avatarSrc} alt={profile?.full_name ?? ""} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1
                className="text-xl font-bold truncate"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {profile?.full_name ?? "Driver"}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {profile?.rating ?? 5.0} · Driver
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Online toggle */}
        <div className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-3 border ${
          profile?.is_online ? "bg-primary/10 border-primary/40" : "bg-muted border-border"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${profile?.is_online ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-sm font-semibold">
              {profile?.is_online ? "You're Online" : "You're Offline"}
            </span>
          </div>
          <Switch checked={!!profile?.is_online} onCheckedChange={toggleOnline} />
        </div>
      </header>

      <main className="px-4 py-4 pb-10 space-y-5 max-w-2xl mx-auto">
        {/* Total Earnings tile */}
        <Card className="p-5 bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p>
              <p className="text-3xl font-bold text-primary mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ${totalEarned.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Trips</p>
              <p className="text-3xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {completedCount}
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jobs">Available Jobs</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4 space-y-3">
            {!profile?.is_online && (
              <Card className="p-5 text-center bg-muted/40">
                <p className="text-sm font-medium">You're offline</p>
                <p className="text-xs text-muted-foreground mt-1">Go online to see available jobs</p>
              </Card>
            )}

            {profile?.is_online && available.length === 0 && (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No pending jobs right now</p>
                <p className="text-xs text-muted-foreground mt-1">New requests will appear instantly</p>
              </Card>
            )}

            {profile?.is_online && available.map((b) => (
              <Card key={b.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize">{b.move_size}</Badge>
                  <p className="text-xl font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    ${Number(b.total_price).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <p className="leading-snug">{b.pickup_address}</p>
                  </div>
                  <div className="ml-[3px] h-3 w-[2px] bg-border" />
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="leading-snug">{b.dropoff_address}</p>
                  </div>
                </div>
                <Button onClick={() => acceptJob(b)} className="w-full h-11 rounded-xl font-semibold gap-2" disabled={!!activeJob}>
                  {activeJob ? "Finish current trip first" : <>Accept Job <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {history.length === 0 && (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No completed trips yet</p>
              </Card>
            )}
            {history.map((j) => (
              <Card key={j.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {j.completed_at ? new Date(j.completed_at).toLocaleString() : "—"}
                  </span>
                  <span className="text-sm font-bold text-primary flex items-center">
                    <DollarSign className="w-3.5 h-3.5" />
                    {Number(j.bookings?.total_price ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="truncate">↑ {j.bookings?.pickup_address}</p>
                  <p className="truncate">↓ {j.bookings?.dropoff_address}</p>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      {/* Active job sheet */}
      <ActiveTripSheet job={activeJob} onAdvance={advanceJob} />
    </div>
  );
};

const flow: { from: JobRow["status"]; next: JobRow["status"]; label: string; icon: React.ReactNode }[] = [
  { from: "assigned", next: "arrived", label: "Arrived at Pickup", icon: <MapPin className="w-4 h-4" /> },
  { from: "arrived", next: "in_transit", label: "Start Trip (In Transit)", icon: <Truck className="w-4 h-4" /> },
  { from: "in_transit", next: "completed", label: "Complete Trip", icon: <CheckCircle2 className="w-4 h-4" /> },
];

const ActiveTripSheet = ({ job, onAdvance }: { job: JobRow | null; onAdvance: (s: JobRow["status"]) => void }) => {
  if (!job) return null;
  const step = flow.find((s) => s.from === job.status) ?? flow[flow.length - 1];
  const stepIdx = flow.findIndex((s) => s.from === job.status);

  return (
    <Sheet open>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[75vh] overflow-y-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center justify-between text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>Active Trip</span>
            <span className="text-primary">${Number(job.bookings?.total_price ?? 0).toFixed(2)}</span>
          </SheetTitle>
        </SheetHeader>

        {/* progress */}
        <div className="flex gap-1 mb-4">
          {flow.map((s, i) => (
            <div key={s.next} className={`flex-1 h-1.5 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="rounded-xl bg-secondary p-3 space-y-2 text-sm mb-4">
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
            <p>{job.bookings?.pickup_address}</p>
          </div>
          <div className="ml-[3px] h-2 w-[2px] bg-border" />
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p>{job.bookings?.dropoff_address}</p>
          </div>
        </div>

        <Button onClick={() => onAdvance(step.next)} className="w-full h-12 rounded-xl font-semibold gap-2">
          {step.icon}
          {step.label}
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default DriverDashboard;
