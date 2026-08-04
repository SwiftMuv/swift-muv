/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Loader2,
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
  eta: string;
  image: string;
  isSuv?: boolean;
}

const VEHICLE_TILES: VehicleTile[] = [
  { name: "SwiftGo SUV", capacity: "Bags · flat items", eta: "3 min away", image: SuvImg, isSuv: true },
  { name: "Cargo Van", capacity: "1–2 rooms · 2,000 lb", eta: "5 min away", image: CargoVanImg },
  { name: "12ft Pickup", capacity: "Studio · 3,000 lb", eta: "6 min away", image: PickupImg },
  { name: "16ft Truck", capacity: "1 bedroom · 4,500 lb", eta: "8 min away", image: BoxTruckImg },
  { name: "26ft Truck", capacity: "3+ bedrooms · 10,000 lb", eta: "12 min away", image: MovingTruckImg },
];

// Uber-style near-monochrome map — grayscale roads, muted land, subtle water.
const UBER_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#000000" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa0a6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#132015" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2e2e2e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b0b4b8" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#5c5c5c" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#242424" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#06131c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d5866" }] },
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
  const idx = VEHICLE_TILES.findIndex((t) => t.name === tile.name);
  const vehicle = VEHICLE_FLEET[idx];
  if (!vehicle) return 0;
  const base = vehicle.baseFee + vehicle.perKmRate * Math.max(0, distanceKm);
  return Math.round(base * 100) / 100;
};

interface Props {
  onBooked?: () => void;
  onClose?: () => void;
}

type Snap = "peek" | "half" | "full";

const UberBookingScreen = ({ onBooked, onClose }: Props) => {
  const { user } = useAuth();
  const { formatCurrency } = useI18n();
  const { ready: mapsReady } = useGoogleMaps();

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

  // Map refs
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const routeCasingRef = useRef<google.maps.Polyline | null>(null);

  // Init map
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: 45.5017, lng: -73.5673 },
      zoom: 13,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      clickableIcons: false,
      backgroundColor: "#000000",
      styles: UBER_MAP_STYLES,
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
        if (data?.km) {
          setDistance(data);
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
  }, [pickup, dropoff]);

  // Custom Uber-style dot markers via SVG
  const makeDotIcon = (fill: string, ring = "#ffffff"): google.maps.Symbol => ({
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: fill,
    fillOpacity: 1,
    strokeColor: ring,
    strokeWeight: 3,
  });

  // Update markers + route
  useEffect(() => {
    if (!mapRef.current || !mapsReady) return;
    const map = mapRef.current;
    const p = distance?.pickup;
    const d = distance?.dropoff;

    pickupMarkerRef.current?.setMap(null);
    dropoffMarkerRef.current?.setMap(null);
    routeLineRef.current?.setMap(null);
    routeCasingRef.current?.setMap(null);
    pickupMarkerRef.current = null;
    dropoffMarkerRef.current = null;
    routeLineRef.current = null;
    routeCasingRef.current = null;

    if (p) {
      pickupMarkerRef.current = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        icon: makeDotIcon("#0F172A"),
      });
    }
    if (d) {
      dropoffMarkerRef.current = new google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        icon: makeDotIcon("#0F172A"),
      });
    }
    if (p && d) {
      const path = [
        { lat: p.lat, lng: p.lng },
        { lat: d.lat, lng: d.lng },
      ];
      // White casing under black line — Uber signature route look.
      routeCasingRef.current = new google.maps.Polyline({
        path,
        strokeColor: "#ffffff",
        strokeOpacity: 1,
        strokeWeight: 8,
        map,
      });
      routeLineRef.current = new google.maps.Polyline({
        path,
        strokeColor: "#0F172A",
        strokeOpacity: 1,
        strokeWeight: 5,
        map,
      });
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: p.lat, lng: p.lng });
      bounds.extend({ lat: d.lat, lng: d.lng });
      map.fitBounds(bounds, { top: 80, bottom: 340, left: 48, right: 48 });
    } else if (p) {
      map.setCenter({ lat: p.lat, lng: p.lng });
      map.setZoom(14);
    }
  }, [distance, mapsReady]);

  const moveType: MoveType = distance?.moveType ?? "local";
  const distanceKm = distance?.km ?? 0;
  const effectiveCrew = crewEnabled ? Math.max(1, crewCount) : 0;
  const vehicleSelection: VehicleSelection = selectedTile.isSuv ? "suv" : "auto";

  const items: SelectedItem[] = useMemo(() => {
    if (selectedTile.isSuv) return [];
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
    <div className="fixed inset-0 z-30 bg-black font-sans text-white">
      {/* Full-screen map */}
      <div ref={mapDivRef} className="absolute inset-0" />
      {!mapsReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}

      {/* Top back button — Uber floating pill */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
        <button
          onClick={goBack}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.6)] active:scale-95 transition"
          aria-label="Back"
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
          aria-label="Drag sheet"
        >
          <span className="block h-1 w-10 rounded-full bg-neutral-700" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {step === "where" && (
            <div className="space-y-5 pt-1">
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-white">
                Where are you moving?
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
                        onChange={setPickup}
                        placeholder="Pickup location"
                        className={cn(fieldClass, pickupInvalid && invalidFieldClass)}
                      />
                    </div>
                    <div className="pt-1">
                      <PlacesAutocomplete
                        value={dropoff}
                        onChange={setDropoff}
                        placeholder="Where to?"
                        className={cn(fieldClass, dropoffInvalid && invalidFieldClass)}
                      />
                    </div>
                  </div>
                  {(pickup || dropoff) && (
                    <button
                      onClick={() => { setPickup(""); setDropoff(""); setDistance(null); }}
                      className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {(pickupInvalid || dropoffInvalid) && !distanceError && (
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-red-400" role="alert">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Enter a full street address for {pickupInvalid ? "pickup" : "drop-off"}.
                </p>
              )}

              {calculating && (
                <p className="flex items-center gap-2 text-[13px] text-neutral-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding your route…
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
                      Recent places
                    </p>
                    <button
                      type="button"
                      onClick={clearRecents}
                      className="rounded-md px-1 text-[11px] font-semibold text-neutral-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      Clear
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
                          onClick={() => setPickup(r)}
                          className="max-w-[180px] truncate px-3 py-2 text-[12px] font-semibold text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
                          title={`Use as pickup: ${r}`}
                        >
                          <MapPin className="mr-1.5 inline h-3 w-3 text-neutral-400" />
                          {r}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDropoff(r)}
                          className="border-l border-neutral-700 px-2.5 py-2 text-[11px] font-bold uppercase text-neutral-300 hover:bg-neutral-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
                          title={`Use as drop-off: ${r}`}
                        >
                          To
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent / hint list — pure Uber list rows */}
              <div className="space-y-1 pt-1">
                <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Tips
                </p>
                {[
                  "Pick a full address from suggestions for accurate pricing",
                  "Schedule up to 30 days in advance",
                  "Add extra crew for heavy items",
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
                Choose a vehicle
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
                <PaymentRow />
                <Button
                  onClick={() => setStep("schedule")}
                  disabled={!routeReady}
                  className="mt-2 h-14 w-full rounded-2xl bg-white text-[16px] font-bold text-black shadow-lg hover:bg-neutral-200 active:scale-[0.99] transition disabled:bg-neutral-800 disabled:text-neutral-500"
                >
                  Choose {selectedTile.name}
                </Button>
              </div>
            </div>
          )}

          {step === "schedule" && (
            <div className="space-y-4 pt-1">
              <h2 className="text-[22px] font-extrabold tracking-tight text-white">
                Review and confirm
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
                  When
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
                      {mode === "asap" ? "Now" : "Schedule"}
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
                      <p className="text-[14px] font-bold text-white">Extra crew</p>
                      <p className="text-[12px] text-neutral-400">
                        {formatCurrency(CREW_MEMBER_RATE_CAD)} per person
                      </p>
                    </div>
                  </div>
                  <Switch checked={crewEnabled} onCheckedChange={setCrewEnabled} />
                </div>
                {crewEnabled && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-900 px-3 py-2.5">
                    <span className="text-[14px] font-semibold text-white">Crew members</span>
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
                {submitting ? "Preparing…" : `Confirm · ${formatCurrency(quote.finalPrice)}`}
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

const PaymentRow = () => (
  <button className="mb-2 flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-4 py-3 text-left transition hover:bg-neutral-800">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-14 items-center justify-center rounded-md bg-white text-[10px] font-bold text-black">
        CARD
      </div>
      <div>
        <p className="text-[13px] font-bold text-white">Personal · Card</p>
        <p className="text-[11px] text-neutral-400">Charged after confirmation</p>
      </div>
    </div>
    <ChevronRight className="h-4 w-4 text-neutral-500" />
  </button>
);

export default UberBookingScreen;
