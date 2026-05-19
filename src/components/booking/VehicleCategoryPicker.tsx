import { cn } from "@/lib/utils";
import { VEHICLE_OPTIONS, type VehicleCategory } from "@/lib/booking";

interface Props {
  value: VehicleCategory | null;
  onChange: (v: VehicleCategory) => void;
}

export const VehicleCategoryPicker = ({ value, onChange }: Props) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {VEHICLE_OPTIONS.map((v) => {
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
