import { Package, Truck, Home, Building2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const MOVE_SIZES = [
  { id: "small", label: "Small", desc: "Few items / boxes", icon: Package, basePrice: 89 },
  { id: "medium", label: "Medium", desc: "Studio / 1BR apt", icon: Truck, basePrice: 199 },
  { id: "large", label: "Large", desc: "2-3BR apartment", icon: Home, basePrice: 349 },
  { id: "xlarge", label: "XL Move", desc: "Full house move", icon: Building2, basePrice: 599 },
] as const;

export type MoveSize = (typeof MOVE_SIZES)[number]["id"];

interface MoveSizeSelectorProps {
  selected: MoveSize | null;
  onSelect: (size: MoveSize) => void;
}

const MoveSizeSelector = ({ selected, onSelect }: MoveSizeSelectorProps) => {
  const { formatCurrency } = useI18n();
  return (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-foreground">Move Size</h3>
    <div className="grid grid-cols-2 gap-3">
      {MOVE_SIZES.map(({ id, label, desc, icon: Icon, basePrice }) => {
        const isActive = selected === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${
              isActive
                ? "border-cyan-500 bg-cyan-500/5 shadow-sm"
                : "border-border bg-card hover:border-cyan-500/30"
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isActive ? "bg-cyan-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <p className="text-sm font-bold text-cyan-500">From {formatCurrency(basePrice)}</p>
          </button>
        );
      })}
    </div>
  </div>
  );
};


export { MOVE_SIZES };
export default MoveSizeSelector;
