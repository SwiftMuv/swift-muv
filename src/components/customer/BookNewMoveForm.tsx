import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Navigation, Package, Receipt, Sparkles, Clock, Minus, Plus, Route, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { closeReservedCheckoutWindow, openStripeCheckout, reserveStripeCheckoutWindow } from "@/lib/checkoutRedirect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Item = { id: string; name: string; volume: number };

const CHECKOUT_FUNCTION = "stripe_checkout";

type CheckoutPayload = {
  url?: unknown;
  sessionId?: string;
  error?: string;
  fallback?: boolean;
  details?: string;
};

const getCheckoutErrorMessage = (payload: CheckoutPayload | null | undefined, invokeError?: Error | null) => {
  if (invokeError?.message) return invokeError.message;
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload?.details === "string" && payload.details.trim()) return payload.details;
  if (!payload) return "Checkout returned an empty response.";
  if (typeof payload.url !== "string" || !payload.url.trim()) return "Checkout response did not include a Stripe URL.";
  return "Checkout failed.";
};

const ITEMS: Item[] = [
  { id: "sofa", name: "Sofa", volume: 35 },
  { id: "queen_bed", name: "Queen Bed", volume: 45 },
  { id: "dining_table", name: "Dining Table", volume: 30 },
  { id: "dresser", name: "Dresser", volume: 25 },
  { id: "wardrobe", name: "Wardrobe", volume: 40 },
  { id: "fridge", name: "Refrigerator", volume: 30 },
  { id: "washer", name: "Washer / Dryer", volume: 20 },
  { id: "tv", name: "TV", volume: 8 },
  { id: "box", name: "Moving Box", volume: 3 },
];

const BASE_RATE = 50;
const PER_KM = 2;
const PER_VOLUME = 5;
const PEAK_MULTIPLIER = 1.2;

const moveSizeFor = (vol: number): "small" | "medium" | "large" | "xlarge" => {
  if (vol < 50) return "small";
  if (vol < 150) return "medium";
  if (vol < 300) return "large";
  return "xlarge";
};

interface Props {
  onBooked?: () => void;
}

const BookNewMoveForm = ({ onBooked }: Props) => {
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [distanceKm, setDistanceKm] = useState<number>(10);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("09:00");
  const [submitting, setSubmitting] = useState(false);

  const setQty = (id: string, delta: number) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));

  const scheduledAt = useMemo(() => {
    if (!date) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }, [date, time]);

  const isWeekend = scheduledAt
    ? [0, 6].includes(scheduledAt.getDay())
    : false;

  const totalVolume = useMemo(
    () =>
      ITEMS.reduce((sum, it) => sum + (quantities[it.id] ?? 0) * it.volume, 0),
    [quantities],
  );

  const pricing = useMemo(() => {
    const base = BASE_RATE;
    const distance = distanceKm * PER_KM;
    const volume = totalVolume * PER_VOLUME;
    let subtotal = base + distance + volume;
    if (isWeekend) subtotal = subtotal * PEAK_MULTIPLIER;
    const service = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round((subtotal + service) * 100) / 100;
    return { base, distance, volume, service, total };
  }, [distanceKm, totalVolume, isWeekend]);

  const selectedItems = ITEMS.filter((i) => (quantities[i.id] ?? 0) > 0).map(
    (i) => ({ id: i.id, name: i.name, qty: quantities[i.id], volume: i.volume }),
  );

  const futureValid = scheduledAt ? scheduledAt.getTime() > Date.now() : false;

  const bookingSchema = z.object({
    pickup: z.string().trim().min(5, "Pickup address must be at least 5 characters").max(200),
    dropoff: z.string().trim().min(5, "Drop-off address must be at least 5 characters").max(200),
    distanceKm: z.number().min(1, "Distance must be at least 1 km").max(2000),
    itemCount: z.number().min(1, "Select at least one item to move"),
    scheduledAt: z
      .date({ required_error: "Pick a date and time" })
      .refine((d) => d.getTime() > Date.now() + 60_000, "Scheduled time must be in the future"),
  });

  const handleSubmit = async () => {
    const reservedCheckoutWindow = reserveStripeCheckoutWindow();

    try {
      // ---- Form validation ----
      if (!user) {
        toast.error("You must be signed in to book a move.");
        return;
      }
      if (pickup.trim().length < 5) { toast.error("Enter a pickup address (min 5 chars)."); return; }
      if (dropoff.trim().length < 5) { toast.error("Enter a drop-off address (min 5 chars)."); return; }
      if (selectedItems.length === 0) { toast.error("Select at least one item to move."); return; }
      if (scheduledAt && !futureValid) { toast.error("Scheduled time must be in the future."); return; }

      const isInstant = !scheduledAt;
      const effectiveScheduledAt = scheduledAt ?? new Date();

      setSubmitting(true);

      // ---- Step 1: insert booking ----
      console.log("[Booking] Inserting booking for customer:", user.id);
      toast.info("Creating booking…");
      const { data: inserted, error: insertError } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          pickup_address: pickup.trim(),
          dropoff_address: dropoff.trim(),
          move_size: moveSizeFor(totalVolume),
          base_price: pricing.base,
          distance_fee: pricing.distance,
          service_fee: pricing.service,
          total_price: pricing.total,
          scheduled_at: effectiveScheduledAt.toISOString(),
          items_summary: { items: selectedItems, total_volume: totalVolume, peak: isWeekend, instant: isInstant },
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("[Booking] ❌ Insert failed:", insertError);
        toast.error("Booking failed: " + (insertError?.message ?? "unknown error"));
        setSubmitting(false);
        return;
      }

      console.log("[Booking] ✅ Inserted booking:", inserted);
      toast.success(isInstant ? "Instant booking confirmed!" : "Booking confirmed!", {
        description: isInstant
          ? "Dispatching a driver now. Redirecting to payment…"
          : `Scheduled for ${format(effectiveScheduledAt, "PPP 'at' p")}. Redirecting to payment…`,
      });
      onBooked?.();

      // ---- Step 2: call Stripe edge function ----
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("[Stripe] getSession error:", sessionError);
        toast.error("Auth session error: " + sessionError.message);
        setSubmitting(false);
        return;
      }
      const accessToken = sessionData.session?.access_token;
      const customerEmail = sessionData.session?.user?.email ?? user.email ?? "";
      if (!accessToken) {
        throw new Error("Missing auth session token for checkout.");
      }
      if (!customerEmail) {
        throw new Error("Missing customer email for checkout.");
      }
      const requestBody = {
        bookingId: inserted.id,
        amount: Math.round(pricing.total * 100),
        customerEmail,
      };
      console.log("[Stripe] invoke →", CHECKOUT_FUNCTION, requestBody);
      toast.info("Contacting Stripe…", { description: `Booking ${inserted.id.slice(0, 8)}…` });

      let payload: CheckoutPayload | null = null;
      let checkoutError: Error | null = null;
      try {
        const result = await supabase.functions.invoke<CheckoutPayload>(CHECKOUT_FUNCTION, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: requestBody,
        });
        payload = result.data ?? null;
        checkoutError = result.error ?? null;
      } catch (invokeError) {
        checkoutError = invokeError instanceof Error ? invokeError : new Error(String(invokeError));
      }

      console.log("[Stripe] Edge function payload:", payload);

      if (checkoutError || payload?.fallback || typeof payload?.url !== "string" || !payload.url.trim()) {
        const reason = getCheckoutErrorMessage(payload, checkoutError);
        console.error("[Stripe] ❌ Invalid checkout response:", reason, payload);
        closeReservedCheckoutWindow(reservedCheckoutWindow);
        toast.error("Could not start checkout: " + reason);
        setSubmitting(false);
        return;
      }

      try {
        console.log("[Stripe] ✅ Got checkout URL, redirecting →", payload.url);
        const redirectMode = openStripeCheckout(payload.url, reservedCheckoutWindow);
        toast.success(redirectMode === "opened" ? "Stripe checkout opened in a new tab." : "Redirecting to Stripe…");
        if (redirectMode === "opened") setSubmitting(false);
      } catch (redirectError) {
        const reason = redirectError instanceof Error ? redirectError.message : String(redirectError);
        console.error("[Stripe] ❌ Redirect failed:", redirectError);
        closeReservedCheckoutWindow(reservedCheckoutWindow);
        toast.error("Could not redirect to Stripe: " + reason);
        setSubmitting(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[Booking] ❌ Unexpected error in handleSubmit:", e);
      closeReservedCheckoutWindow(reservedCheckoutWindow);
      toast.error("Unexpected error: " + msg);
      setSubmitting(false);
    }
  };

  const itemCount = selectedItems.reduce((s, i) => s + i.qty, 0);
  const moveSize = moveSizeFor(totalVolume);
  const sizeLabel: Record<string, string> = {
    small: "Small move",
    medium: "Medium move",
    large: "Large move",
    xlarge: "XL move",
  };

  return (
    <div className="space-y-4">
      {/* Hero summary */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <CardContent className="relative p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {date ? "Scheduled move" : "Instant booking"}
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ${pricing.total.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""} · ${sizeLabel[moveSize]}` : "Add items to get an estimate"}
              </p>
            </div>
            <div className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {distanceKm} km
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Route className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-foreground">Route</h3>
          </div>

          <div className="relative space-y-3 pl-7">
            <span className="absolute left-2.5 top-5 h-[calc(100%-2.5rem)] w-px border-l-2 border-dashed border-border" />
            <div className="relative">
              <span className="absolute -left-7 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MapPin className="h-3 w-3" />
              </span>
              <Label className="text-xs text-muted-foreground">Pickup</Label>
              <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="123 Main St" className="mt-1" />
            </div>
            <div className="relative">
              <span className="absolute -left-7 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Navigation className="h-3 w-3" />
              </span>
              <Label className="text-xs text-muted-foreground">Drop-off</Label>
              <Input value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="456 Oak Ave" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Estimated distance (km)</Label>
            <Input
              type="number"
              min={1}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value) || 0))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-foreground">Items</h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{totalVolume} cu ft</span>
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {ITEMS.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <div key={item.id} className={cn("flex items-center justify-between gap-2 px-3 py-2.5 transition-colors", qty > 0 && "bg-primary/5")}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">~{item.volume} cu ft</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setQty(item.id, -1)} disabled={qty === 0}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums">{qty}</span>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setQty(item.id, +1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-foreground">When</h3>
            </div>
            {date && (
              <button type="button" onClick={() => setDate(undefined)} className="text-xs font-medium text-primary hover:underline">
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty to book instantly — we'll dispatch a driver right now.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PP") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
          </div>
          {date && !futureValid && (
            <p className="text-xs text-destructive">Please choose a future date and time.</p>
          )}
        </CardContent>
      </Card>

      {/* Price breakdown */}
      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-foreground">Price breakdown</h3>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Base rate</span><span>${pricing.base.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Distance ({distanceKm} km)</span><span>${pricing.distance.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Volume ({totalVolume} cu ft)</span><span>${(totalVolume * PER_VOLUME).toFixed(2)}</span></div>
          {isWeekend && <div className="flex justify-between text-primary"><span>Weekend peak ×{PEAK_MULTIPLIER}</span><span>applied</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>${pricing.service.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span className="text-primary">${pricing.total.toFixed(2)}</span></div>
        </CardContent>
      </Card>

      {/* Sticky CTA */}
      <div className="sticky bottom-20 z-30 -mx-4 border-t border-border bg-card/90 px-4 py-3 backdrop-blur-xl">
        <Button onClick={handleSubmit} disabled={submitting || !user} className="h-12 w-full text-base font-semibold">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Processing checkout…" : date ? `Schedule Move · $${pricing.total.toFixed(2)}` : `Book Instantly · $${pricing.total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
};

export default BookNewMoveForm;
