import { useMemo, useState } from "react";
import { Car, Truck, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

export type VehicleTier = "suv" | "large" | "xlarge";

interface TierDef {
  id: VehicleTier;
  label: string;
  sub: string;
  icon: typeof Car;
  baseFee: number;
  perKm: number;
}

// Baseline SUV: $20 base / $2 per km.
// Large: base +40%, rate +30% from SUV.
// Extra Large: base +40%, rate +30% from Large.
const SUV_BASE = 20;
const SUV_RATE = 2;
const LARGE_BASE = SUV_BASE * 1.4;     // 28.00
const LARGE_RATE = SUV_RATE * 1.3;     // 2.60
const XL_BASE = LARGE_BASE * 1.4;      // 39.20
const XL_RATE = LARGE_RATE * 1.3;      // 3.38

export const TIERS: TierDef[] = [
  { id: "suv",    label: "SUV",         sub: "Bags & small loads",   icon: Car,         baseFee: SUV_BASE,   perKm: SUV_RATE },
  { id: "large",  label: "Large",       sub: "Pickup / Box van",     icon: PackageOpen, baseFee: LARGE_BASE, perKm: LARGE_RATE },
  { id: "xlarge", label: "Extra Large", sub: "Moving truck",         icon: Truck,       baseFee: XL_BASE,    perKm: XL_RATE },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Props {
  /** Optional: provide distance from parent (e.g. calculated route). */
  distanceKm?: number;
  /** Optional: notify parent of tier + price changes. */
  onChange?: (info: { tier: VehicleTier; baseFee: number; perKm: number; distanceKm: number; total: number }) => void;
}

export const PricingCalculator = ({ distanceKm: externalKm, onChange }: Props) => {
  const { formatCurrency } = useI18n();
  const [tier, setTier] = useState<VehicleTier>("suv");
  const [localKm, setLocalKm] = useState<string>("");

  const km = useMemo(() => {
    if (typeof externalKm === "number" && externalKm > 0) return externalKm;
    const parsed = parseFloat(localKm);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [externalKm, localKm]);

  const tierDef = TIERS.find((t) => t.id === tier)!;
  const baseFee = round2(tierDef.baseFee);
  const distanceFee = round2(tierDef.perKm * km);
  const total = round2(baseFee + distanceFee);

  useMemo(() => {
    onChange?.({ tier, baseFee, perKm: tierDef.perKm, distanceKm: km, total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, km]);

  return (
    <div className="space-y-4 rounded-2xl border-2 border-[#0F172A] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF5722]">SwiftMuv</p>
          <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Price Calculator
          </h3>
        </div>
      </div>

      {/* Tier selector */}
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t) => {
          const Icon = t.icon;
          const active = tier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all",
                active
                  ? "border-[#FF5722] bg-[#FF5722]/10 shadow-[0_0_0_3px_rgba(255,87,34,0.2)]"
                  : "border-slate-700 bg-slate-800/60 hover:border-[#FF5722]/40",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-[#FF5722]" : "text-slate-300")} />
              <span className={cn("text-[11px] font-bold leading-tight", active ? "text-white" : "text-slate-200")}>
                {t.label}
              </span>
              <span className="text-[9px] leading-tight text-slate-400">{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Distance input (only when not driven by parent) */}
      {typeof externalKm !== "number" || externalKm <= 0 ? (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
            Distance (km)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={localKm}
            onChange={(e) => setLocalKm(e.target.value)}
            placeholder="e.g. 12.5"
            className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus-visible:ring-[#FF5722]"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
          Distance: <span className="font-bold text-white">{km.toFixed(2)} km</span>
        </div>
      )}

      {/* Breakdown */}
      <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Base fee</span>
          <span className="font-semibold text-white">{formatCurrency(baseFee)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Distance ({km.toFixed(2)} km × {formatCurrency(round2(tierDef.perKm))}/km)</span>
          <span className="font-semibold text-white">{formatCurrency(distanceFee)}</span>
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;
