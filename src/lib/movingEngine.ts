// Pricing engine (updated).
//
// Rules:
//   - SUV ("Extra Large Car / SUV", bags only):
//       local      → flat $50 CAD
//       intercity  → $50 + (km × $2.00)
//       inter-prov → $50 + (km × $2.00)
//   - All other vehicles: $20 base + (km × $2.00) — flat, regardless of move type.
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
}

export type MoveType = "local" | "intercity" | "inter-province";
export type VehicleSelection = "auto" | "suv";

export const CREW_MEMBER_RATE_CAD = 15;
export const BASE_FEE_CAD = 20;
export const PER_KM_RATE_CAD = 2.0;
export const SUV_FLAT_LOCAL_CAD = 50;
export const SUV_PER_KM_CAD = 2.0;

export const SUV_VEHICLE: Vehicle = {
  name: "Extra Large Car / SUV",
  maxVolumeCuFt: 60,
  maxWeightLbs: 800,
  manualOnly: true,
};

export const VEHICLE_FLEET: Vehicle[] = [
  SUV_VEHICLE,
  { name: "Cargo Van",     maxVolumeCuFt: 120,  maxWeightLbs: 2000 },
  { name: "12ft Cube Van", maxVolumeCuFt: 400,  maxWeightLbs: 3000 },
  { name: "16ft Truck",    maxVolumeCuFt: 800,  maxWeightLbs: 4500 },
  { name: "26ft Truck",    maxVolumeCuFt: 1400, maxWeightLbs: 10000 },
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
    baseFee = BASE_FEE_CAD;
    distanceFee = km * PER_KM_RATE_CAD;
    servicePrice = baseFee + distanceFee;
    Object.assign(breakdown, {
      baseFee,
      distanceKm: km,
      ratePerKm: PER_KM_RATE_CAD,
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
