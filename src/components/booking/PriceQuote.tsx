import { Zap, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoveSize } from "./MoveSizeSelector";
import { MOVE_SIZES } from "./MoveSizeSelector";

interface PriceQuoteProps {
  moveSize: MoveSize | null;
  hasPickup: boolean;
  hasDropoff: boolean;
  onBook: () => void;
}

const PriceQuote = ({ moveSize, hasPickup, hasDropoff, onBook }: PriceQuoteProps) => {
  const isReady = moveSize && hasPickup && hasDropoff;
  const sizeData = MOVE_SIZES.find((s) => s.id === moveSize);
  const basePrice = sizeData?.basePrice ?? 0;
  const distanceFee = hasPickup && hasDropoff ? 25 : 0;
  const serviceFee = Math.round(basePrice * 0.1);
  const total = basePrice + distanceFee + serviceFee;

  if (!isReady) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Fill in addresses and select move size to see your quote
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Your Quote</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{sizeData?.label} move</span>
          <span className="font-medium text-foreground">${basePrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Distance fee</span>
          <span className="font-medium text-foreground">${distanceFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service fee</span>
          <span className="font-medium text-foreground">${serviceFee.toFixed(2)}</span>
        </div>
        <div className="my-2 border-t border-border" />
        <div className="flex justify-between text-base">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-bold text-primary">${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~45 min ETA</span>
        <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Insured</span>
      </div>

      <Button onClick={onBook} className="h-12 w-full rounded-xl text-sm font-semibold">
        Book Now — ${total.toFixed(2)}
      </Button>
    </div>
  );
};

export default PriceQuote;
