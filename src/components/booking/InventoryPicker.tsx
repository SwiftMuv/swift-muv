import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { SelectedItem } from "@/lib/movingEngine";
import CargoVanImg from "@/assets/vehicles/cargo-van.png";
import SuvImg from "@/assets/vehicles/suv.png";
import PickupImg from "@/assets/vehicles/pickup.png";
import BoxTruckImg from "@/assets/vehicles/box-truck.png";
import MovingTruckImg from "@/assets/vehicles/moving-truck.png";

interface MovingItemRow {
  id: number;
  item_name: string;
  category: string | null;
  cubic_feet: number;
  weight_lbs: number;
}

interface CategoryDef {
  key: string;
  label: string;
  imageSrc: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: "Van", label: "Cargo Van", imageSrc: CargoVanImg },
  { key: "SUV", label: "SUV", imageSrc: SuvImg },
  { key: "Pickup", label: "Pickup", imageSrc: PickupImg },
  { key: "Box Truck", label: "Box Truck", imageSrc: BoxTruckImg },
  { key: "Other Inventory", label: "Moving Truck", imageSrc: MovingTruckImg },
];

interface Props {
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
}

export const InventoryPicker = ({ selected, onChange }: Props) => {
  const [items, setItems] = useState<MovingItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("moving_items")
        .select("id, item_name, category, cubic_feet, weight_lbs")
        .order("display_order", { ascending: true });
      if (!error && data) setItems(data as MovingItemRow[]);
      setLoading(false);
    })();
  }, []);

  const qtyMap = useMemo(() => {
    const m: Record<number, number> = {};
    selected.forEach((s) => (m[s.id] = s.quantity));
    return m;
  }, [selected]);

  const itemsByCat = useMemo(() => {
    const m: Record<string, MovingItemRow[]> = {};
    items.forEach((i) => {
      const c = i.category ?? "Other Inventory";
      (m[c] ||= []).push(i);
    });
    return m;
  }, [items]);

  const updateQty = (row: MovingItemRow, delta: number) => {
    const current = qtyMap[row.id] ?? 0;
    const next = Math.max(0, current + delta);
    const without = selected.filter((s) => s.id !== row.id);
    if (next === 0) return onChange(without);
    onChange([
      ...without,
      {
        id: row.id,
        item_name: row.item_name,
        cubic_feet: Number(row.cubic_feet),
        weight_lbs: Number(row.weight_lbs),
        quantity: next,
      },
    ]);
  };

  const categoryCount = (key: string) =>
    (itemsByCat[key] ?? []).reduce((t, r) => t + (qtyMap[r.id] ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory…
      </div>
    );
  }

  const current = activeCategory
    ? CATEGORIES.find((c) => c.key === activeCategory)
    : null;
  const currentRows = current ? itemsByCat[current.key] ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Vehicle category tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.key;
          const count = categoryCount(cat.key);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(isSelected ? null : cat.key)}
              className={`relative flex h-32 flex-col items-center justify-between rounded-xl border-2 bg-white p-2.5 text-center shadow-sm transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:shadow-md"
              }`}
            >
              {count > 0 && (
                <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                  {count}
                </span>
              )}
              <div className="flex h-16 w-full items-center justify-center">
                <img
                  src={cat.imageSrc}
                  alt={cat.label}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <span className="mt-1 text-[11px] font-semibold leading-tight text-slate-800">
                {cat.label}
              </span>
            </button>

          );
        })}
      </div>

      {/* Drawer */}
      {current && (
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {current.label} items
            </h4>
            <span className="text-[10px] text-muted-foreground">
              Specify quantities
            </span>
          </div>
          {currentRows.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No items in this category.
            </p>
          ) : (
            <div className="space-y-2">
              {currentRows.map((row) => {
                const qty = qtyMap[row.id] ?? 0;
                return (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 ${
                      qty > 0 ? "ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{row.item_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {Number(row.cubic_feet)} ft³ · {Number(row.weight_lbs)} lb
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(row, -1)}
                        disabled={qty === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-5 text-center text-sm font-semibold tabular-nums">
                        {qty}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(row, +1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
