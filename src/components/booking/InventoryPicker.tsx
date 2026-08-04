import { useEffect, useMemo, useState } from "react";
import { CarFront, Loader2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
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

const SUV_KEY = "__suv__";

const CATEGORIES: { key: string; labelKey: string; imageSrc: string }[] = [
  { key: SUV_KEY, labelKey: "bk.inventory.category.suv", imageSrc: SuvImg },
  { key: "Van", labelKey: "bk.inventory.category.van", imageSrc: CargoVanImg },
  { key: "Pickup", labelKey: "bk.inventory.category.pickup", imageSrc: PickupImg },
  { key: "Box Truck", labelKey: "bk.inventory.category.boxTruck", imageSrc: BoxTruckImg },
  { key: "Other Inventory", labelKey: "bk.inventory.category.other", imageSrc: MovingTruckImg },
];

interface Props {
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  suvSelected?: boolean;
  onSuvChange?: (next: boolean) => void;
}

export const InventoryPicker = ({ selected, onChange, suvSelected = false, onSuvChange }: Props) => {
  const { t } = useI18n();
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
        <Loader2 className="h-4 w-4 animate-spin" /> {t("bk.inventory.loading")}
      </div>
    );
  }

  const current = activeCategory && activeCategory !== SUV_KEY
    ? CATEGORIES.find((c) => c.key === activeCategory)
    : null;
  const currentLabel = current ? t(current.labelKey) : "";
  const currentRows = current ? itemsByCat[current.key] ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Vehicle category tiles (SUV is a toggle) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map((cat) => {
          const isSuv = cat.key === SUV_KEY;
          const isSelected = isSuv ? suvSelected : activeCategory === cat.key;
          const count = isSuv ? (suvSelected ? 1 : 0) : categoryCount(cat.key);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                if (isSuv) {
                  onSuvChange?.(!suvSelected);
                  return;
                }
                setActiveCategory(activeCategory === cat.key ? null : cat.key);
              }}
              className={`relative flex h-40 flex-col items-center justify-between rounded-xl border-2 bg-slate-900 p-2.5 text-center shadow-sm transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-slate-700 hover:border-primary/40 hover:shadow-md"
              }`}
            >
              {isSuv && (
                <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground shadow">
                  {t("bk.inventory.suvBadge")}
                </span>
              )}
              {count > 0 && (
                <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                  {isSuv ? <CarFront className="h-3 w-3" /> : count}
                </span>
              )}
              <div className="flex h-24 w-full items-center justify-center">
                <img
                  src={cat.imageSrc}
                  alt={t(cat.labelKey)}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <span className="mt-1 text-[11px] font-semibold leading-tight text-white">
                {t(cat.labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      {suvSelected && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-xs text-foreground">
          <p className="font-semibold">{t("bk.inventory.suvSelectedTitle")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("bk.inventory.suvSelectedDesc")}
          </p>
        </div>
      )}

      {/* Drawer */}
      {current && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              {currentLabel} {t("bk.inventory.itemsSuffix")}
            </h4>
            <span className="text-[10px] text-slate-400">
              {t("bk.inventory.specifyQuantities")}
            </span>
          </div>
          {currentRows.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              {t("bk.inventory.noItems")}
            </p>
          ) : (
            <div className="space-y-2">
              {currentRows.map((row) => {
                const qty = qtyMap[row.id] ?? 0;
                return (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 ${
                      qty > 0 ? "ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{row.item_name}</p>
                      <p className="text-[10px] text-slate-400">
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
