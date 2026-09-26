import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Phone, MessageSquare, Navigation, CheckCircle2, Truck, XCircle } from "lucide-react";
import type { Job, JobStatus } from "@/pages/DriverDashboard";
import { useI18n } from "@/contexts/I18nContext";
import JobChatSheet from "@/components/shared/JobChatSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBookingLocationBroadcast } from "@/hooks/useBookingLocationBroadcast";
import LiveTripMap from "@/components/tracking/LiveTripMap";

const openNavigation = (address: string, lat?: number | null, lng?: number | null) => {
  const dest = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(address);
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving&dir_action=navigate`, "_blank", "noopener");
};

interface ActiveJobSheetProps {
  job: Job | null;
  onUpdateStatus: (status: JobStatus, coords?: { lat: number; lng: number }) => unknown;
  onCancelJob?: () => Promise<void> | void;
}


const statusFlow: { status: JobStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: "arrived", label: "driver.arrivedPickup", icon: <MapPin className="w-4 h-4" />, color: "bg-[hsl(var(--swift-info))]" },
  { status: "in_transit", label: "driver.startTrip", icon: <Truck className="w-4 h-4" />, color: "bg-primary" },
  { status: "completed", label: "driver.completeTrip", icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-[hsl(var(--swift-success))]" },
];

export const ActiveJobSheet = ({ job, onUpdateStatus, onCancelJob }: ActiveJobSheetProps) => {
  const { t, formatCurrency } = useI18n();
  const [distToDropM, setDistToDropM] = useState<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const completingRef = useRef(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);


  const threadJobId = job?.jobId ?? job?.id ?? null;
  const bookingId = job?.bookingId ?? null;
  const dLat = job?.dropoffLat ?? null;
  const dLng = job?.dropoffLng ?? null;
  const jobStatus = job?.status;
  const onPosition = useCallback(
    (lat: number, lng: number) => {
      lastPosRef.current = { lat, lng };
      if (dLat == null || dLng == null) return;
      const R = 6371000, r = (v: number) => (v * Math.PI) / 180;
      const a = Math.sin(r(dLat - lat) / 2) ** 2 + Math.cos(r(lat)) * Math.cos(r(dLat)) * Math.sin(r(dLng - lng) / 2) ** 2;
      const m = 2 * R * Math.asin(Math.sqrt(a));
      setDistToDropM(m);
      if (m <= 20 && jobStatus === "in_transit" && !completingRef.current) {
        completingRef.current = true;
        Promise.resolve(onUpdateStatus("completed", { lat, lng })).finally(() => {
          setTimeout(() => { completingRef.current = false; }, 10_000);
        });
      }
    },
    [dLat, dLng, jobStatus, onUpdateStatus],
  );
  const gpsState = useBookingLocationBroadcast(bookingId, Boolean(job) && job?.status !== "completed", onPosition);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    (async () => {
      const { data: booking } = await supabase
        .from("bookings")
        .select("customer_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (!booking?.customer_id) return;
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("phone")
        .eq("user_id", booking.customer_id)
        .maybeSingle();
      if (active) setCustomerPhone((profile as { phone: string | null } | null)?.phone ?? null);
    })();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const navStatus = job?.status;
  const navKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job || (navStatus !== "assigned" && navStatus !== "arrived")) return;
    const key = `${job.jobId}:${navStatus}`;
    if (navKeyRef.current === key) return;
    navKeyRef.current = key;
    const t = setTimeout(() => {
      if (navStatus === "assigned") openNavigation(job.pickupAddress, job.pickupLat, job.pickupLng);
      else openNavigation(job.dropoffAddress, job.dropoffLat, job.dropoffLng);
    }, 800);
    return () => clearTimeout(t);
  }, [job?.jobId, navStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!job) return null;

  const currentStepIdx = statusFlow.findIndex((s) => s.status === job.status);
  const nextStep = statusFlow.find((_, i) => i > currentStepIdx) ?? statusFlow[statusFlow.length - 1];
  const isCompleteStep = nextStep.status === "completed";

  const handleNext = () => {
    if (isCompleteStep) {
      if (!lastPosRef.current) {
        toast.error(t("drv.geofence.notYet"));
        return;
      }
      onUpdateStatus("completed", lastPosRef.current);
      return;
    }
    onUpdateStatus(nextStep.status);
  };

  if (job.status === "completed") {
    return (
      <Sheet open>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader className="text-center pt-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <SheetTitle className="text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t("driver.jobCompleted")}</SheetTitle>
            <p className="text-sm text-muted-foreground">{t("driver.earningsWallet")}</p>
            <p className="text-2xl font-bold text-primary mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(job.price)}</p>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto pb-8">
        <SheetHeader className="pb-3">
          <p className={`text-xs ${gpsState === "active" ? "text-[hsl(var(--swift-success))]" : gpsState === "denied" || gpsState === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {gpsState === "active"
              ? "● Sharing live location with customer"
              : gpsState === "denied"
                ? "Location permission denied — enable it in Settings so the customer can track you"
                : gpsState === "error"
                  ? "Couldn't read GPS — retrying"
                  : "Waiting for GPS…"}
          </p>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("driver.activeJob")} · {job.id}
            </SheetTitle>
            <span className="text-lg font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatCurrency(job.price)}
            </span>
          </div>
        </SheetHeader>

        {/* Live navigation map: to pick-up until arrived, then to drop-off */}
        {bookingId && (
          <div className="relative mb-3 h-56 overflow-hidden rounded-xl">
            <LiveTripMap
              bookingId={bookingId}
              target={
                job.status === "assigned"
                  ? job.pickupLat != null && job.pickupLng != null ? { lat: job.pickupLat, lng: job.pickupLng } : null
                  : job.dropoffLat != null && job.dropoffLng != null ? { lat: job.dropoffLat, lng: job.dropoffLng } : null
              }
            />
            <button
              type="button"
              onClick={() => job.status === "assigned"
                ? openNavigation(job.pickupAddress, job.pickupLat, job.pickupLng)
                : openNavigation(job.dropoffAddress, job.dropoffLat, job.dropoffLng)}
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg"
            >
              <Navigation className="h-3.5 w-3.5" />
              {job.status === "assigned" ? "Navigate to pick-up" : "Navigate to drop-off"}
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {statusFlow.map((step, i) => (
            <div
              key={step.status}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i <= currentStepIdx ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Customer + Route */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{job.customerName}</p>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label={t("drv.activeJob.callCustomer")}
                onClick={() => {
                  if (!customerPhone) {
                    toast.error(t("drv.activeJob.phoneUnavailable"));
                    return;
                  }
                  window.location.href = `tel:${customerPhone}`;
                }}
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Phone className="w-4 h-4 text-primary" />
              </button>
              <button
                type="button"
                aria-label={t("drv.activeJob.messageCustomer")}
                onClick={() => {
                  if (!threadJobId) {
                    toast.error(t("drv.activeJob.chatUnavailable"));
                    return;
                  }
                  setChatOpen(true);
                }}
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <MessageSquare className="w-4 h-4 text-primary" />
              </button>
              <button
                type="button"
                aria-label={t("drv.activeJob.navigate")}
                onClick={() => {
                  if (job.status === "assigned") openNavigation(job.pickupAddress, job.pickupLat, job.pickupLng);
                  else openNavigation(job.dropoffAddress, job.dropoffLat, job.dropoffLng);
                }}
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Navigation className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-secondary p-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
              <p>{job.pickupAddress}</p>
            </div>
            <div className="ml-[3px] w-[2px] h-2 bg-border" />
            <div className="flex items-start gap-2">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-[hsl(var(--swift-danger))] shrink-0" />
              <p>{job.dropoffAddress}</p>
            </div>
          </div>
        </div>

        {isCompleteStep && (
          <div className="mb-4 rounded-xl bg-secondary p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("drv.geofence.hint")}</p>
            {distToDropM != null && (
              <p className="text-lg font-bold text-primary mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t("drv.geofence.distance", { m: Math.round(distToDropM) })}
              </p>
            )}
          </div>
        )}

        {/* Next Action */}
        <Button
          onClick={handleNext}
          className={`w-full rounded-xl h-12 font-semibold gap-2 text-white ${nextStep.color} hover:opacity-90`}
        >
          {nextStep.icon}
          {t(nextStep.label)}
        </Button>

        {onCancelJob && (
          <Button
            variant="ghost"
            onClick={() => setCancelOpen(true)}
            className="w-full mt-2 rounded-xl h-11 font-medium gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <XCircle className="w-4 h-4" />
            {t("drv.activeJob.cancelJob") || "Cancel job"}
          </Button>
        )}

        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("drv.activeJob.cancelJobTitle") || "Cancel this job?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("drv.activeJob.cancelJobWarning") ||
                  "You will forfeit all earnings for this move and the customer will be fully refunded. This cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelling}>{t("common.cancel") || "Keep job"}</AlertDialogCancel>
              <AlertDialogAction
                disabled={cancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async (e) => {
                  e.preventDefault();
                  setCancelling(true);
                  try {
                    await onCancelJob?.();
                    setCancelOpen(false);
                  } finally {
                    setCancelling(false);
                  }
                }}
              >
                {cancelling ? "…" : t("drv.activeJob.cancelJobConfirm") || "Yes, cancel job"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



        {threadJobId && (
          <JobChatSheet
            jobId={threadJobId}
            open={chatOpen}
            onOpenChange={setChatOpen}
            title={t("drv.activeJob.chatWith", { name: job.customerName })}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
