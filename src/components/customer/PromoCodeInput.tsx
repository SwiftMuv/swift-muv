import { useState } from "react";
import { Tag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface AppliedPromo {
  code: string;
  discount: number;
}

interface Props {
  subtotal: number;
  applied: AppliedPromo | null;
  onApply: (promo: AppliedPromo | null) => void;
}

const PromoCodeInput = ({ subtotal, applied, onApply }: Props) => {
  const { t, formatCurrency } = useI18n();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc("validate_promo_code", {
        _code: trimmed,
        _subtotal: subtotal,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.valid) {
        toast.error(row?.message && row.message !== "OK" ? row.message : t("promo.invalid"));
        return;
      }
      onApply({ code: trimmed.toUpperCase(), discount: Number(row.discount) });
      toast.success(t("promo.applied", { amount: formatCurrency(Number(row.discount)) }));
    } catch {
      toast.error(t("promo.invalid"));
    } finally {
      setChecking(false);
    }
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Tag className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">{applied.code}</span>
          <span className="text-muted-foreground">−{formatCurrency(applied.discount)}</span>
        </div>
        <button
          type="button"
          onClick={() => { onApply(null); setCode(""); }}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("promo.remove")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("promo.placeholder")}
        className="h-9 text-sm uppercase"
        maxLength={20}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0"
        disabled={checking || !code.trim()}
        onClick={handleApply}
      >
        <Tag className="w-3.5 h-3.5 mr-1.5" />
        {checking ? "…" : t("promo.apply")}
      </Button>
    </div>
  );
};

export default PromoCodeInput;
