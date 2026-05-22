import { useCallback, useEffect, useRef, useState } from "react";
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
      toast.success((data as any)?.fee ? `Cancelled. $${(data as any).fee} CAD fee applied.` : "Booking cancelled");
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
    home: "SwiftMuv",
    bookings: "Book a Move",
    activities: "Activities",
    account: "Account",
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">{titles[activeTab]}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {activeTab === "home" && <CustomerHomeScreen />}

        {activeTab === "bookings" && (
          <div className="space-y-4 pb-4">
            <BookNewMoveForm onBooked={loadBookings} />
            {active.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending & active</h3>
                {active.map((b) => {
                  const canCancel = b.status !== "in_progress";
                  const fee = b.status === "pending" ? 0 : 10;
                  return (
                    <Card key={b.id} className="border-primary/40">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base">Active move · ${Number(b.total_price).toFixed(2)}</CardTitle>
                        <Badge>{b.status.replace("_", " ")}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">From:</span> {b.pickup_address}</p>
                        <p><span className="text-muted-foreground">To:</span> {b.dropoff_address}</p>
                        {canCancel ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            disabled={cancelling === b.id}
                            onClick={() => handleCancelRequest(b)}
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            {cancelling === b.id ? "Cancelling…" : fee > 0 ? `Cancel ($${fee} CAD fee)` : "Cancel"}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Move in progress — cancellation no longer available.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "activities" && (
          <div className="space-y-3 pb-4">
            {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
            {!loading && completed.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No completed trips yet.
                </CardContent>
              </Card>
            )}
            {completed.map((b) => (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">${Number(b.total_price).toFixed(2)}</CardTitle>
                  <Badge variant="secondary">{b.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">From:</span> {b.pickup_address}</p>
                  <p><span className="text-muted-foreground">To:</span> {b.dropoff_address}</p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("bookings")}
                      className="bg-primary/15 text-primary hover:bg-primary/25"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                      Rebook
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              {cancelDialog.booking && cancelDialog.booking.status !== "pending" ? (
                <>
                  A driver has already accepted this job. Cancelling now will charge a{" "}
                  <strong>$10 CAD</strong> fee.
                </>
              ) : (
                "Are you sure you want to cancel this booking? No fee will apply."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, booking: null })}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelling === cancelDialog.booking?.id}>
              {cancelling === cancelDialog.booking?.id ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
