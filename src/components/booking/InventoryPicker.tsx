import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Minus, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SelectedItem } from "@/lib/movingEngine";

interface MovingItemRow {
  id: number;
  item_name: string;
  category: string | null;
  cubic_feet: number;
  weight_lbs: number;
}

interface Props {
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
}

const CATEGORY_ORDER = [
  "Studio & 1-Bedroom Essentials",
  "Bedroom",
  "Living Room",
  "Kitchen & Dining",
  "Boxes & Sundries",
];

export const InventoryPicker = ({ selected, onChange }: Props) => {
  const [items, setItems] = useState<MovingItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    "Studio & 1-Bedroom Essentials": true,
  });

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

  const setQty = (row: MovingItemRow, delta: number) => {
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

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => i.item_name.toLowerCase().includes(q))
      : items;
    const map: Record<string, MovingItemRow[]> = {};
    filtered.forEach((i) => {
      const cat = i.category ?? "Other";
      (map[cat] ||= []).push(i);
    });
    const ordered: [string, MovingItemRow[]][] = [];
    CATEGORY_ORDER.forEach((c) => {
      if (map[c]) ordered.push([c, map[c]]);
    });
    Object.keys(map)
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .forEach((c) => ordered.push([c, map[c]]));
    return ordered;
  }, [items, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          className="pl-9"
        />
      </div>
      <div className="space-y-2">
        {grouped.map(([cat, rows]) => {
          const catQty = rows.reduce((s, r) => s + (qtyMap[r.id] ?? 0), 0);
          const isOpen = query.trim() ? true : !!openCats[cat];
          return (
            <Collapsible
              key={cat}
              open={isOpen}
              onOpenChange={(o) => setOpenCats((p) => ({ ...p, [cat]: o }))}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-muted/40">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{cat}</span>
                  {catQty > 0 && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {catQty}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="divide-y divide-border border-t border-border">
                  {rows.map((row) => {
                    const qty = qtyMap[row.id] ?? 0;
                    return (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between gap-2 px-4 py-2.5 ${qty > 0 ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{row.item_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {Number(row.cubic_feet)} ft³ · {Number(row.weight_lbs)} lb
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full"
                            onClick={() => setQty(row, -1)}
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
                            onClick={() => setQty(row, +1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        {grouped.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No items match.</p>
        )}
      </div>
    </div>
  );
};
