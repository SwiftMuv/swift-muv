// Server-side port of src/lib/movingEngine.ts — the checkout amount is always
// derived here so a caller can never choose their own price.
// Keep this file in sync with src/lib/movingEngine.ts.
// deno-lint-ignore-file no-explicit-any

const round2 = (n: number) => Math.round(n * 100) / 100;

const BASE_FEE_CAD = 20;
const BASE_STEP = 1.4;
const tierBase = (level: number) => round2(BASE_FEE_CAD * Math.pow(BASE_STEP, level));

interface Vehicle { name: string; maxVolumeCuFt: number; maxWeightLbs: number; baseFee: number; manualOnly?: boolean }

const SUV: Vehicle = { name: 'Extra Large Car / SUV', maxVolumeCuFt: 60, maxWeightLbs: 800, baseFee: 50, manualOnly: true };
const FLEET: Vehicle[] = [
  { name: 'Cargo Van', maxVolumeCuFt: 120, maxWeightLbs: 2000, baseFee: tierBase(0) },
  { name: '12ft Cube Van', maxVolumeCuFt: 400, maxWeightLbs: 3000, baseFee: tierBase(1) },
  { name: '16ft Truck', maxVolumeCuFt: 800, maxWeightLbs: 4500, baseFee: tierBase(2) },
  { name: '26ft Truck', maxVolumeCuFt: 1400, maxWeightLbs: 10000, baseFee: tierBase(3) },
];

interface Item { cubic_feet: number; weight_lbs: number; quantity: number }

const heavyFee = (w: number) => (w <= 50 ? 0 : w <= 100 ? 5 : w <= 200 ? 7 : 10);

const recommend = (items: Item[]) => {
  let v = 0, w = 0;
  items.forEach((i) => { v += i.cubic_feet * i.quantity; w += i.weight_lbs * i.quantity; });
  return FLEET.find((f) => f.maxVolumeCuFt >= v * 1.15 && f.maxWeightLbs >= w * 1.15) ?? FLEET[FLEET.length - 1];
};

const haversineKm = (a: number, b: number, c: number, d: number) => {
  const r = (x: number) => (x * Math.PI) / 180;
  const s = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
};

/** Returns the authoritative price for a booking payload, or an error. */
export async function computeServerPrice(admin: any, payload: Record<string, any>):
  Promise<{ price: number; vehicle: string } | { error: string }> {
  const { data: cfgRows } = await admin.from('app_config').select('key, value');
  const cfg: Record<string, number> = {};
  for (const r of cfgRows ?? []) { const n = Number(r.value); if (Number.isFinite(n)) cfg[r.key] = n; }
  const rates = {
    suvFlatLocal: cfg.suv_flat_local_cad ?? 50,
    crew: cfg.crew_member_rate_cad ?? 15,
    tax: cfg.tax_rate ?? 0.14975,
    includedKm: cfg.flat_included_km ?? 50,
    excess: cfg.excess_per_km_cad ?? 5,
  };

  // Distance: never less than the straight-line distance between the two stops.
  let km = Math.max(0, Number(payload.distance_km) || 0);
  const [pl, pg, dl, dg] = [payload.pickup_lat, payload.pickup_lng, payload.dropoff_lat, payload.dropoff_lng].map(Number);
  if ([pl, pg, dl, dg].every(Number.isFinite) && payload.pickup_lat != null && payload.dropoff_lat != null) {
    km = Math.max(km, haversineKm(pl, pg, dl, dg));
  } else if (km <= 0) {
    return { error: 'Route distance is required' };
  }
  if (km > 5000) return { error: 'Distance out of range' };

  // Items: resolve from the catalog — never trust client volumes/weights.
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  let items: Item[] = [];
  if (rawItems.length) {
    const ids = rawItems.map((i: any) => Number(i?.id)).filter((n: number) => Number.isInteger(n) && n > 0);
    const { data: catalog } = await admin.from('moving_items').select('id, cubic_feet, weight_lbs').in('id', ids);
    const byId = new Map((catalog ?? []).map((c: any) => [Number(c.id), c]));
    for (const i of rawItems) {
      const c: any = byId.get(Number(i?.id));
      const qty = Math.floor(Number(i?.qty ?? i?.quantity));
      if (!c || !Number.isFinite(qty) || qty <= 0 || qty > 500) return { error: 'Invalid items' };
      items.push({ cubic_feet: Number(c.cubic_feet), weight_lbs: Number(c.weight_lbs), quantity: qty });
    }
  }

  let vehicle: Vehicle;
  if (payload.vehicle_category === 'suv') {
    vehicle = SUV;
  } else if (items.length) {
    vehicle = recommend(items);
  } else {
    // Vehicle tile selection: same synthetic load the booking screen prices.
    const v = FLEET.find((f) => f.name === payload.recommended_vehicle);
    if (!v) return { error: 'Invalid vehicle' };
    vehicle = v;
    items = [{ cubic_feet: v.maxVolumeCuFt * 0.7, weight_lbs: v.maxWeightLbs * 0.7, quantity: 1 }];
  }

  const isSuv = vehicle === SUV;
  const tier = isSuv ? 1 : round2(vehicle.baseFee / BASE_FEE_CAD);
  const flat = round2(rates.suvFlatLocal * tier);
  const excessFee = round2(round2(Math.max(0, km - rates.includedKm)) * round2(rates.excess * tier));
  const service = round2(flat + excessFee);
  const crew = Math.max(0, Math.min(10, Math.floor(Number(payload.crew_count) || 0)));
  let heavy = 0;
  items.forEach((i) => { heavy += heavyFee(i.weight_lbs) * i.quantity; });
  const extras = round2(crew * rates.crew + round2(heavy));
  const price = round2(service + extras + round2(extras * rates.tax));
  return { price, vehicle: vehicle.name };
}

const DEFAULT_ORIGIN = 'https://swift-muv.lovable.app';
const ALLOWED_ORIGINS = new Set([
  DEFAULT_ORIGIN,
  'https://swiftmuv.com',
  'https://www.swiftmuv.com',
  'https://id-preview--c3150a8d-567e-4ea6-a580-59caaa19da0f.lovable.app',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:8080',
]);

/** Returns the caller's origin only if it is on the allowlist. */
export function safeOrigin(req: Request): string {
  const candidates = [req.headers.get('origin'), req.headers.get('referer')];
  for (const c of candidates) {
    if (!c) continue;
    try {
      const o = new URL(c).origin;
      if (ALLOWED_ORIGINS.has(o)) return o;
    } catch { /* ignore */ }
  }
  return DEFAULT_ORIGIN;
}

/** Returns url only if it points to an allowed origin, else the fallback. */
export function safeUrl(url: unknown, fallback: string): string {
  if (typeof url !== 'string') return fallback;
  try {
    const u = new URL(url);
    return ALLOWED_ORIGINS.has(u.origin) ? u.toString() : fallback;
  } catch { return fallback; }
}
