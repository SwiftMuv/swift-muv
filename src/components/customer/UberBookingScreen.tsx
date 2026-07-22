/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Navigation,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { PlacesAutocomplete } from "@/components/booking/PlacesAutocomplete";
import StripeCheckoutModal from "@/components/booking/StripeCheckoutModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  calculateMovePrice,
  CREW_MEMBER_RATE_CAD,
  VEHICLE_FLEET,
  type MoveType,
  type SelectedItem,
  type VehicleSelection,
} from "@/lib/movingEngine";
import SuvImg from "@/assets/vehicles/suv.png";
import CargoVanImg from "@/assets/vehicles/cargo-van.png";
import PickupImg from "@/assets/vehicles/pickup.png";
import BoxTruckImg from "@/assets/vehicles/box-truck.png";
import MovingTruckImg from "@/assets/vehicles/moving-truck.png";

interface DistanceResult {
  km: number;
  pickup?: { lat: number; lng: number; province?: string; city?: string };
  dropoff?: { lat: number; lng: number; province?: string; city?: string };
  moveType?: MoveType;
  error?: string;
  details?: string;
  fallback?: boolean;
}

interface VehicleTile {
  name: string;
  capacity: string;
  image: string;
  isSuv?: boolean;
}

const VEHICLE_TILES: VehicleTile[] = [
  { name: "Extra Large Car / SUV", capacity: "Bags · flat", image: SuvImg, isSuv: true },
  { name: "Cargo Van", capacity: "120 ft³ · 2,000 lb", image: CargoVanImg },
  { name: "Pickup / 12ft", capacity: "400 ft³ · 3,000 lb", image: PickupImg },
  { name: "16ft Truck", capacity: "800 ft³ · 4,500 lb", image: BoxTruckImg },
  { name: "26ft Truck", capacity: "1,400 ft³ · 10,000 lb", image: MovingTruckImg },
];

const moveSizeFromVehicleName = (name: string): "small" | "medium" | "large" | "xlarge" => {
  if (name.startsWith("Cargo")) return "small";
  if (name.startsWith("12ft") || name.startsWith("Pickup")) return "medium";
  if (name.startsWith("16ft")) return "large";
  return "xlarge";
};

const priceForTile = (tile: VehicleTile, distanceKm: number, moveType: MoveType): number => {
  if (tile.isSuv) {
    const q = calculateMovePrice({ items: [], moveType, distanceKm, vehicleSelection: "suv" });
    return q.finalPrice;
  }
  // Map tile to vehicle (skip SUV at index 0).
  const idx = VEHICLE_TILES.findIndex((t) => t.name === tile.name);
  const vehicle = VEHICLE_FLEET[idx]; // parallel index (SUV=0, then Cargo, 12ft, 16ft, 26ft)
  if (!vehicle) return 0;
  const base = vehicle.baseFee + vehicle.perKmRate * Math.max(0, distanceKm);
  return Math.round(base * 100) / 100;
};

interface Props {
  onBooked?: () => void;
  onClose?: () => void;
}

const UberBookingScreen = ({ onBooked, onClose }: Props) => {
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const { ready: mapsReady } = useGoogleMaps();

  const [step, setStep] = useState<"where" | "schedule">("where");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [selectedTile, setSelectedTile] = useState<VehicleTile>(VEHICLE_TILES[1]);
  const [scheduleMode, setScheduleMode] = useState<"asap" | "later">("asap");
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [crewEnabled, setCrewEnabled] = useState(false);
  const [crewCount, setCrewCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);

  // Map refs
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);

  // Init map
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: 45.5017, lng: -73.5673 },
      zoom: 12,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      styles: [
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
  }, [mapsReady]);

  // Distance calc
  useEffect(() => {
    if (pickup.trim().length < 5 || dropoff.trim().length < 5) {
      setDistance(null);
      setDistanceError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCalculating(true);
      setDistanceError(null);
      try {
        const { data, error } = await supabase.functions.invoke<DistanceResult>(
          "calculate-distance",
          { body: { origin: pickup, destination: dropoff } },
        );
        if (error) throw error;
        if (data?.fallback || data?.error) {
          setDistance(null);
          setDistanceError(data.details ?? "Route could not be resolved. Pick full addresses from the suggestions.");
          return;
        }
        if (data?.km) setDistance(data);
      } catch (e) {
        console.warn("Distance calc failed", e);
        setDistance(null);
        setDistanceError("Route calculation failed.");
      } finally {
        setCalculating(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [pickup, dropoff]);

  // Update markers + fit bounds
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const p = distance?.pickup;
    const d = distance?.dropoff;

    pickupMarkerRef.current?.setMap(null);
    dropoffMarkerRef.current?.setMap(null);
    routeLineRef.current?.setMap(null);
    pickupMarkerRef.current = null;
    dropoffMarkerRef.current = null;
    routeLineRef.current = null;

    if (p) {
      pickupMarkerRef.current = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        label: { text: "A", color: "#fff", fontWeight: "700" },
      });
    }
    if (d) {
      dropoffMarkerRef.current = new google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        label: { text: "B", color: "#fff", fontWeight: "700" },
      });
    }
    if (p && d) {
      routeLineRef.current = new google.maps.Polyline({
        path: [
          { lat: p.lat, lng: p.lng },
          { lat: d.lat, lng: d.lng },
        ],
        strokeColor: "#FF5722",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: p.lat, lng: p.lng });
      bounds.extend({ lat: d.lat, lng: d.lng });
      map.fitBounds(bounds, 80);
    } else if (p) {
      map.setCenter({ lat: p.lat, lng: p.lng });
      map.setZoom(14);
    }
  }, [distance]);

  const moveType: MoveType = distance?.moveType ?? "local";
  const distanceKm = distance?.km ?? 0;
  const effectiveCrew = crewEnabled ? Math.max(1, crewCount) : 0;
  const vehicleSelection: VehicleSelection = selectedTile.isSuv ? "suv" : "auto";

  const items: SelectedItem[] = useMemo(() => {
    if (selectedTile.isSuv) return [];
    // Synthesize a dummy inventory sized for the chosen tile so recommendVehicle picks it.
    const idx = VEHICLE_TILES.findIndex((v) => v.name === selectedTile.name);
    const vehicle = VEHICLE_FLEET[idx];
    if (!vehicle) return [];
    return [{
      id: -1,
      item_name: selectedTile.name,
      cubic_feet: vehicle.maxVolumeCuFt * 0.7,
      weight_lbs: vehicle.maxWeightLbs * 0.7,
      quantity: 1,
    }];
  }, [selectedTile]);

  const quote = useMemo(
    () => calculateMovePrice({ items, moveType, distanceKm, crewCount: effectiveCrew, vehicleSelection }),
    [items, moveType, distanceKm, effectiveCrew, vehicleSelection],
  );

  const routeReady = distanceKm > 0 && !calculating && !distanceError;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const scheduledIso = scheduleMode === "later" && scheduledAt
        ? (() => {
            const [h, m] = scheduledTime.split(":").map((n) => parseInt(n, 10) || 0);
            const d = new Date(scheduledAt);
            d.setHours(h, m, 0, 0);
            return d.toISOString();
          })()
        : null;

      const bookingPayload = {
        pickup_address: pickup.trim(),
        dropoff_address: dropoff.trim(),
        move_size: moveSizeFromVehicleName(quote.recommendedVehicle),
        move_type: moveType,
        distance_km: distanceKm,
        items: [],
        crew_count: effectiveCrew,
        vehicle_category: selectedTile.isSuv ? "suv" : null,
        scheduled_at: scheduledIso,
        pickup_lat: distance?.pickup?.lat ?? null,
        pickup_lng: distance?.pickup?.lng ?? null,
        dropoff_lat: distance?.dropoff?.lat ?? null,
        dropoff_lng: distance?.dropoff?.lng ?? null,
      };

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Missing auth token");

      const { data: payload, error: checkoutError } = await supabase.functions.invoke<{
        clientSecret?: string; publishableKey?: string; error?: string;
      }>("stripe_checkout", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { bookingPayload, amountCad: quote.finalPrice },
      });

      if (checkoutError || !payload?.clientSecret || !payload.publishableKey) {
        toast.error("Could not start checkout: " + (payload?.error ?? checkoutError?.message ?? "unknown"));
        setSubmitting(false);
        return;
      }
      setClientSecret(payload.clientSecret);
      setPublishableKey(payload.publishableKey);
      setCheckoutOpen(true);
      setSubmitting(false);
    } catch (e) {
      toast.error("Unexpected error: " + (e instanceof Error ? e.message : String(e)));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-slate-100">
      {/* Full-screen map background */}
      <div ref={mapDivRef} className="absolute inset-0" />
      {!mapsReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
        <button
          onClick={() => (step === "schedule" ? setStep("where") : onClose?.())}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-slate-800" />
        </button>
        <div className="pointer-events-auto rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow">
          {step === "where" ? "Where to?" : "Schedule & confirm"}
        </div>
        <div className="w-10" />
      </div>

      {/* Bottom sheet — drag-to-expand, Uber-style spring motion */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.22)] will-change-transform",
          "transition-[max-height,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] animate-slide-in-up",
          sheetCollapsed ? "max-h-[120px]" : "max-h-[85vh]",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drag handle — tap or swipe */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSheetCollapsed((v) => !v)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSheetCollapsed((v) => !v)}
          onTouchStart={(e) => {
            const startY = e.touches[0].clientY;
            const onMove = (ev: TouchEvent) => {
              const dy = ev.touches[0].clientY - startY;
              if (dy > 40) { setSheetCollapsed(true); cleanup(); }
              else if (dy < -40) { setSheetCollapsed(false); cleanup(); }
            };
            const cleanup = () => {
              window.removeEventListener("touchmove", onMove);
              window.removeEventListener("touchend", cleanup);
            };
            window.addEventListener("touchmove", onMove, { passive: true });
            window.addEventListener("touchend", cleanup);
          }}
          className="flex w-full cursor-grab justify-center pt-2.5 pb-1 active:cursor-grabbing touch-none select-none"
          aria-label={sheetCollapsed ? "Expand" : "Collapse"}
        >
          <span className={cn(
            "block h-1.5 w-12 rounded-full transition-colors",
            sheetCollapsed ? "bg-slate-400" : "bg-slate-300",
          )} />
        </div>

        <div className="max-h-[calc(85vh-32px)] overflow-y-auto px-4 pb-4">

          {step === "where" && (
            <div className="space-y-4">
              {/* Address inputs */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="h-8 w-px bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        Pickup
                      </label>
                      <PlacesAutocomplete
                        value={pickup}
                        onChange={setPickup}
                        placeholder="Enter pickup address"
                        className="border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <Navigation className="mr-1 inline h-3 w-3" />
                        Drop-off
                      </label>
                      <PlacesAutocomplete
                        value={dropoff}
                        onChange={setDropoff}
                        placeholder="Where to?"
                        className="border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {calculating && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Calculating route…
                  </p>
                )}
                {routeReady && (
                  <p className="mt-2 text-[11px] font-semibold text-emerald-600">
                    {distanceKm.toFixed(1)} km · {moveType}
                  </p>
                )}
                {distanceError && (
                  <p className="mt-2 text-[11px] font-medium text-red-600">{distanceError}</p>
                )}
              </div>

              {/* Vehicle horizontal scroller */}
              <div>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Choose your ride
                </p>
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden">
                  {VEHICLE_TILES.map((tile) => {
                    const active = selectedTile.name === tile.name;
                    const price = routeReady ? priceForTile(tile, distanceKm, moveType) : null;
                    return (
                      <button
                        key={tile.name}
                        type="button"
                        onClick={() => setSelectedTile(tile)}
                        className={cn(
                          "flex w-32 shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border-2 bg-white p-3 text-center transition-all",
                          active
                            ? "border-primary bg-primary/5 shadow-[0_6px_20px_rgba(255,87,34,0.25)]"
                            : "border-slate-200 hover:border-primary/40",
                        )}
                      >
                        <div className="flex h-16 w-full items-center justify-center">
                          <img
                            src={tile.image}
                            alt={tile.name}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <p className={cn("text-[12px] font-bold leading-tight", active ? "text-primary" : "text-slate-900")}>
                          {tile.name}
                        </p>
                        <p className="text-[10px] leading-tight text-slate-500">{tile.capacity}</p>
                        <p className={cn("mt-0.5 text-[13px] font-bold", active ? "text-primary" : "text-slate-800")}>
                          {price != null ? formatCurrency(price) : "—"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={() => setStep("schedule")}
                disabled={!routeReady}
                className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                Continue to Schedule
              </Button>
            </div>
          )}

          {step === "schedule" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Trip</p>
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-900">{pickup}</p>
                <p className="line-clamp-1 text-sm text-slate-600">→ {dropoff}</p>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                  <span className="font-semibold text-slate-700">{selectedTile.name}</span>
                  <span className="font-semibold text-primary">{formatCurrency(quote.finalPrice)}</span>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <CalendarDays className="mr-1 inline h-3 w-3" /> When
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setScheduleMode("asap"); setScheduledAt(undefined); }}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all",
                      scheduleMode === "asap"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-700",
                    )}
                  >
                    Now / ASAP
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("later")}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all",
                      scheduleMode === "later"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-700",
                    )}
                  >
                    Schedule
                  </button>
                </div>
                {scheduleMode === "later" && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("flex-1 justify-start text-left font-normal", !scheduledAt && "text-slate-500")}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {scheduledAt ? format(scheduledAt, "EEE, MMM d") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledAt}
                          onSelect={setScheduledAt}
                          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-[110px]"
                      disabled={!scheduledAt}
                    />
                  </div>
                )}
              </div>

              {/* Crew */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Additional crew</p>
                      <p className="text-[11px] text-slate-500">
                        Optional · {formatCurrency(CREW_MEMBER_RATE_CAD)} per person
                      </p>
                    </div>
                  </div>
                  <Switch checked={crewEnabled} onCheckedChange={setCrewEnabled} />
                </div>
                {crewEnabled && (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm">Crew members</span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full"
                        onClick={() => setCrewCount((c) => Math.max(1, c - 1))} disabled={crewCount <= 1}>-</Button>
                      <span className="w-5 text-center text-sm font-semibold">{crewCount}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full"
                        onClick={() => setCrewCount((c) => Math.min(6, c + 1))} disabled={crewCount >= 6}>+</Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !routeReady}
                className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Preparing…" : `Confirm ${formatCurrency(quote.finalPrice)}`}
              </Button>
            </div>
          )}
        </div>

        {/* Collapse indicator */}
        <button
          type="button"
          onClick={() => setSheetCollapsed((v) => !v)}
          className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          aria-label="Toggle sheet"
        >
          {sheetCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <StripeCheckoutModal
        open={checkoutOpen}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        onClose={() => {
          setCheckoutOpen(false);
          setClientSecret(null);
          onBooked?.();
        }}
      />
    </div>
  );
};

export default UberBookingScreen;
