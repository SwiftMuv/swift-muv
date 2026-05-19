import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ITEM_CATALOG } from "@/lib/booking";

interface Props {
  quantities: Record<string, number>;
  onChange: (qs: Record<string, number>) => void;
}

export const ItemsPicker = ({ quantities, onChange }: Props) => {
  const setQty = (id: string, delta: number) => {
    const next = Math.max(0, (quantities[id] ?? 0) + delta);
    onChange({ ...quantities, [id]: next });
  };

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {ITEM_CATALOG.map((it) => {
        const qty = quantities[it.id] ?? 0;
        return (
          <div key={it.id} className={`flex items-center justify-between gap-2 px-3 py-2.5 ${qty > 0 ? "bg-primary/5" : ""}`}>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{it.name}</p>
              <p className="text-xs text-muted-foreground">${it.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setQty(it.id, -1)} disabled={qty === 0}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-5 text-center text-sm font-semibold tabular-nums">{qty}</span>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setQty(it.id, +1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const calcItemsTotal = (q: Record<string, number>) =>
  ITEM_CATALOG.reduce((sum, it) => sum + (q[it.id] ?? 0) * it.price, 0);
