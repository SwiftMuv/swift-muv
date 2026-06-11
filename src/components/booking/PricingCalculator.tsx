import { useEffect, useMemo, useState } from "react";
import { Car, Truck, Container } from "lucide-react";
import { Input } from "@/components/ui/input";
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

// SUV baseline. Large = +40% base, +30% rate. XL = +40%/+30% from Large.
const SUV_BASE = 20;
const SUV_RATE = 2;
const LARGE_BASE = SUV_BASE * 1.4;       // 28
const LARGE_RATE = SUV_RATE * 1.3;       // 2.6
const XL_BASE = LARGE_BASE * 1.4;        // 39.20
const XL_RATE = LARGE_RATE * 1.3;        // 3.38

const round2 = (n: number) => Math.round(n * 100) / 100;

export const TIERS: TierDef[] = [
  { id: "suv",    label: "SUV",         sub: "Bags & small loads",   icon: Car,       baseFee: round2(SUV_BASE),   perKm: round2(SUV_RATE) },
  { id: "large",  label: "Large",       sub: "Pickup / Box Truck",   icon: Truck,     baseFee: round2(LARGE_BASE), perKm: round2(LARGE_RATE) },
  { id: "xlarge", label: "Extra Large", sub: "Moving Truck",         icon: Container, baseFee: round2(XL_BASE),    perKm: round2(XL_RATE) },
];

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  distanceKm?: number;
  onChange?: (info: { tier: VehicleTier; baseFee: number; perKm: number; distanceKm: number; total: number }) => void;
}

export const PricingCalculator = ({ distanceKm: externalKm, onChange }: Props) => {
  const [tier, setTier] = useState<VehicleTier>("suv");
  const [localKm, setLocalKm] = useState<string>("");

  const km = useMemo(() => {
    if (typeof externalKm === "number" && externalKm > 0) return externalKm;
    const parsed = parseFloat(localKm);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [externalKm, localKm]);

  const tierDef = TIERS.find((t) => t.id === tier)!;
  const baseFee = tierDef.baseFee;
  const perKm = tierDef.perKm;
  const distanceFee = round2(perKm * km);
  const total = round2(baseFee + distanceFee);

  useEffect(() => {
    onChange?.({ tier, baseFee, perKm, distanceKm: km, total });
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
        {TIERS.map((tt) => {
          const Icon = tt.icon;
          const active = tier === tt.id;
          return (
            <button
              key={tt.id}
              type="button"
              onClick={() => setTier(tt.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all",
                active
                  ? "border-[#FF5722] bg-[#FF5722]/10 shadow-[0_0_0_3px_rgba(255,87,34,0.2)]"
                  : "border-slate-700 bg-slate-800/60 hover:border-[#FF5722]/40",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-[#FF5722]" : "text-slate-300")} />
              <span className={cn("text-[11px] font-bold leading-tight", active ? "text-white" : "text-slate-200")}>
                {tt.label}
              </span>
              <span className="text-[9px] leading-tight text-slate-400">{tt.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Distance input */}
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
          <span className="font-semibold text-white">{fmt(baseFee)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Distance ({km.toFixed(2)} km × {fmt(perKm)}/km)</span>
          <span className="font-semibold text-white">{fmt(distanceFee)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-slate-700 pt-2 text-base">
          <span className="font-bold text-white">Total</span>
          <span className="font-bold text-[#FF5722]">{fmt(total)}</span>
        </div>
        <p className="pt-1 text-center text-[10px] font-medium text-slate-400">
          Base Fee: {fmt(baseFee)} | Rate per km: {fmt(perKm)}
        </p>
      </div>
    </div>
  );
};

export default PricingCalculator;
