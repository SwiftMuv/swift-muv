import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Navigation, Package, Receipt, Route, Truck, Users, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StripeCheckoutModal from "@/components/booking/StripeCheckoutModal";
import { VehicleCategoryPicker } from "@/components/booking/VehicleCategoryPicker";
import { ItemsPicker, calcItemsTotal } from "@/components/booking/ItemsPicker";
import {
  calculatePrice,
  FLOORS,
  moveSizeFromVehicle,
  type VehicleCategory,
} from "@/lib/booking";

interface Props { onBooked?: () => void; }

const BookNewMoveForm = ({ onBooked }: Props) => {
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [vehicle, setVehicle] = useState<VehicleCategory | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [floorLevel, setFloorLevel] = useState(0);
  const [hasElevator, setHasElevator] = useState(true);
  const [crewCount, setCrewCount] = useState(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  const itemsTotal = useMemo(() => calcItemsTotal(quantities), [quantities]);

  const pricing = useMemo(
    () => calculatePrice({ itemsTotal, distanceKm: distanceKm ?? 0, crewCount, floorLevel, hasElevator }),
    [itemsTotal, distanceKm, crewCount, floorLevel, hasElevator],
  );

  // Auto-compute distance when both addresses entered
  useEffect(() => {
    if (pickup.trim().length < 5 || dropoff.trim().length < 5) return;
    const t = setTimeout(async () => {
      setCalculatingDistance(true);
      try {
        const { data, error } = await supabase.functions.invoke("calculate-distance", {
          body: { origin: pickup, destination: dropoff },
        });
        if (error) throw error;
        if (data?.km) {
          setDistanceKm(data.km);
          if (data.pickup) setPickupCoords(data.pickup);
          if (data.dropoff) setDropoffCoords(data.dropoff);
        }
      } catch (e) {
        console.warn("Distance calc failed", e);
      } finally {
        setCalculatingDistance(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [pickup, dropoff]);

  const itemCount = Object.values(quantities).reduce((s, n) => s + n, 0);

  const canSubmit =
    !!user && !!vehicle && itemCount > 0 && pickup.trim().length >= 5 &&
    dropoff.trim().length >= 5 && (distanceKm ?? 0) > 0 && !submitting;

  const handleSubmit = async () => {
    if (!user || !vehicle) return;
    setSubmitting(true);
    try {
      const itemsArr = Object.entries(quantities)
        .filter(([, n]) => n > 0)
        .map(([id, qty]) => ({ id, qty }));

      const { data: inserted, error: insertError } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          pickup_address: pickup.trim(),
          dropoff_address: dropoff.trim(),
          move_size: moveSizeFromVehicle(vehicle),
          vehicle_category: vehicle,
          distance_km: distanceKm ?? 0,
          floor_level: floorLevel,
          has_elevator: hasElevator,
          crew_count: crewCount,
          items: itemsArr,
          base_price: pricing.items,
          distance_fee: pricing.distance,
          service_fee: pricing.service,
          total_price: pricing.total,
          pickup_lat: pickupCoords?.lat ?? null,
          pickup_lng: pickupCoords?.lng ?? null,
          dropoff_lat: dropoffCoords?.lat ?? null,
          dropoff_lng: dropoffCoords?.lng ?? null,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        toast.error("Booking failed: " + (insertError?.message ?? "unknown"));
        setSubmitting(false);
        return;
      }
      onBooked?.();

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Missing auth token");

      const { data: payload, error: checkoutError } = await supabase.functions.invoke<{
        clientSecret?: string; publishableKey?: string; error?: string; fallback?: boolean;
      }>("stripe_checkout", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { bookingId: inserted.id },
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
    <div className="space-y-4">
      {/* Hero quote */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card">
        <CardContent className="relative p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Estimated total</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ${pricing.total.toFixed(2)}
            </p>
            {distanceKm !== null && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                {distanceKm} km
              </span>
            )}
          </div>
          {calculatingDistance && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> calculating distance…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Route */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Route className="h-4 w-4" /></div>
            <h3 className="font-semibold">Route</h3>
          </div>
          <div className="space-y-3 pl-1">
            <div>
              <Label className="text-xs text-muted-foreground"><MapPin className="inline h-3 w-3 mr-1" />Pickup</Label>
              <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Pickup address" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground"><Navigation className="inline h-3 w-3 mr-1" />Drop-off</Label>
              <Input value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Drop-off address" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Truck className="h-4 w-4" /></div>
            <h3 className="font-semibold">Vehicle type</h3>
          </div>
          <VehicleCategoryPicker value={vehicle} onChange={setVehicle} />
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Package className="h-4 w-4" /></div>
              <h3 className="font-semibold">Items</h3>
            </div>
            <span className="text-xs text-muted-foreground">${itemsTotal.toFixed(2)}</span>
          </div>
          <ItemsPicker quantities={quantities} onChange={setQuantities} />
        </CardContent>
      </Card>

      {/* Logistics: floor, elevator, crew */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><ArrowUpDown className="h-4 w-4" /></div>
            <h3 className="font-semibold">Access</h3>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Which floor are the items on?</Label>
            <Select value={String(floorLevel)} onValueChange={(v) => setFloorLevel(parseInt(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FLOORS.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Elevator available?</p>
              <p className="text-[11px] text-muted-foreground">If no, +$10 per floor above ground</p>
            </div>
            <Switch checked={hasElevator} onCheckedChange={setHasElevator} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Need crew members?</Label>
            <p className="text-[11px] text-muted-foreground mb-1">+$10 per member</p>
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" variant="outline" onClick={() => setCrewCount(Math.max(0, crewCount - 1))} disabled={crewCount === 0}>−</Button>
              <span className="min-w-[40px] text-center font-semibold tabular-nums">{crewCount}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setCrewCount(crewCount + 1)}>+</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Receipt className="h-4 w-4" /></div>
            <h3 className="font-semibold">Price breakdown</h3>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Base fee</span><span>${pricing.base.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>${pricing.items.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Distance fee</span><span>${pricing.distance.toFixed(2)}</span></div>
          {pricing.crew > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Crew ({crewCount})</span><span>${pricing.crew.toFixed(2)}</span></div>}
          {pricing.floor > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Floor surcharge</span><span>${pricing.floor.toFixed(2)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>${pricing.service.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span><span className="text-primary">${pricing.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="h-12 w-full text-base font-semibold">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Processing…" : `Book Now · $${pricing.total.toFixed(2)}`}
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

export default BookNewMoveForm;
