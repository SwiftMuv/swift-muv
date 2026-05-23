import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Loader2, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PlacesAutocomplete } from "@/components/booking/PlacesAutocomplete";
import { InventoryPicker } from "@/components/booking/InventoryPicker";
import StripeCheckoutModal from "@/components/booking/StripeCheckoutModal";
import { Button } from "@/components/ui/button";
import { calculateMovePrice, type MoveType, type SelectedItem } from "@/lib/movingEngine";

const CHECKOUT_FUNCTION = "stripe_checkout";

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

const BookingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

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
  const quote = useMemo(
    () => calculateMovePrice({ items: selectedItems, moveType, distanceKm }),
    [selectedItems, moveType, distanceKm],
  );

  const itemCount = selectedItems.reduce((s, i) => s + i.quantity, 0);

  const handleBook = async () => {
    if (!user || itemCount === 0 || distanceKm === 0) return;
    setBooking(true);
    try {
      const itemsArr = selectedItems.map((i) => ({ id: i.id, qty: i.quantity }));
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
          pickup_lat: distance?.pickup?.lat ?? null,
          pickup_lng: distance?.pickup?.lng ?? null,
          dropoff_lat: distance?.dropoff?.lat ?? null,
          dropoff_lng: distance?.dropoff?.lng ?? null,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        toast.error("Booking failed: " + (error?.message ?? "unknown"));
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
        toast.error("Could not start checkout: " + (payload?.error ?? checkoutError?.message ?? "unknown"));
        setBooking(false);
        return;
      }

      setClientSecret(payload.clientSecret);
      setPublishableKey(payload.publishableKey);
      setCheckoutOpen(true);
      setBooking(false);
    } catch (e) {
      toast.error("Could not start checkout: " + (e instanceof Error ? e.message : String(e)));
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
          Book a Move
        </h1>
      </header>

      <div className="flex-1 space-y-6 p-4 pb-8">
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2.5">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Today, ASAP</span>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pickup</label>
          <PlacesAutocomplete value={pickup} onChange={setPickup} placeholder="Enter pickup address" />
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Drop-off</label>
          <PlacesAutocomplete value={dropoff} onChange={setDropoff} placeholder="Enter drop-off address" />
        </div>

        {distance && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Trip</p>
            <p className="text-sm font-semibold">{distanceKm} km · {moveType}</p>
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Inventory</h2>
          <InventoryPicker selected={selectedItems} onChange={setSelectedItems} />
        </div>

        {itemCount > 0 && (
          <div className="rounded-xl border border-primary/20 bg-card p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Recommended</p>
                <p className="font-semibold">{quote.recommendedVehicle}</p>
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-primary">${quote.finalPrice.toFixed(2)} CAD</p>
          </div>
        )}

        <Button
          onClick={handleBook}
          disabled={booking || itemCount === 0 || distanceKm === 0 || calculating}
          className="h-12 w-full text-base font-semibold"
        >
          {booking && <Loader2 className="h-4 w-4 animate-spin" />}
          {booking ? "Processing…" : `Book Now · $${quote.finalPrice.toFixed(2)}`}
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
