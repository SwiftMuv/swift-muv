import { cn } from "@/lib/utils";
import { type VehicleCategory } from "@/lib/booking";
import { useVehicleCategories } from "@/hooks/useVehicleCategories";
import { getVehicleImage } from "@/lib/vehicleImages";
import { Check } from "lucide-react";

interface Props {
  value: VehicleCategory | null;
  onChange: (v: VehicleCategory) => void;
}

export const VehicleCategoryPicker = ({ value, onChange }: Props) => {
  const { options, loading } = useVehicleCategories();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[220px] rounded-2xl border border-slate-700 bg-slate-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((v) => {
        const Icon = v.icon;
        const img = getVehicleImage(v.id);
        const selected = value === v.id;
        const isPremium = v.id === "suv";
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-slate-900 p-3 text-left shadow-sm transition-all",
              selected
                ? "border-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.25)] ring-2 ring-cyan-500/30"
                : "border-slate-700 hover:border-cyan-500/50 hover:shadow-md",
            )}
          >
            {isPremium && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground shadow-sm">
                Premium
              </span>
            )}
            {selected && (
              <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white shadow-md">
                <Check className="h-4 w-4" />
              </span>
            )}
            <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-800">
              {img ? (
                <img
                  src={img}
                  alt={v.name}
                  loading="lazy"
                  className="h-full w-full object-contain p-1 transition-transform group-hover:scale-105"
                />
              ) : (
                <Icon className="h-12 w-12 text-cyan-500" />
              )}
            </div>
            <div className="mt-2">
              <p className="text-sm font-bold leading-tight text-white">{v.name}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-400 line-clamp-2">{v.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
