import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setPricingOverrides, type PricingOverrides } from "@/lib/movingEngine";

export const PRICING_KEYS = [
  "suv_flat_local_cad",
  "suv_included_km",
  "per_km_rate_cad",
  "base_fee_cad",
  "crew_member_rate_cad",
  "tax_rate",
] as const;

export type PricingKey = (typeof PRICING_KEYS)[number];

const KEY_TO_OVERRIDE: Record<PricingKey, keyof PricingOverrides> = {
  suv_flat_local_cad: "suvFlatLocal",
  suv_included_km: "suvIncludedKm",
  per_km_rate_cad: "perKmRate",
  base_fee_cad: "baseFee",
  crew_member_rate_cad: "crewMemberRate",
  tax_rate: "taxRate",
};

export async function fetchPricingConfig(): Promise<Partial<Record<PricingKey, number>>> {
  const { data, error } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", PRICING_KEYS as unknown as string[]);
  if (error || !data) return {};
  const out: Partial<Record<PricingKey, number>> = {};
  data.forEach((row) => {
    const n = Number(row.value as unknown);
    if (Number.isFinite(n)) out[row.key as PricingKey] = n;
  });
  return out;
}

/** Load admin-configured rates and apply them to the client pricing engine. */
export async function loadPricingConfig() {
  const cfg = await fetchPricingConfig();
  const overrides: PricingOverrides = {};
  (Object.keys(cfg) as PricingKey[]).forEach((k) => {
    const v = cfg[k];
    if (typeof v === "number") overrides[KEY_TO_OVERRIDE[k]] = v;
  });
  setPricingOverrides(overrides);
  bumpVersion();
  return cfg;
}

export async function savePricingConfig(values: Partial<Record<PricingKey, number>>) {
  const rows = (Object.keys(values) as PricingKey[])
    .filter((k) => Number.isFinite(values[k]))
    .map((k) => ({ key: k, value: values[k] as unknown as never, updated_at: new Date().toISOString() }));
  if (!rows.length) return;
  const { error } = await supabase.from("app_config").upsert(rows, { onConflict: "key" });
  if (error) throw error;
  await loadPricingConfig();
  bumpVersion();
}

/* ---- Live pricing updates -------------------------------------------- */

let version = 0;
const listeners = new Set<() => void>();
let realtimeBound = false;

function bumpVersion() {
  version += 1;
  listeners.forEach((l) => l());
}

function bindRealtime() {
  if (realtimeBound) return;
  realtimeBound = true;
  supabase
    .channel("app_config_pricing")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_config" },
      () => {
        loadPricingConfig().catch(() => {});
      },
    )
    .subscribe();
}

/**
 * Re-renders the calling component whenever admin pricing changes
 * (locally saved or updated by another admin in real time).
 */
export function usePricingVersion(): number {
  const [v, setV] = useState(version);
  useEffect(() => {
    bindRealtime();
    const listener = () => setV(version);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return v;
}
