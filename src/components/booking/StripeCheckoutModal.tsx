import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X } from "lucide-react";

interface StripeCheckoutModalProps {
  open: boolean;
  clientSecret: string | null;
  publishableKey: string | null;
  onClose: () => void;
}

const stripeCache = new Map<string, Promise<Stripe | null>>();
const getStripe = (key: string) => {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key)!;
};

const StripeCheckoutModal = ({ open, clientSecret, publishableKey, onClose }: StripeCheckoutModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  const stripePromise = useMemo(() => (publishableKey ? getStripe(publishableKey) : null), [publishableKey]);

  if (!open || !clientSecret || !stripePromise) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center">
      <div className="relative flex h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:h-[85vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Complete payment
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-secondary/80"
            aria-label="Close checkout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mounted && (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
