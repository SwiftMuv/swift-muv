import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, MessageCircle, Star, Clock, Shield, MapPin, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DriverTrackingMap from "@/components/tracking/DriverTrackingMap";
import { StatusTimeline } from "@/components/tracking/StatusTimeline";
import { useDriverStatusUpdates } from "@/hooks/useDriverStatusUpdates";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haversineKm, type LatLngLiteral } from "@/lib/mapCore";

const ACTIVE_STATUSES = ["pending", "assigned", "in_progress"];

interface ActiveBooking {
  id: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  total_price: number | null;
  move_size: string | null;
}

interface DriverSnapshot {
  full_name: string | null;
  avatar_url: string | null;
  profile_picture_url: string | null;
  license_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  rating: number | null;
  phone: string | null;
  current_lat: number | null;
  current_lng: number | null;
}

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const { t, formatCurrency } = useI18n();
  const { user } = useAuth();

  const [booking, setBooking] = useState<ActiveBooking | null>(null);
  const [driver, setDriver] = useState<DriverSnapshot | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { currentStatus, statusHistory, latestUpdate } = useDriverStatusUpdates();
  const prevStatusRef = useRef(currentStatus);

  const handleEtaUpdate = useCallback((minutes: number) => {
    setEta(Math.max(minutes, 2));
  }, []);

  // Load the customer's latest active booking + assigned driver's live location.
  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, total_price, move_size")
        .eq("customer_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1);
      const b = (bookings?.[0] as unknown as ActiveBooking) ?? null;
      if (!active) return;
      setBooking(b);
      if (!b) {
        setDriver(null);
        return;
      }
      const { data: job } = await supabase
        .from("jobs")
        .select("driver_id")
        .eq("booking_id", b.id)
        .maybeSingle();
      if (!job?.driver_id) {
        if (active) setDriver(null);
        return;
      }
      const { data: profile } = await supabase
        .from("driver_profiles")
        .select("full_name, avatar_url, profile_picture_url, license_plate, vehicle_make, vehicle_model, rating, phone, current_lat, current_lng")
        .eq("user_id", job.driver_id)
        .maybeSingle();
      if (active) setDriver((profile as unknown as DriverSnapshot) ?? null);
    };

    load();
    const poll = setInterval(load, 10000);
    const channel = supabase
      .channel("booking-confirmation-tracking")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => load())
      .subscribe();
    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fire toast notifications on status changes
  useEffect(() => {
    if (latestUpdate && latestUpdate.status !== prevStatusRef.current) {
      prevStatusRef.current = latestUpdate.status;
      const icons: Record<string, string> = { assigned: "✅", en_route: "🚛", arrived: "📍", completed: "🎉" };
      toast(latestUpdate.label, {
        description: latestUpdate.description,
        icon: icons[latestUpdate.status],
        duration: 5000,
      });
    }
  }, [latestUpdate]);

  const pickupPos: LatLngLiteral | null =
    booking?.pickup_lat != null && booking?.pickup_lng != null
      ? { lat: booking.pickup_lat, lng: booking.pickup_lng }
      : null;
  const dropoffPos: LatLngLiteral | null =
    booking?.dropoff_lat != null && booking?.dropoff_lng != null
      ? { lat: booking.dropoff_lat, lng: booking.dropoff_lng }
      : null;
  const driverPos: LatLngLiteral | null =
    driver?.current_lat != null && driver?.current_lng != null
      ? { lat: driver.current_lat, lng: driver.current_lng }
      : null;

  // Haversine fallback ETA until the directions service reports a real one.
  const fallbackEta =
    driverPos && pickupPos ? Math.max(2, Math.round((haversineKm(driverPos, pickupPos) / 30) * 60)) : null;
  const displayEta = eta ?? fallbackEta;

  const hasMapPoints = Boolean(driverPos || pickupPos || dropoffPos);
  const driverName = driver?.full_name ?? null;
  const driverPhoto = driver?.profile_picture_url || driver?.avatar_url || null;
  const vehicleLabel = [driver?.vehicle_make, driver?.vehicle_model].filter(Boolean).join(" ") || null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Map area */}
      <div className="relative h-[55vh] w-full">
        {hasMapPoints ? (
          <DriverTrackingMap
            driverLocation={driverPos}
            pickupLocation={pickupPos}
            dropoffLocation={dropoffPos}
            onEtaUpdate={handleEtaUpdate}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-black px-6 text-center text-xs text-white/50">
            {t("cust.trip.waitingLocation")}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => navigate("/")}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 shadow-md backdrop-blur-sm"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Bottom sheet */}
      <div className="relative -mt-4 flex flex-1 flex-col rounded-t-3xl bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Handle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center py-3"
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </button>

        <div className="flex-1 space-y-5 px-5 pb-8">
          {/* ETA Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("bk.confirmation.estimatedArrival")}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {displayEta != null ? `${displayEta} min` : "—"}
                </span>
                <span className="text-sm text-muted-foreground">{t("bk.confirmation.eta")}</span>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
              currentStatus === "completed"
                ? "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]"
                : currentStatus === "arrived"
                ? "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]"
                : "bg-primary/10 text-primary"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">
                {currentStatus === "assigned" && t("bk.confirmation.status.assigned")}
                {currentStatus === "en_route" && t("bk.confirmation.status.enRoute")}
                {currentStatus === "arrived" && t("bk.confirmation.status.arrived")}
                {currentStatus === "completed" && t("bk.confirmation.status.completed")}
              </span>
            </div>
          </div>

          {/* Driver card */}
          {driver && (
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="relative">
                {driverPhoto ? (
                  <img
                    src={driverPhoto}
                    alt={driverName ? `Driver ${driverName}` : "Driver"}
                    loading="lazy"
                    className="h-14 w-14 rounded-full object-cover border-2 border-primary/40"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-lg font-bold text-primary">
                    {(driverName ?? "D").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Shield className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{driverName ?? t("cust.trip.yourDriver")}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span>{driver.rating ?? 5}</span>
                  {vehicleLabel && (
                    <>
                      <span>·</span>
                      <span>{vehicleLabel}</span>
                    </>
                  )}
                </div>
                {driver.license_plate && (
                  <p className="text-xs font-mono text-foreground/80">{driver.license_plate}</p>
                )}
              </div>
              {driver.phone && (
                <div className="flex gap-2">
                  <a
                    href={`tel:${driver.phone}`}
                    aria-label={t("bk.confirmation.callDriver")}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                  <a
                    href={`sms:${driver.phone}`}
                    aria-label={t("bk.confirmation.textDriver")}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Status Timeline */}
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm font-semibold text-foreground mb-3">{t("bk.confirmation.liveStatus")}</p>
            <StatusTimeline statusHistory={statusHistory} currentStatus={currentStatus} />
          </div>

          {/* Trip details (expandable) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-sm"
          >
            <span className="font-semibold text-foreground">{t("bk.confirmation.tripDetails")}</span>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("bk.confirmation.pickup")}</p>
                  <p className="font-medium text-foreground">{booking?.pickup_address ?? "—"}</p>
                </div>
              </div>
              <div className="ml-3 border-l-2 border-dashed border-border h-3" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("bk.confirmation.dropoff")}</p>
                  <p className="font-medium text-foreground">{booking?.dropoff_address ?? "—"}</p>
                </div>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bk.confirmation.moveLabel", { size: booking?.move_size ?? "—" })}</span>
                <span className="font-semibold text-foreground">{formatCurrency(Number(booking?.total_price) || 0)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>{t("bk.confirmation.insuredNote")}</span>
              </div>
            </div>
          )}

          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="h-12 w-full rounded-xl text-sm font-semibold"
          >
            {t("bk.confirmation.cancelBooking")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
