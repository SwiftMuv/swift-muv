import { cn } from "@/lib/utils";
import { type VehicleCategory } from "@/lib/booking";
import { useVehicleCategories } from "@/hooks/useVehicleCategories";

interface Props {
  value: VehicleCategory | null;
  onChange: (v: VehicleCategory) => void;
}

export const VehicleCategoryPicker = ({ value, onChange }: Props) => {
  const { options, loading } = useVehicleCategories();

  if (loading) {
    return <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[88px] rounded-xl border border-border bg-card animate-pulse" />
      ))}
    </div>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((v) => {
        const Icon = v.icon;
        const selected = value === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
              selected ? "border-primary bg-primary/10 ring-2 ring-primary/40" : "border-border bg-card hover:border-primary/50",
            )}
          >
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", selected ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary")}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{v.name}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{v.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
