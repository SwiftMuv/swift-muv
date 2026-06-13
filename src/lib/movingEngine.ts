// Pricing engine (updated).
//
// Per-vehicle pricing — the bigger the vehicle, the higher the price.
//   - SUV ("Extra Large Car / SUV", bags only):
//       local      → flat $50 CAD
//       intercity  → $50 + (km × $2.00)
//       inter-prov → $50 + (km × $2.00)
//   - All other vehicles: each tier compounds +40% base fee and +30% per-km
//     rate from the previous (smaller) tier, starting from $20 base / $2/km.
//   - Optional crew helpers add $15 CAD per person on every vehicle.

export interface SelectedItem {
  id: number;
  item_name: string;
  cubic_feet: number;
  weight_lbs: number;
  quantity: number;
  /** Floor number where the item is located (0 = ground). */
  floor_level?: number;
  /** Whether an elevator is available at that location. */
  has_elevator?: boolean;
}

export interface Vehicle {
  name: string;
  maxVolumeCuFt: number;
  maxWeightLbs: number;
  manualOnly?: boolean;
  /** Base fee for this vehicle in CAD. */
  baseFee: number;
  /** Per-km rate for this vehicle in CAD. */
  perKmRate: number;
}

export type MoveType = "local" | "intercity" | "inter-province";
export type VehicleSelection = "auto" | "suv";

export const CREW_MEMBER_RATE_CAD = 15;
export const BASE_FEE_CAD = 20;
export const PER_KM_RATE_CAD = 2.0;
export const SUV_FLAT_LOCAL_CAD = 50;
export const SUV_PER_KM_CAD = 2.0;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Compounded scale for non-SUV fleet: +40% base, +30% per-km per tier.
const BASE_STEP = 1.4;
const RATE_STEP = 1.3;
const tierBase = (level: number) => round2(BASE_FEE_CAD * Math.pow(BASE_STEP, level));
const tierRate = (level: number) => round2(PER_KM_RATE_CAD * Math.pow(RATE_STEP, level));

/**
 * Heavy-item surcharge (per unit). Items above 50 lb attract an extra fee
 * depending on weight:
 *   50–100 lb  → $5
 *   100–200 lb → $7
 *   > 200 lb   → $10
 */
export function heavyItemFeePerUnit(weightLbs: number): number {
  if (weightLbs <= 50) return 0;
  if (weightLbs <= 100) return 5;
  if (weightLbs <= 200) return 7;
  return 10;
}

export const SUV_VEHICLE: Vehicle = {
  name: "Extra Large Car / SUV",
  maxVolumeCuFt: 60,
  maxWeightLbs: 800,
  manualOnly: true,
  baseFee: SUV_FLAT_LOCAL_CAD,
  perKmRate: SUV_PER_KM_CAD,
};

export const VEHICLE_FLEET: Vehicle[] = [
  SUV_VEHICLE,
  { name: "Cargo Van",     maxVolumeCuFt: 120,  maxWeightLbs: 2000,  baseFee: tierBase(0), perKmRate: tierRate(0) }, // $20.00 / $2.00
  { name: "12ft Cube Van", maxVolumeCuFt: 400,  maxWeightLbs: 3000,  baseFee: tierBase(1), perKmRate: tierRate(1) }, // $28.00 / $2.60
  { name: "16ft Truck",    maxVolumeCuFt: 800,  maxWeightLbs: 4500,  baseFee: tierBase(2), perKmRate: tierRate(2) }, // $39.20 / $3.38
  { name: "26ft Truck",    maxVolumeCuFt: 1400, maxWeightLbs: 10000, baseFee: tierBase(3), perKmRate: tierRate(3) }, // $54.88 / $4.39
];

export function recommendVehicle(items: SelectedItem[]): Vehicle {
  let totalVolume = 0;
  let totalWeight = 0;
  items.forEach((i) => {
    totalVolume += i.cubic_feet * i.quantity;
    totalWeight += i.weight_lbs * i.quantity;
  });
  const bufV = totalVolume * 1.15;
  const bufW = totalWeight * 1.15;
  const pool = VEHICLE_FLEET.filter((v) => !v.manualOnly);
  return (
    pool.find((v) => v.maxVolumeCuFt >= bufV && v.maxWeightLbs >= bufW) ||
    pool[pool.length - 1]
  );
}

interface PriceCalculationInput {
  items: SelectedItem[];
  moveType: MoveType;
  distanceKm: number;
  crewCount?: number;
  vehicleSelection?: VehicleSelection;
}

export function calculateMovePrice({
  items,
  moveType,
  distanceKm,
  crewCount = 0,
  vehicleSelection = "auto",
}: PriceCalculationInput) {
  const vehicle: Vehicle =
    vehicleSelection === "suv" ? SUV_VEHICLE : recommendVehicle(items);

  let totalVolume = 0;
  let totalWeight = 0;
  items.forEach((i) => {
    totalVolume += i.cubic_feet * i.quantity;
    totalWeight += i.weight_lbs * i.quantity;
  });

  const isSuv = vehicleSelection === "suv";
  const km = Math.max(0, distanceKm);

  let baseFee = 0;
  let distanceFee = 0;
  let servicePrice = 0;
  const breakdown: Record<string, unknown> = {};

  if (isSuv) {
    baseFee = SUV_FLAT_LOCAL_CAD;
    distanceFee = moveType === "local" ? 0 : km * SUV_PER_KM_CAD;
    servicePrice = baseFee + distanceFee;
    Object.assign(breakdown, {
      flatRate: baseFee,
      distanceKm: km,
      ratePerKm: moveType === "local" ? 0 : SUV_PER_KM_CAD,
      serviceCost: servicePrice,
    });
  } else {
    // Use per-vehicle base + per-km rate so bigger vehicles cost more.
    baseFee = vehicle.baseFee;
    const ratePerKm = vehicle.perKmRate;
    distanceFee = km * ratePerKm;
    servicePrice = baseFee + distanceFee;
    Object.assign(breakdown, {
      vehicle: vehicle.name,
      baseFee,
      distanceKm: km,
      ratePerKm,
      serviceCost: servicePrice,
    });
  }

  const safeCrew = Math.max(0, Math.floor(crewCount));
  const crewMemberFee = CREW_MEMBER_RATE_CAD;
  const crewCost = safeCrew * crewMemberFee;
  const finalPrice = servicePrice + crewCost;

  return {
    recommendedVehicle: vehicle.name,
    isFlatRate: isSuv,
    totalVolumeCuFt: totalVolume,
    totalWeightLbs: totalWeight,
    crewCount: safeCrew,
    crewMemberFee,
    crewCost,
    baseFee,
    distanceFee: Math.round(distanceFee * 100) / 100,
    servicePrice: Math.round(servicePrice * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    breakdown,
  };
}
