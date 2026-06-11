import { useEffect, useMemo, useState } from "react";
import { Car, Truck, PackageOpen, Container, Caravan } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

export type VehicleTier = "suv" | "pickup" | "cargo_van" | "box_truck" | "xlarge" | "moving_truck";

interface TierDef {
  id: VehicleTier;
  label: string;
  sub: string;
  icon: typeof Car;
  baseFee: number;
  perKm: number;
}

// SUV baseline kept flat. Every subsequent tier: base +40%, rate +30% from the previous.
const SUV_BASE = 20;
const SUV_RATE = 2;
const grow = (b: number, r: number) => ({ b: b * 1.4, r: r * 1.3 });

const t1 = { b: SUV_BASE, r: SUV_RATE };
const t2 = grow(t1.b, t1.r); // pickup
const t3 = grow(t2.b, t2.r); // cargo van
const t4 = grow(t3.b, t3.r); // box truck
const t5 = grow(t4.b, t4.r); // extra large
const t6 = grow(t5.b, t5.r); // moving truck

export const TIERS: TierDef[] = [
  { id: "suv",          label: "SUV",          sub: "Bags & small loads", icon: Car,         baseFee: t1.b, perKm: t1.r },
  { id: "pickup",       label: "Pickup",       sub: "Small loads",        icon: Truck,       baseFee: t2.b, perKm: t2.r },
  { id: "cargo_van",    label: "Cargo Van",    sub: "Studio / 1-bed",     icon: Caravan,     baseFee: t3.b, perKm: t3.r },
  { id: "box_truck",    label: "Box Truck",    sub: "2-bedroom",          icon: PackageOpen, baseFee: t4.b, perKm: t4.r },
  { id: "xlarge",       label: "Extra Large",  sub: "Large home",         icon: Container,   baseFee: t5.b, perKm: t5.r },
  { id: "moving_truck", label: "Moving Truck", sub: "3+ bedroom",         icon: Truck,       baseFee: t6.b, perKm: t6.r },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Props {
  distanceKm?: number;
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
  const perKm = round2(tierDef.perKm);
  const distanceFee = round2(tierDef.perKm * km);
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          <span>Distance ({km.toFixed(2)} km × {formatCurrency(perKm)}/km)</span>
          <span className="font-semibold text-white">{formatCurrency(distanceFee)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-slate-700 pt-2 text-base">
          <span className="font-bold text-white">Total</span>
          <span className="font-bold text-[#FF5722]">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;
