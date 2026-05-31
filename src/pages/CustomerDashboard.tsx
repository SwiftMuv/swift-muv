import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCw, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BookNewMoveForm from "@/components/customer/BookNewMoveForm";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import CustomerHomeScreen from "@/components/customer/CustomerHomeScreen";
import CustomerAccountScreen from "@/components/customer/CustomerAccountScreen";
import RatingModal from "@/components/customer/RatingModal";
import DriverReviewsForBooking from "@/components/customer/DriverReviewsForBooking";
import NotificationBell from "@/components/NotificationBell";
import { LangCurrencyMenu } from "@/components/LangCurrencyMenu";
import { useI18n } from "@/contexts/I18nContext";
import logo from "@/assets/swiftmuv-logo.png";

interface Booking {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  total_price: number;
  status: string;
  created_at: string;
}

const ACTIVE_STATUSES = ["pending", "assigned", "in_progress"];

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { t, formatCurrency, formatDate } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [rating, setRating] = useState<{ jobId: string; driverId: string } | null>(null);
  const ratedRef = useRef<Set<string>>(new Set());

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("id, pickup_address, dropoff_address, total_price, status, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setBookings(data as Booking[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Handle Stripe checkout success redirect — the booking row is created
  // asynchronously by the stripe-webhook edge function.
  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    toast.success(t("customer.paymentConfirmed"));
    setActiveTab("activities");
    // Poll briefly while the webhook inserts the row.
    let attempts = 0;
    const id = setInterval(async () => {
      attempts += 1;
      await loadBookings();
      if (attempts >= 6) clearInterval(id);
    }, 1500);
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    next.delete("booking");
    setSearchParams(next, { replace: true });
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open rating modal when a booking transitions to completed
  useEffect(() => {
    if (!user) return;
    const completed = bookings.filter((b) => b.status === "completed");
    if (completed.length === 0) return;
    const latest = completed[0];
    if (ratedRef.current.has(latest.id)) return;
    (async () => {
      // Already rated?
      const { data: job } = await supabase
        .from("jobs")
        .select("id, driver_id")
        .eq("booking_id", latest.id)
        .maybeSingle();
      if (!job) return;
      const { data: existing } = await supabase
        .from("ratings")
        .select("id")
        .eq("job_id", job.id)
        .eq("rater_id", user.id)
        .maybeSingle();
      ratedRef.current.add(latest.id);
      if (!existing) setRating({ jobId: job.id, driverId: job.driver_id });
    })();
  }, [bookings, user]);

  // Realtime: refresh on booking status change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("customer-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `customer_id=eq.${user.id}` }, () => {
        loadBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadBookings]);

  const handleCancelRequest = (b: Booking) => {
    setCancelDialog({ open: true, booking: b });
  };

  const handleConfirmCancel = async () => {
    const b = cancelDialog.booking;
    if (!b) return;
    setCancelDialog({ open: false, booking: null });
    setCancelling(b.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("cancel-booking", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: { bookingId: b.id },
      });
      if (error) throw error;
      toast.success((data as any)?.fee ? t("customer.cancelledFee", { fee: formatCurrency(Number((data as any).fee)) }) : t("customer.bookingCancelled"));
      loadBookings();
    } catch (e: any) {
      toast.error(e.message ?? "Cancel failed");
    } finally {
      setCancelling(null);
    }
  };

  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const completed = bookings.filter((b) => b.status === "completed");

  const titles: Record<string, string> = {
    home: t("dashboard.customer.title.home"),
    bookings: t("dashboard.customer.title.bookings"),
    activities: t("dashboard.customer.title.activities"),
    account: t("dashboard.customer.title.account"),
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-primary/30 bg-card shrink-0">
            <img src={logo} alt="SwiftMuv" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col items-center gap-1 min-w-0">
            <LangCurrencyMenu />
            <h1 className="text-lg font-bold text-foreground truncate">{titles[activeTab]}</h1>
          </div>
          <div className="shrink-0">
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {activeTab === "home" && <CustomerHomeScreen />}

        {activeTab === "bookings" && (
          <div className="space-y-4 pb-4">
            <BookNewMoveForm onBooked={loadBookings} />
          </div>
        )}

        {activeTab === "activities" && (
          <div className="space-y-3 pb-4">
            {loading && <p className="text-muted-foreground text-sm">{t("common.loading")}</p>}
            {!loading && bookings.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  {t("common.noBookings")}
                </CardContent>
              </Card>
            )}
            {bookings.map((b) => {
              const isActive = ACTIVE_STATUSES.includes(b.status);
              const isCompleted = b.status === "completed";
              const canCancel = isActive && b.status !== "in_progress";
              const fee = b.status === "pending" ? 0 : 10;
              return (
                <Card key={b.id} className={isActive ? "border-primary/40" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">{formatCurrency(Number(b.total_price))}</CardTitle>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {t(`status.${b.status}`)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{t("common.from")}</span> {b.pickup_address}</p>
                    <p><span className="text-muted-foreground">{t("common.to")}</span> {b.dropoff_address}</p>
                    {isActive && b.status !== "pending" && <DriverReviewsForBooking bookingId={b.id} />}
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={cancelling === b.id}
                        onClick={() => handleCancelRequest(b)}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        {cancelling === b.id ? t("common.cancelling") : fee > 0 ? `${t("common.cancel")} (${formatCurrency(fee)} fee)` : t("common.cancel")}
                      </Button>
                    )}
                    {isActive && b.status === "in_progress" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {t("customer.cancelProgress")}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(b.created_at)}
                      </p>
                      {isCompleted && (
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("bookings")}
                          className="bg-primary/15 text-primary hover:bg-primary/25"
                        >
                          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                          {t("common.rebook")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === "account" && <CustomerAccountScreen />}
      </main>

      <CustomerBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <RatingModal
        open={!!rating}
        jobId={rating?.jobId ?? null}
        driverId={rating?.driverId ?? null}
        onClose={() => setRating(null)}
      />

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, booking: open ? cancelDialog.booking : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customer.cancelBookingTitle")}</DialogTitle>
            <DialogDescription>
              {cancelDialog.booking && cancelDialog.booking.status !== "pending" ? (
                <>
                  {t("customer.cancelWithFee", { fee: "" })}{" "}
                  <strong>{formatCurrency(10)}</strong>
                </>
              ) : (
                t("customer.cancelNoFee")
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, booking: null })}>
              {t("customer.keepBooking")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelling === cancelDialog.booking?.id}>
              {cancelling === cancelDialog.booking?.id ? t("common.cancelling") : t("customer.confirmCancellation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
