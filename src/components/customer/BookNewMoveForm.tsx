import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, CalendarDays, CarFront, Loader2, MapPin, Navigation, Package, Receipt, Route, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import StripeCheckoutModal from "@/components/booking/StripeCheckoutModal";
import { PlacesAutocomplete } from "@/components/booking/PlacesAutocomplete";
import { InventoryPicker } from "@/components/booking/InventoryPicker";
import { useI18n } from "@/contexts/I18nContext";
import {
  calculateMovePrice,
  type MoveType,
  type SelectedItem,
  type VehicleSelection,
} from "@/lib/movingEngine";

interface Props { onBooked?: () => void; }

interface DistanceResult {
  km: number;
  pickup?: { lat: number; lng: number; province?: string; city?: string };
  dropoff?: { lat: number; lng: number; province?: string; city?: string };
  moveType?: MoveType;
}

const moveSizeFromVehicleName = (name: string): "small" | "medium" | "large" | "xlarge" => {
  if (name.startsWith("Cargo")) return "small";
  if (name.startsWith("12ft")) return "medium";
  if (name.startsWith("16ft")) return "large";
  return "xlarge";
};

const BookNewMoveForm = ({ onBooked }: Props) => {
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [crewEnabled, setCrewEnabled] = useState(false);
  const [crewCount, setCrewCount] = useState(1);
  const [suvSelected, setSuvSelected] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"asap" | "later">("asap");
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [floorAccessEnabled, setFloorAccessEnabled] = useState(false);
  const [globalFloor, setGlobalFloor] = useState<string>("");
  const [globalHasElevator, setGlobalHasElevator] = useState<boolean>(true);

  const updateItemMeta = (id: number, patch: Partial<Pick<SelectedItem, "floor_level" | "has_elevator">>) => {
    setSelectedItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  useEffect(() => {
    if (pickup.trim().length < 5 || dropoff.trim().length < 5) return;
    const t = setTimeout(async () => {
      setCalculating(true);
      try {
        const { data, error } = await supabase.functions.invoke<DistanceResult>(
          "calculate-distance",
          { body: { origin: pickup, destination: dropoff } },
        );
        if (error) throw error;
        if (data?.km) setDistance(data);
      } catch (e) {
        console.warn("Distance calc failed", e);
      } finally {
        setCalculating(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [pickup, dropoff]);

  const moveType: MoveType = distance?.moveType ?? "local";
  const distanceKm = distance?.km ?? 0;
  const effectiveCrew = crewEnabled ? Math.max(1, crewCount) : 0;
  const vehicleSelection: VehicleSelection = suvSelected ? "suv" : "auto";

  const quote = useMemo(
    () => calculateMovePrice({ items: selectedItems, moveType, distanceKm, crewCount: effectiveCrew, vehicleSelection }),
    [selectedItems, moveType, distanceKm, effectiveCrew, vehicleSelection],
  );

  const itemCount = selectedItems.reduce((s, i) => s + i.quantity, 0);
  const canSubmit =
    !!user && (itemCount > 0 || suvSelected) && pickup.trim().length >= 5 &&
    dropoff.trim().length >= 5 && distanceKm > 0 && !submitting;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const itemsArr = selectedItems.map((i) => ({
        id: i.id,
        qty: i.quantity,
        floor: i.floor_level ?? (floorAccessEnabled ? parseInt(globalFloor || "0", 10) : 0),
        has_elevator: i.has_elevator ?? (floorAccessEnabled ? globalHasElevator : true),
      }));

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
        items: itemsArr,
        crew_count: effectiveCrew,
        vehicle_category: suvSelected ? "suv" : null,
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
        clientSecret?: string; publishableKey?: string; error?: string; fallback?: boolean;
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

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    setClientSecret(null);
    // No booking row exists until Stripe webhook fires after successful payment.
    // Closing the modal == cancel; user stays on form. Refresh in case the
    // webhook already created the row from a successful checkout.
    onBooked?.();
  };

  const breakdown = quote.breakdown as Record<string, number | undefined>;

  return (
    <div className="space-y-4">
      {/* Trip status strip (replaces estimated total card) */}
      {(distanceKm > 0 || calculating) && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("booking.route")}
          </span>
          {calculating ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("booking.calculatingDistance")}
            </span>
          ) : (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {distanceKm} km · {moveType}
            </span>
          )}
        </div>
      )}

      {/* Route */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Route className="h-4 w-4" /></div>
            <h3 className="font-semibold">{t("booking.route")}</h3>
          </div>
          <div className="space-y-3 pl-1">
            <div>
              <Label className="text-xs text-muted-foreground"><MapPin className="inline h-3 w-3 mr-1" />{t("booking.pickup")}</Label>
              <div className="mt-1">
                <PlacesAutocomplete value={pickup} onChange={setPickup} placeholder={t("booking.pickupPlaceholder")} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground"><Navigation className="inline h-3 w-3 mr-1" />{t("booking.dropoff")}</Label>
              <div className="mt-1">
                <PlacesAutocomplete value={dropoff} onChange={setDropoff} placeholder={t("booking.dropoffPlaceholder")} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* When (ASAP / Schedule for later) */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><CalendarDays className="h-4 w-4" /></div>
              <div>
                <h3 className="font-semibold">When do you need it?</h3>
                <p className="text-[11px] text-muted-foreground">Now or schedule a future date</p>
              </div>
            </div>
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
              Now / ASAP
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
              Schedule for later
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
                    {scheduledAt ? format(scheduledAt, "EEE, MMM d, yyyy") : "Pick a date"}
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
        </CardContent>
      </Card>

      {/* Recommended vehicle */}
      {(itemCount > 0 || suvSelected) && (
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {suvSelected ? <CarFront className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {suvSelected ? t("booking.selected") : t("booking.recommended")}
              </p>
              <p className="font-semibold">{quote.recommendedVehicle}</p>
              <p className="text-[11px] text-muted-foreground">
                {quote.totalVolumeCuFt.toFixed(0)} ft³ · {quote.totalWeightLbs.toFixed(0)} lb
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Package className="h-4 w-4" /></div>
               <h3 className="font-semibold">{t("booking.inventory")}</h3>
            </div>
             <span className="text-xs text-muted-foreground">{itemCount} {t(itemCount === 1 ? "booking.item" : "booking.items")}</span>
          </div>
          <InventoryPicker
            selected={selectedItems}
            onChange={setSelectedItems}
            suvSelected={suvSelected}
            onSuvChange={setSuvSelected}
          />

          {/* Per-item floor + elevator (only when multiple inventory items added) */}
          {selectedItems.length > 1 && (
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item details (floor & access)
              </p>
              {selectedItems.map((it) => {
                const floor = it.floor_level ?? 0;
                const hasElev = it.has_elevator ?? true;
                return (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <p className="min-w-[140px] flex-1 text-sm font-medium text-foreground">
                      {it.item_name} <span className="text-xs text-muted-foreground">× {it.quantity}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      <label className="text-[11px] text-muted-foreground">Floor</label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={floor}
                        onChange={(e) =>
                          updateItemMeta(it.id, {
                            floor_level: Math.max(0, parseInt(e.target.value || "0", 10) || 0),
                          })
                        }
                        className="h-8 w-16"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[11px] font-medium", hasElev ? "text-primary" : "text-muted-foreground")}>
                        {hasElev ? "Elevator" : "Stairs"}
                      </span>
                      <Switch
                        checked={hasElev}
                        onCheckedChange={(v) => updateItemMeta(it.id, { has_elevator: v })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floor & access (global, optional toggle) */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><ArrowUpDown className="h-4 w-4" /></div>
              <div>
                <h3 className="font-semibold">Floor & access</h3>
                <p className="text-[11px] text-muted-foreground">Optional — add if it applies</p>
              </div>
            </div>
            <Switch checked={floorAccessEnabled} onCheckedChange={setFloorAccessEnabled} />
          </div>
          {floorAccessEnabled && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Floor #</label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={globalFloor}
                  onChange={(e) => setGlobalFloor(e.target.value)}
                  placeholder="0"
                  className="h-9 w-20"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5">
                <span className={cn("text-xs font-medium", globalHasElevator ? "text-primary" : "text-muted-foreground")}>
                  {globalHasElevator ? "Elevator" : "Stairs"}
                </span>
                <Switch checked={globalHasElevator} onCheckedChange={setGlobalHasElevator} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional crew (optional) */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Users className="h-4 w-4" /></div>
              <div>
                <h3 className="font-semibold">{t("booking.additionalCrew")}</h3>
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
                  onClick={() => setCrewCount((c) => Math.max(1, c - 1))} disabled={crewCount <= 1}>
                  -
                </Button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{crewCount}</span>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full"
                  onClick={() => setCrewCount((c) => Math.min(6, c + 1))} disabled={crewCount >= 6}>
                  +
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Receipt className="h-4 w-4" /></div>
             <h3 className="font-semibold">{t("booking.priceBreakdown")}</h3>
          </div>
          {quote.isFlatRate ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("booking.suvFlatRate")}</span>
                <span>{formatCurrency(Number(breakdown.flatRate ?? 0))}</span>
              </div>
              {moveType !== "local" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("booking.distance")} ({distanceKm} km × {formatCurrency(Number(breakdown.ratePerKm ?? 0))}/km)
                  </span>
                  <span>{formatCurrency(Number(breakdown.serviceCost ?? 0) - Number(breakdown.flatRate ?? 0))}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {moveType === "local" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("booking.volume")} ({quote.totalVolumeCuFt.toFixed(0)} ft³ × {formatCurrency(Number(breakdown.ratePerCuFt ?? 0))}/ft³)
                  </span>
                  <span>{formatCurrency(quote.servicePrice)}</span>
                </div>
              )}
              {moveType === "intercity" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("booking.distance")} ({distanceKm} km × {formatCurrency(Number(breakdown.ratePerKm ?? 0))}/km)
                  </span>
                  <span>{formatCurrency(quote.servicePrice)}</span>
                </div>
              )}
              {moveType === "inter-province" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("booking.weight")} ({quote.totalWeightLbs.toFixed(0)} lb × {formatCurrency(Number(breakdown.ratePerLb ?? 0))}/lb)
                  </span>
                  <span>{formatCurrency(quote.servicePrice)}</span>
                </div>
              )}
            </>
          )}
          {effectiveCrew > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("booking.additionalCrew")} ({effectiveCrew} × {formatCurrency(quote.crewMemberFee)})
              </span>
              <span>{formatCurrency(quote.crewCost)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span className="text-cyan-500">{t("common.total")}</span><span className="text-cyan-500">{formatCurrency(quote.finalPrice)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="h-12 w-full text-base font-semibold">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? t("booking.preparingCheckout") : t("booking.bookNow", { amount: formatCurrency(quote.finalPrice) })}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {t("booking.paymentNote")}
        </p>
      </div>

      <StripeCheckoutModal
        open={checkoutOpen}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        onClose={handleCheckoutClose}
      />
    </div>
  );
};

export default BookNewMoveForm;
