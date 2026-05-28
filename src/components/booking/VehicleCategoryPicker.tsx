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
          <div key={i} className="h-[160px] rounded-2xl border border-border bg-card animate-pulse" />
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
              "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-card p-3 text-left transition-all",
              selected
                ? "border-primary shadow-[var(--shadow-primary)] ring-2 ring-primary/30"
                : "border-border hover:border-primary/50 hover:shadow-md",
            )}
          >
            {isPremium && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground shadow-sm">
                Premium
              </span>
            )}
            {selected && (
              <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Check className="h-4 w-4" />
              </span>
            )}
            <div className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[hsl(var(--section))] to-background">
              {img ? (
                <img
                  src={img}
                  alt={v.name}
                  loading="lazy"
                  className="h-full w-full object-contain p-1 transition-transform group-hover:scale-105"
                />
              ) : (
                <Icon className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="mt-2">
              <p className="text-sm font-bold leading-tight text-foreground">{v.name}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground line-clamp-2">{v.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
