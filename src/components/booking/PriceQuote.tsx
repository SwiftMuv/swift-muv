import { Zap, Clock, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import type { MoveSize } from "./MoveSizeSelector";
import { MOVE_SIZES } from "./MoveSizeSelector";

interface PriceQuoteProps {
  moveSize: MoveSize | null;
  hasPickup: boolean;
  hasDropoff: boolean;
  onBook: () => void;
  isBooking?: boolean;
}

const PriceQuote = ({ moveSize, hasPickup, hasDropoff, onBook, isBooking = false }: PriceQuoteProps) => {
  const { t, formatCurrency } = useI18n();
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
          {t("booking.fillQuote")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">{t("booking.yourQuote")}</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{sizeData?.label} move</span>
          <span className="font-medium text-foreground">{formatCurrency(basePrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("booking.distanceFee")}</span>
          <span className="font-medium text-foreground">{formatCurrency(distanceFee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("booking.serviceFee")}</span>
          <span className="font-medium text-foreground">{formatCurrency(serviceFee)}</span>
        </div>
        <div className="my-2 border-t border-border" />
        <div className="flex justify-between text-base">
          <span className="font-semibold text-foreground">{t("common.total")}</span>
          <span className="font-bold text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~45 min ETA</span>
        <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Insured</span>
      </div>

      <Button onClick={onBook} disabled={isBooking} className="h-12 w-full rounded-xl text-sm font-semibold">
        {isBooking && <Loader2 className="h-4 w-4 animate-spin" />}
        {isBooking ? t("booking.processingCheckout") : t("booking.bookNow", { amount: formatCurrency(total) })}
      </Button>
    </div>
  );
};

export default PriceQuote;
