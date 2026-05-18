import { useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AddressInput from "@/components/booking/AddressInput";
import MoveSizeSelector, { type MoveSize } from "@/components/booking/MoveSizeSelector";
import PriceQuote from "@/components/booking/PriceQuote";
import StripeCheckoutModal from "@/components/booking/StripeCheckoutModal";

const CHECKOUT_FUNCTION = "stripe_checkout";

type CheckoutPayload = {
  clientSecret?: string;
  publishableKey?: string;
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
  if (typeof payload.clientSecret !== "string" || !payload.clientSecret.trim()) return "Checkout response did not include a Stripe client secret.";
  return "Checkout failed.";
};

const sizeData = [
  { id: "small", basePrice: 89 },
  { id: "medium", basePrice: 199 },
  { id: "large", basePrice: 349 },
  { id: "xlarge", basePrice: 599 },
] as const;

const BookingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [moveSize, setMoveSize] = useState<MoveSize | null>(null);
  const [booking, setBooking] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  const getPricing = () => {
    const size = moveSize ? sizeData.find((s) => s.id === moveSize) : null;
    if (!size) return { base: 0, distance: 25, service: 0, total: 0 };
    const base = size.basePrice;
    const distance = 25;
    const service = Math.round(base * 0.1);
    return { base, distance, service, total: base + distance + service };
  };

  const handleBook = async () => {
    if (!user || !moveSize) return;
    setBooking(true);

    try {
      const { base, distance, service, total } = getPricing();

      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          pickup_address: pickup,
          dropoff_address: dropoff,
          move_size: moveSize,
          base_price: base,
          distance_fee: distance,
          service_fee: service,
          total_price: total,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        console.error("[Booking] ❌ Insert failed:", error);
        toast.error("Booking failed: " + (error?.message ?? "unknown error"));
        setBooking(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const customerEmail = sessionData.session?.user?.email ?? user.email ?? "";
      if (!accessToken) throw new Error("Missing auth session token for checkout.");
      if (!customerEmail) throw new Error("Missing customer email for checkout.");

      const requestBody = { bookingId: inserted.id, amount: Math.round(total * 100), customerEmail };

      let payload: CheckoutPayload | null = null;
      let checkoutError: Error | null = null;
      try {
        const result = await supabase.functions.invoke<CheckoutPayload>(CHECKOUT_FUNCTION, {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: requestBody,
        });
        payload = result.data ?? null;
        checkoutError = result.error ?? null;
      } catch (invokeError) {
        checkoutError = invokeError instanceof Error ? invokeError : new Error(String(invokeError));
      }

      if (
        checkoutError ||
        payload?.fallback ||
        typeof payload?.clientSecret !== "string" ||
        !payload.clientSecret.trim() ||
        typeof payload?.publishableKey !== "string" ||
        !payload.publishableKey.trim()
      ) {
        const reason = getCheckoutErrorMessage(payload, checkoutError);
        console.error("[Stripe] ❌ Invalid checkout response:", reason, payload);
        toast.error("Could not start checkout: " + reason);
        setBooking(false);
        return;
      }

      setClientSecret(payload.clientSecret);
      setPublishableKey(payload.publishableKey);
      setCheckoutOpen(true);
      setBooking(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout error";
      console.error("[Booking] ❌ Booking/checkout pipeline failed:", e);
      toast.error("Could not start checkout: " + msg);
      setBooking(false);
    }
  };

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setClientSecret(null);
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
          <button className="ml-auto text-xs font-semibold text-primary">Schedule</button>
        </div>

        <div className="space-y-4">
          <AddressInput label="Pickup" placeholder="Enter pickup address" value={pickup} onChange={setPickup} icon="pickup" />
          <div className="ml-5 border-l-2 border-dashed border-border h-4" />
          <AddressInput label="Drop-off" placeholder="Enter drop-off address" value={dropoff} onChange={setDropoff} icon="dropoff" />
        </div>

        <MoveSizeSelector selected={moveSize} onSelect={setMoveSize} />

        <PriceQuote
          moveSize={moveSize}
          hasPickup={pickup.trim().length > 0}
          hasDropoff={dropoff.trim().length > 0}
          onBook={handleBook}
          isBooking={booking}
        />
      </div>
      </div>

      <StripeCheckoutModal
        open={checkoutOpen}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        onClose={handleCloseCheckout}
      />
    </div>
  );
};

export default BookingPage;
