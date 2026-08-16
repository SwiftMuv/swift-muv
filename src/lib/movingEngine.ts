// Pricing engine (updated).
//
// Flat-rate model:
//   - SUV: any trip under 50 km costs a flat $50 CAD, which already includes
//     the base service fee and all applicable taxes. Every km beyond 50 km
//     adds $5/km.
//   - Other vehicles: the same rule, scaled by vehicle tier (bigger vehicle =
//     proportionally higher flat rate and excess-km rate).
//   - Crew helpers ($15/person) and heavy-item surcharges are added on top and
//     are taxed at the Quebec rate (14.975%).


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
/** Official SwiftMuv standard distance rate (CAD per km). */
export const PER_KM_RATE_CAD = 20.0;
export const SUV_FLAT_LOCAL_CAD = 50;
/** SUV flat fee covers the first 3 km. */
export const SUV_INCLUDED_KM = 3;
export const SUV_PER_KM_CAD = PER_KM_RATE_CAD;
/** Quebec combined sales tax (GST 5% + QST 9.975%). */
export const QC_TAX_RATE = 0.14975;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Admin-adjustable pricing overrides (loaded from app_config at runtime). */
export interface PricingOverrides {
  suvFlatLocal?: number;
  suvIncludedKm?: number;
  perKmRate?: number;
  baseFee?: number;
  crewMemberRate?: number;
  taxRate?: number;
}

const activeOverrides: PricingOverrides = {};

export function setPricingOverrides(o: PricingOverrides) {
  Object.assign(activeOverrides, o);
}

export function getPricingRates() {
  return {
    suvFlatLocal: activeOverrides.suvFlatLocal ?? SUV_FLAT_LOCAL_CAD,
    suvIncludedKm: activeOverrides.suvIncludedKm ?? SUV_INCLUDED_KM,
    perKmRate: activeOverrides.perKmRate ?? PER_KM_RATE_CAD,
    baseFee: activeOverrides.baseFee ?? BASE_FEE_CAD,
    crewMemberRate: activeOverrides.crewMemberRate ?? CREW_MEMBER_RATE_CAD,
    taxRate: activeOverrides.taxRate ?? QC_TAX_RATE,
  };
}

// Compounded scale for non-SUV fleet: +40% base, +30% per-km per tier.
const BASE_STEP = 1.4;
const tierBase = (level: number) => round2(BASE_FEE_CAD * Math.pow(BASE_STEP, level));
/** Distance rate is the same standard rate for every non-SUV vehicle. */
const tierRate = (_level: number) => round2(PER_KM_RATE_CAD);

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
  const rates = getPricingRates();

  let baseFee = 0;
  let distanceFee = 0;
  let servicePrice = 0;
  const breakdown: Record<string, unknown> = {};

  if (isSuv) {
    baseFee = rates.suvFlatLocal;
    const extraKm = Math.max(0, km - rates.suvIncludedKm);
    distanceFee = round2(extraKm * rates.perKmRate);
    servicePrice = round2(baseFee + distanceFee);
    Object.assign(breakdown, {
      flatRate: baseFee,
      distanceKm: km,
      includedKm: rates.suvIncludedKm,
      extraKm: round2(extraKm),
      ratePerKm: rates.perKmRate,
      serviceCost: servicePrice,
    });
  } else {
    // Use per-vehicle base + per-km rate so bigger vehicles cost more.
    baseFee = round2((vehicle.baseFee / BASE_FEE_CAD) * rates.baseFee);
    const ratePerKm = rates.perKmRate;
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
  const crewMemberFee = rates.crewMemberRate;
  const crewCost = safeCrew * crewMemberFee;

  // Heavy item surcharge — applies per unit for items over 50 lb.
  let heavyItemFee = 0;
  items.forEach((i) => {
    heavyItemFee += heavyItemFeePerUnit(i.weight_lbs) * i.quantity;
  });
  heavyItemFee = round2(heavyItemFee);

  const subtotal = round2(servicePrice + crewCost + heavyItemFee);
  const taxRate = rates.taxRate;
  const taxAmount = round2(subtotal * taxRate);
  const finalPrice = round2(subtotal + taxAmount);

  return {
    recommendedVehicle: vehicle.name,
    isFlatRate: isSuv,
    totalVolumeCuFt: totalVolume,
    totalWeightLbs: totalWeight,
    crewCount: safeCrew,
    crewMemberFee,
    crewCost,
    baseFee,
    heavyItemFee,
    distanceFee: Math.round(distanceFee * 100) / 100,
    servicePrice: round2(servicePrice),
    subtotal,
    taxRate,
    taxAmount,
    finalPrice,
    breakdown,
  };
}
