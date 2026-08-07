import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CarFront, Loader2, Truck, Users, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PlacesAutocomplete } from "@/components/booking/PlacesAutocomplete";
import { InventoryPicker } from "@/components/booking/InventoryPicker";
import StripeCheckoutModal from "@/components/booking/StripeCheckoutModal";
import PricingCalculator from "@/components/booking/PricingCalculator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

import { calculateMovePrice, type MoveType, type SelectedItem, type VehicleSelection } from "@/lib/movingEngine";

const CHECKOUT_FUNCTION = "stripe_checkout";

interface DistanceResult {
  km: number;
  pickup?: { lat: number; lng: number; province?: string; city?: string };
  dropoff?: { lat: number; lng: number; province?: string; city?: string };
  moveType?: MoveType;
  error?: string;
  details?: string;
  fallback?: boolean;
}

const moveSizeFromVehicleName = (name: string): "small" | "medium" | "large" | "xlarge" => {
  if (name.startsWith("Cargo")) return "small";
  if (name.startsWith("12ft")) return "medium";
  if (name.startsWith("16ft")) return "large";
  return "xlarge";
};

const BookingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupPicked, setPickupPicked] = useState(false);
  const [dropoffPicked, setDropoffPicked] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [crewEnabled, setCrewEnabled] = useState(false);
  const [crewCount, setCrewCount] = useState(1);
  const [suvSelected, setSuvSelected] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [scheduleMode, setScheduleMode] = useState<"asap" | "later">("asap");
  const [globalFloor, setGlobalFloor] = useState<string>("");
  const [globalHasElevator, setGlobalHasElevator] = useState<boolean>(true);
  const [floorAccessEnabled, setFloorAccessEnabled] = useState<boolean>(false);

  const updateItemMeta = (id: number, patch: Partial<Pick<SelectedItem, "floor_level" | "has_elevator">>) => {
    setSelectedItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

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
          setDistanceError(data.details ?? t("bk.page.routeUnresolved"));
          return;
        }
        if (data?.km) setDistance(data);
      } catch (e) {
        console.warn("Distance calc failed", e);
        setDistance(null);
        setDistanceError(t("bk.page.routeFailed"));
      } finally {
        setCalculating(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [pickup, dropoff, pickupPicked, dropoffPicked]);

  const moveType: MoveType = distance?.moveType ?? "local";
  const distanceKm = distance?.km ?? 0;
  const effectiveCrew = crewEnabled ? Math.max(1, crewCount) : 0;
  const vehicleSelection: VehicleSelection = suvSelected ? "suv" : "auto";
  const quote = useMemo(
    () => calculateMovePrice({ items: selectedItems, moveType, distanceKm, crewCount: effectiveCrew, vehicleSelection }),
    [selectedItems, moveType, distanceKm, effectiveCrew, vehicleSelection],
  );

  const itemCount = selectedItems.reduce((s, i) => s + i.quantity, 0);

  const handleBook = async () => {
    if (!user || (itemCount === 0 && !suvSelected) || distanceKm === 0) return;
    setBooking(true);
    try {
      const itemsArr = selectedItems.map((i) => ({
        id: i.id,
        qty: i.quantity,
        floor: i.floor_level ?? 0,
        has_elevator: i.has_elevator ?? true,
      }));
      const scheduledIso = scheduledAt
        ? (() => {
            const [h, m] = scheduledTime.split(":").map((n) => parseInt(n, 10) || 0);
            const d = new Date(scheduledAt);
            d.setHours(h, m, 0, 0);
            return d.toISOString();
          })()
        : null;
      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          pickup_address: pickup,
          dropoff_address: dropoff,
          move_size: moveSizeFromVehicleName(quote.recommendedVehicle),
          move_type: moveType,
          distance_km: distanceKm,
          items: itemsArr,
          crew_count: effectiveCrew,
          vehicle_category: suvSelected ? "suv" : null,
          scheduled_at: scheduledIso,
          pickup_lat: distance?.pickup?.lat ?? null,
          pickup_lng: distance?.pickup?.lng ?? null,
          dropoff_lat: distance?.dropoff?.lat ?? null,
          dropoff_lng: distance?.dropoff?.lng ?? null,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        toast.error(t("bk.page.bookingFailed", { message: error?.message ?? "unknown" }));
        setBooking(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const customerEmail = sessionData.session?.user?.email ?? user.email ?? "";
      if (!accessToken) throw new Error("Missing auth session token for checkout.");

      const { data: payload, error: checkoutError } = await supabase.functions.invoke<{
        clientSecret?: string; publishableKey?: string; error?: string; fallback?: boolean;
      }>(CHECKOUT_FUNCTION, {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { bookingId: inserted.id, amount: Math.round(quote.finalPrice * 100), customerEmail },
      });

      if (checkoutError || !payload?.clientSecret || !payload.publishableKey) {
        toast.error(t("bk.page.checkoutFailed", { message: payload?.error ?? checkoutError?.message ?? "unknown" }));
        setBooking(false);
        return;
      }

      setClientSecret(payload.clientSecret);
      setPublishableKey(payload.publishableKey);
      setCheckoutOpen(true);
      setBooking(false);
    } catch (e) {
      toast.error(t("bk.page.checkoutFailed", { message: e instanceof Error ? e.message : String(e) }));
      setBooking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {t("dashboard.customer.title.bookings")}
        </h1>
      </header>

      <div className="flex-1 space-y-6 p-4 pb-8">

        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("booking.pickup")}</label>
          <PlacesAutocomplete
            value={pickup}
            onChange={(v) => { setPickup(v); setPickupPicked(false); }}
            onSelect={() => setPickupPicked(true)}
            placeholder={t("booking.enterPickup")}
          />
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("booking.dropoff")}</label>
          <PlacesAutocomplete
            value={dropoff}
            onChange={(v) => { setDropoff(v); setDropoffPicked(false); }}
            onSelect={() => setDropoffPicked(true)}
            placeholder={t("booking.enterDropoff")}
          />
        </div>

        {/* Move date — ASAP / Schedule for later */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("bk.page.whenNeeded")}
            </label>
            <span className="text-[10px] text-muted-foreground">{t("bk.page.optional")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setScheduleMode("asap"); setScheduledAt(undefined); }}
              className={cn(
                "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all",
                scheduleMode === "asap"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {t("bk.page.nowAsap")}
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode("later")}
              className={cn(
                "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all",
                scheduleMode === "later"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {t("bk.page.scheduleLater")}
            </button>
          </div>
          {scheduleMode === "later" && (
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 min-w-[180px] justify-start text-left font-normal",
                      !scheduledAt && "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {scheduledAt ? format(scheduledAt, "EEE, MMM d, yyyy") : t("bk.page.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledAt}
                    onSelect={setScheduledAt}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-[120px]"
                disabled={!scheduledAt}
              />
            </div>
          )}
        </div>

        {/* Access type (optional) */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("bk.page.buildingAccess")}
              </label>
              <p className="text-[11px] text-muted-foreground">{t("bk.page.optionalAddIfApplies")}</p>
            </div>
            <Switch checked={floorAccessEnabled} onCheckedChange={setFloorAccessEnabled} />
          </div>
          {floorAccessEnabled && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5 cursor-pointer">
                <Checkbox
                  checked={globalHasElevator}
                  onCheckedChange={(v) => setGlobalHasElevator(v === true)}
                />
                <span className="text-xs font-medium text-foreground">{t("bk.page.elevator")}</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5 cursor-pointer">
                <Checkbox
                  checked={!globalHasElevator}
                  onCheckedChange={(v) => setGlobalHasElevator(!(v === true))}
                />
                <span className="text-xs font-medium text-foreground">{t("bk.page.stairs")}</span>
              </label>
            </div>
          )}
        </div>

        {distance && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("booking.trip")}</p>
            <p className="text-sm font-semibold">{t("bk.page.routeSummary", { km: distanceKm, moveType })}</p>
          </div>
        )}
        {distanceError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {distanceError}
          </div>
        )}

        {/* Extra Large Car / SUV toggle */}
        <div className={`rounded-xl border p-4 ${suvSelected ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CarFront className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{t("bk.page.suvTitle")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("booking.flatSuv", { flat: formatCurrency(50), extra: moveType !== "local" ? t("booking.perKmExtra", { rate: formatCurrency(2) }) : "" })}
                </p>
              </div>
            </div>
            <Switch checked={suvSelected} onCheckedChange={setSuvSelected} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("booking.inventory")}</h2>
          <InventoryPicker selected={selectedItems} onChange={setSelectedItems} />

          {/* Per-item floor + elevator/stairs */}
          {selectedItems.length > 1 && (
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("bk.page.itemAccessTitle")}
              </p>
              {selectedItems.map((it) => {
                const hasElev = it.has_elevator ?? true;
                return (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-[140px] flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {it.item_name} <span className="text-xs text-muted-foreground">× {it.quantity}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={hasElev}
                          onCheckedChange={(v) => updateItemMeta(it.id, { has_elevator: v === true })}
                        />
                        <span className="text-[11px] font-medium text-foreground">{t("bk.page.elevator")}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={!hasElev}
                          onCheckedChange={(v) => updateItemMeta(it.id, { has_elevator: !(v === true) })}
                        />
                        <span className="text-[11px] font-medium text-foreground">{t("bk.page.stairs")}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground">
                {t("bk.page.itemAccessFooter")}
              </p>
            </div>
          )}
        </div>

        <PricingCalculator distanceKm={distanceKm} />


        {/* Additional crew (optional) */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{t("booking.additionalCrew")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("booking.optionalPerson", { amount: formatCurrency(quote.crewMemberFee) })}
                </p>
              </div>
            </div>
            <Switch checked={crewEnabled} onCheckedChange={setCrewEnabled} />
          </div>
          {crewEnabled && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
              <span className="text-sm font-medium">{t("booking.crewMembers")}</span>
              <div className="flex items-center gap-2">
                <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full"
                  onClick={() => setCrewCount((c) => Math.max(1, c - 1))} disabled={crewCount <= 1}>-</Button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{crewCount}</span>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full"
                  onClick={() => setCrewCount((c) => Math.min(6, c + 1))} disabled={crewCount >= 6}>+</Button>
              </div>
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("booking.subtotal")}</span>
            <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("booking.tax")}</span>
            <span className="font-medium">{formatCurrency(quote.taxAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span className="text-cyan-500">{t("booking.totalCad")}</span>
            <span className="text-cyan-500">{formatCurrency(quote.finalPrice)}</span>
          </div>
        </div>

        <Button
          onClick={handleBook}
          disabled={booking || (itemCount === 0 && !suvSelected) || distanceKm === 0 || calculating}
          className="h-12 w-full text-base font-semibold"
        >
          {booking && <Loader2 className="h-4 w-4 animate-spin" />}
          {booking ? t("booking.processing") : t("booking.bookNow", { amount: formatCurrency(quote.finalPrice) })}
        </Button>
      </div>

      <StripeCheckoutModal
        open={checkoutOpen}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        onClose={() => { setCheckoutOpen(false); setClientSecret(null); }}
      />
    </div>
  );
};

export default BookingPage;
