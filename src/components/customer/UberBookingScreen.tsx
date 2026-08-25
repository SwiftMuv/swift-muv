/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { isNativeAndroid, NativeBookingMap } from "@/components/customer/NativeBookingMap";
import { GoogleRouteMap } from "@/components/maps/GoogleRouteMap";
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
import { usePricingVersion } from "@/lib/pricingConfig";
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
  eta: string;
  image: string;
  isSuv?: boolean;
  /** Matching entry in VEHICLE_FLEET (used for pricing). */
  fleetName?: string;
}

const VEHICLE_TILES: VehicleTile[] = [
  { name: "SUV", capacity: "Bags · flat items", eta: "3 min away", image: SuvImg, isSuv: true },
  { name: "Pickup", capacity: "Studio · 3,000 lb", eta: "6 min away", image: PickupImg, fleetName: "12ft Cube Van" },
  { name: "Van", capacity: "1–2 rooms · 2,000 lb", eta: "5 min away", image: CargoVanImg, fleetName: "Cargo Van" },
  { name: "16ft Truck", capacity: "1 bedroom · 4,500 lb", eta: "8 min away", image: BoxTruckImg, fleetName: "16ft Truck" },
  { name: "26ft Truck", capacity: "3+ bedrooms · 10,000 lb", eta: "12 min away", image: MovingTruckImg, fleetName: "26ft Truck" },
];


const moveSizeFromVehicleName = (name: string): "small" | "medium" | "large" | "xlarge" => {
  if (name.startsWith("Cargo")) return "small";
  if (name.startsWith("12ft") || name.startsWith("Pickup")) return "medium";
  if (name.startsWith("16ft")) return "large";
  return "xlarge";
};

const fleetForTile = (tile: VehicleTile) =>
  VEHICLE_FLEET.find((v) => v.name === tile.fleetName);

const priceForTile = (tile: VehicleTile, distanceKm: number, moveType: MoveType): number => {
  if (tile.isSuv) {
    const q = calculateMovePrice({ items: [], moveType, distanceKm, vehicleSelection: "suv" });
    return q.finalPrice;
  }
  const vehicle = fleetForTile(tile);
  if (!vehicle) return 0;
  const q = calculateMovePrice({
    items: [{ id: -1, item_name: vehicle.name, cubic_feet: vehicle.maxVolumeCuFt * 0.7, weight_lbs: vehicle.maxWeightLbs * 0.7, quantity: 1 }],
    moveType,
    distanceKm,
    vehicleSelection: "auto",
  });
  return q.finalPrice;
};


interface Props {
  onBooked?: () => void;
  onClose?: () => void;
}

type Snap = "peek" | "half" | "full";

const RECENTS_KEY = "swiftmuv_recent_places";
const MAX_RECENTS = 6;

const loadRecents = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string").slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
};

// Shared dark-sheet input styling with high-contrast focus ring + invalid state.
const fieldClass =
  "h-11 border-0 bg-transparent px-0 text-[15px] font-semibold text-white shadow-none placeholder:text-neutral-500 " +
  "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 rounded-md";
const invalidFieldClass = "text-red-300 placeholder:text-red-400/70 focus-visible:ring-red-400";

// A "full" address needs at least a number-ish token and a comma or several words.
const looksIncomplete = (v: string) => v.trim().length > 0 && v.trim().length < 8;


const UberBookingScreen = ({ onBooked, onClose }: Props) => {
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const nativeAndroid = isNativeAndroid();
  const [nativeMapReady, setNativeMapReady] = useState(false);
  const [nativeMapError, setNativeMapError] = useState<string | null>(null);

  const [step, setStep] = useState<"where" | "vehicle" | "schedule">("where");
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
  const [snap, setSnap] = useState<Snap>("half");
  const [recents, setRecents] = useState<string[]>(() => loadRecents());
  const [pickupPicked, setPickupPicked] = useState(false);
  const [dropoffPicked, setDropoffPicked] = useState(false);

  const pickupInvalid = looksIncomplete(pickup);
  const dropoffInvalid = looksIncomplete(dropoff);

  const rememberPlaces = (...places: string[]) => {
    setRecents((prev) => {
      const next = [...places.map((p) => p.trim()).filter(Boolean), ...prev]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch { /* storage unavailable */ }
      return next;
    });
  };

  const clearRecents = () => {
    setRecents([]);
    try {
      localStorage.removeItem(RECENTS_KEY);
    } catch { /* storage unavailable */ }
  };


  // Distance calc
  useEffect(() => {
    if (!pickupPicked || !dropoffPicked || pickup.trim().length < 5 || dropoff.trim().length < 5) {
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
        if (data?.km) {
          setDistance(data);
          rememberPlaces(pickup, dropoff);
          setStep("vehicle");
          setSnap("half");
        }
      } catch (e) {
        console.warn("Distance calc failed", e);
        setDistance(null);
        setDistanceError("Route calculation failed.");
      } finally {
        setCalculating(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [pickup, dropoff, pickupPicked, dropoffPicked]);

  const moveType: MoveType = distance?.moveType ?? "local";
  const distanceKm = distance?.km ?? 0;
  const effectiveCrew = crewEnabled ? Math.max(1, crewCount) : 0;
  const vehicleSelection: VehicleSelection = selectedTile.isSuv ? "suv" : "auto";

  const items: SelectedItem[] = useMemo(() => {
    if (selectedTile.isSuv) return [];
    const vehicle = fleetForTile(selectedTile);
    if (!vehicle) return [];
    return [{
      id: -1,

      item_name: selectedTile.name,
      cubic_feet: vehicle.maxVolumeCuFt * 0.7,
      weight_lbs: vehicle.maxWeightLbs * 0.7,
      quantity: 1,
    }];
  }, [selectedTile]);

  const pricingVersion = usePricingVersion();
  const quote = useMemo(
    () => calculateMovePrice({ items, moveType, distanceKm, crewCount: effectiveCrew, vehicleSelection }),
    [items, moveType, distanceKm, effectiveCrew, vehicleSelection, pricingVersion],
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

  // Sheet drag
  const dragStateRef = useRef<{ startY: number; startSnap: Snap } | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const snapHeights: Record<Snap, string> = {
    peek: "160px",
    half: "56vh",
    full: "92vh",
  };

  const onDragStart = (clientY: number) => {
    dragStateRef.current = { startY: clientY, startSnap: snap };
    setDragOffset(0);
  };
  const onDragMove = (clientY: number) => {
    if (!dragStateRef.current) return;
    setDragOffset(clientY - dragStateRef.current.startY);
  };
  const onDragEnd = () => {
    const st = dragStateRef.current;
    if (!st) return;
    const dy = dragOffset;
    let next: Snap = st.startSnap;
    if (dy < -60) next = st.startSnap === "peek" ? "half" : "full";
    else if (dy > 60) next = st.startSnap === "full" ? "half" : "peek";
    dragStateRef.current = null;
    setDragOffset(0);
    setSnap(next);
  };

  const goBack = () => {
    if (step === "schedule") { setStep("vehicle"); return; }
    if (step === "vehicle") { setStep("where"); return; }
    onClose?.();
  };

  return (
    <div className={cn("fixed inset-0 z-30 font-sans text-white bg-black")}>
      {/* Full-screen map */}
      {nativeAndroid ? (
        <NativeBookingMap
          pickup={distance?.pickup}
          dropoff={distance?.dropoff}
          onReady={() => setNativeMapReady(true)}
          onError={setNativeMapError}
        />
      ) : (
        <GoogleRouteMap
          pickup={distance?.pickup}
          dropoff={distance?.dropoff}
          className="absolute inset-0"
          routeMode="straight"
          fitMode="always"
          showUserLocation
          fallbackText="Loading map…"
        />

      )}
      {nativeAndroid && !nativeMapReady && !nativeMapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}
      {nativeAndroid && nativeMapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black px-8 text-center">
          <div className="max-w-sm space-y-2">
            <AlertCircle className="mx-auto h-7 w-7 text-red-400" />
            <p className="text-sm font-semibold text-white">Map unavailable</p>
            <p className="text-xs text-neutral-400">{nativeMapError}</p>
          </div>
        </div>
      )}

      {/* Top back button — Uber floating pill */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
        <button
          onClick={goBack}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.6)] active:scale-95 transition"
          aria-label={t("cust.booking.back")}
        >
          <ArrowLeft className="h-5 w-5 text-white" strokeWidth={2.5} />
        </button>
        {routeReady && step !== "where" && (
          <div className="pointer-events-auto rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black shadow-lg">
            {distanceKm.toFixed(1)} km · {moveType}
          </div>
        )}
        <div className="w-11" />
      </div>

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[28px] bg-black shadow-[0_-16px_48px_rgba(0,0,0,0.7)] border-t border-neutral-800 will-change-transform"
        style={{
          height: snapHeights[snap],
          transform: `translateY(${Math.max(0, dragOffset)}px)`,
          transition: dragStateRef.current ? "none" : "height 380ms cubic-bezier(0.22,1,0.36,1), transform 380ms cubic-bezier(0.22,1,0.36,1)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSnap(snap === "full" ? "half" : snap === "half" ? "peek" : "half")}
          onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => onDragMove(e.touches[0].clientY)}
          onTouchEnd={onDragEnd}
          onMouseDown={(e) => {
            onDragStart(e.clientY);
            const mv = (ev: MouseEvent) => onDragMove(ev.clientY);
            const up = () => {
              onDragEnd();
              window.removeEventListener("mousemove", mv);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", up);
          }}
          className="flex w-full shrink-0 cursor-grab justify-center pt-3 pb-2 active:cursor-grabbing touch-none select-none"
          aria-label={t("cust.booking.dragSheet")}
        >
          <span className="block h-1 w-10 rounded-full bg-neutral-700" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {step === "where" && (
            <div className="space-y-5 pt-1">
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-white">
                {t("cust.booking.whereMoving")}
              </h1>

              {/* Address stack — Uber's dot/line/square pattern */}
              <div
                className={cn(
                  "rounded-2xl bg-neutral-900 p-3 ring-1 transition-colors",
                  distanceError ? "ring-red-500" : "ring-neutral-800 focus-within:ring-2 focus-within:ring-white",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-3 flex flex-col items-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    <span className="my-1 h-8 w-0.5 bg-neutral-700" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-white" />
                  </div>
                  <div className="flex-1 divide-y divide-neutral-800">
                    <div className="pb-1">
                      <PlacesAutocomplete
                        value={pickup}
                        onChange={(v) => { setPickup(v); setPickupPicked(false); }}
                        onSelect={() => setPickupPicked(true)}
                        placeholder={t("cust.booking.pickupLocation")}
                        className={cn(fieldClass, pickupInvalid && invalidFieldClass)}
                      />
                    </div>
                    <div className="pt-1">
                      <PlacesAutocomplete
                        value={dropoff}
                        onChange={(v) => { setDropoff(v); setDropoffPicked(false); }}
                        onSelect={() => setDropoffPicked(true)}
                        placeholder={t("cust.booking.whereTo")}
                        className={cn(fieldClass, dropoffInvalid && invalidFieldClass)}
                      />
                    </div>
                  </div>
                  {(pickup || dropoff) && (
                    <button
                      onClick={() => { setPickup(""); setDropoff(""); setDistance(null); setPickupPicked(false); setDropoffPicked(false); }}
                      className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      aria-label={t("cust.booking.clear")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {(pickupInvalid || dropoffInvalid) && !distanceError && (
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-red-400" role="alert">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t("cust.booking.enterFullAddress", { field: pickupInvalid ? t("cust.booking.fieldPickup") : t("cust.booking.fieldDropoff") })}
                </p>
              )}

              {calculating && (
                <p className="flex items-center gap-2 text-[13px] text-neutral-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("cust.booking.findingRoute")}
                </p>
              )}
              {distanceError && (
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-red-400" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {distanceError}
                </p>
              )}

              {/* Recent places — quick-fill chips */}
              {recents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      {t("cust.booking.recentPlaces")}
                    </p>
                    <button
                      type="button"
                      onClick={clearRecents}
                      className="rounded-md px-1 text-[11px] font-semibold text-neutral-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {t("cust.booking.clearBtn")}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recents.map((r) => (
                      <div
                        key={r}
                        className="flex items-center overflow-hidden rounded-full border border-neutral-700 bg-neutral-900"
                      >
                        <button
                          type="button"
                          onClick={() => { setPickup(r); setPickupPicked(true); }}
                          className="max-w-[180px] truncate px-3 py-2 text-[12px] font-semibold text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
                          title={t("cust.booking.useAsPickup", { place: r })}
                        >
                          <MapPin className="mr-1.5 inline h-3 w-3 text-neutral-400" />
                          {r}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDropoff(r); setDropoffPicked(true); }}
                          className="border-l border-neutral-700 px-2.5 py-2 text-[11px] font-bold uppercase text-neutral-300 hover:bg-neutral-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
                          title={t("cust.booking.useAsDropoff", { place: r })}
                        >
                          {t("cust.booking.to")}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent / hint list — pure Uber list rows */}
              <div className="space-y-1 pt-1">
                <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {t("cust.booking.tips")}
                </p>
                {[
                  t("cust.booking.tip1"),
                  t("cust.booking.tip2"),
                  t("cust.booking.tip3"),
                ].map((h) => (
                  <div key={h} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-neutral-900">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800">
                      <Search className="h-4 w-4 text-neutral-300" />
                    </div>
                    <span className="flex-1 text-[14px] text-neutral-300">{h}</span>
                    <ChevronRight className="h-4 w-4 text-neutral-500" />
                  </div>
                ))}
              </div>

            </div>
          )}

          {step === "vehicle" && (
            <div className="space-y-3 pt-1">
              <h2 className="text-[22px] font-extrabold tracking-tight text-white">
                {t("cust.booking.chooseVehicle")}
              </h2>

              <div className="divide-y divide-neutral-800">
                {VEHICLE_TILES.map((tile) => {
                  const active = selectedTile.name === tile.name;
                  const price = routeReady ? priceForTile(tile, distanceKm, moveType) : null;
                  return (
                    <button
                      key={tile.name}
                      type="button"
                      onClick={() => setSelectedTile(tile)}
                      className={cn(
                        "flex w-full items-center gap-3 px-1 py-3 text-left transition-colors",
                        active && "bg-neutral-900",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-neutral-900",
                          active && "ring-2 ring-white",
                        )}
                      >
                        <img
                          src={tile.image}
                          alt={tile.name}
                          className="max-h-14 max-w-16 object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[15px] font-bold text-white">{tile.name}</p>
                        </div>
                        <p className="flex items-center gap-1 text-[12px] text-neutral-400">
                          <Clock className="h-3 w-3" /> {tile.eta}
                        </p>
                        <p className="truncate text-[12px] text-neutral-400">{tile.capacity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-extrabold text-white">
                          {price != null ? formatCurrency(price) : "—"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3">
                {/* Price breakdown */}
              <div className="space-y-1.5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-[14px]">
                <div className="flex justify-between text-neutral-400">
                  <span>
                    {formatCurrency(quote.flatRate)} flat rate · under {quote.flatIncludedKm} km
                  </span>
                  <span className="font-semibold text-white">{formatCurrency(quote.flatRate)}</span>
                </div>
                <p className="text-[12px] leading-snug text-neutral-500">
                  {formatCurrency(quote.flatRate)} flat rate for trips under {quote.flatIncludedKm} km — includes service fee &amp; tax.
                  Extra distance is billed at {formatCurrency(quote.excessRatePerKm)}/km.
                </p>
                {quote.excessKm > 0 && (
                  <div className="flex justify-between text-neutral-400">
                    <span>
                      Extra distance ({quote.excessKm} km × {formatCurrency(quote.excessRatePerKm)})
                    </span>
                    <span className="font-semibold text-white">{formatCurrency(quote.excessFee)}</span>
                  </div>
                )}
                {quote.crewCost > 0 && (
                  <div className="flex justify-between text-neutral-400">
                    <span>{t("booking.subtotal")}</span>
                    <span className="font-semibold text-white">{formatCurrency(quote.subtotal)}</span>
                  </div>
                )}
                {quote.taxAmount > 0 && (
                  <div className="flex justify-between text-neutral-400">
                    <span>{t("booking.tax")}</span>
                    <span className="font-semibold text-white">{formatCurrency(quote.taxAmount)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-neutral-800 pt-2 text-[16px] font-bold text-white">
                  <span>{t("booking.totalCad")}</span>
                  <span>{formatCurrency(quote.finalPrice)}</span>
                </div>
              </div>


              <PaymentRow />
                <Button
                  onClick={() => setStep("schedule")}
                  disabled={!routeReady}
                  className="mt-2 h-14 w-full rounded-2xl bg-white text-[16px] font-bold text-black shadow-lg hover:bg-neutral-200 active:scale-[0.99] transition disabled:bg-neutral-800 disabled:text-neutral-500"
                >
                  {t("cust.booking.chooseVehicleBtn", { name: selectedTile.name })}
                </Button>
              </div>
            </div>
          )}

          {step === "schedule" && (
            <div className="space-y-4 pt-1">
              <h2 className="text-[22px] font-extrabold tracking-tight text-white">
                {t("cust.booking.reviewConfirm")}
              </h2>

              {/* Trip summary */}
              <div className="rounded-2xl bg-neutral-900 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 flex flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    <span className="my-1 h-6 w-0.5 bg-neutral-700" />
                    <span className="h-2 w-2 rounded-sm bg-white" />
                  </div>
                  <div className="flex-1 space-y-2 text-[13px]">
                    <p className="line-clamp-1 font-semibold text-white">{pickup}</p>
                    <p className="line-clamp-1 font-semibold text-white">{dropoff}</p>
                  </div>
                </div>
              </div>

              {/* When */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  {t("cust.booking.when")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["asap", "later"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setScheduleMode(mode); if (mode === "asap") setScheduledAt(undefined); }}
                      className={cn(
                        "rounded-xl px-3 py-3 text-[14px] font-bold transition",
                        scheduleMode === mode
                          ? "bg-white text-black"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800",
                      )}
                    >
                      {mode === "asap" ? t("cust.booking.now") : t("cust.booking.schedule")}
                    </button>
                  ))}
                </div>
                {scheduleMode === "later" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-11 flex-1 justify-start rounded-xl border-neutral-800 text-left font-semibold",
                            !scheduledAt && "text-neutral-400",
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {scheduledAt ? format(scheduledAt, "EEE, MMM d") : t("cust.booking.pickDate")}
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
                      className="h-11 w-[120px] rounded-xl border-neutral-800 font-semibold"
                      disabled={!scheduledAt}
                    />
                  </div>
                )}
              </div>

              {/* Crew */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">{t("cust.booking.extraCrew")}</p>
                      <p className="text-[12px] text-neutral-400">
                        {t("cust.booking.perPerson", { amount: formatCurrency(CREW_MEMBER_RATE_CAD) })}
                      </p>
                    </div>
                  </div>
                  <Switch checked={crewEnabled} onCheckedChange={setCrewEnabled} />
                </div>
                {crewEnabled && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-900 px-3 py-2.5">
                    <span className="text-[14px] font-semibold text-white">{t("booking.crewMembers")}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCrewCount((c) => Math.max(1, c - 1))}
                        disabled={crewCount <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-white shadow-sm disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-[15px] font-bold">{crewCount}</span>
                      <button
                        onClick={() => setCrewCount((c) => Math.min(6, c + 1))}
                        disabled={crewCount >= 6}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-white shadow-sm disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <PaymentRow />

              <Button
                onClick={handleSubmit}
                disabled={submitting || !routeReady}
                className="h-14 w-full rounded-2xl bg-white text-[16px] font-bold text-black shadow-lg hover:bg-neutral-200 active:scale-[0.99] transition disabled:bg-neutral-800 disabled:text-neutral-500"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? t("cust.booking.preparingDots") : t("cust.booking.confirmAmount", { amount: formatCurrency(quote.finalPrice) })}
              </Button>
            </div>
          )}
        </div>
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

const PaymentRow = () => {
  const { t } = useI18n();
  return (
    <button className="mb-2 flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-4 py-3 text-left transition hover:bg-neutral-800">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-14 items-center justify-center rounded-md bg-white text-[10px] font-bold text-black">
          CARD
        </div>
        <div>
          <p className="text-[13px] font-bold text-white">{t("cust.booking.paymentCard")}</p>
          <p className="text-[11px] text-neutral-400">{t("cust.booking.chargedAfter")}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-500" />
    </button>
  );
};

export default UberBookingScreen;
