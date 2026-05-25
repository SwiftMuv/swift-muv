// Vehicle-fleet pricing engine — no base fees.
// Local: volume × per-ft³ rate. Intercity: km × per-km rate.
// Inter-province: lbs × per-lb rate. Optional additional crew members add a flat fee per person.
//
// Special case: "Extra Large Car / SUV" is for bags & luggage only (no furniture).
// When explicitly selected:
//   - Local move      → flat $50 CAD
//   - Intercity / IP  → $50 + (km × $1.20)
// Crew on SUV adds $25 per person. SUV is NEVER auto-recommended.

export interface SelectedItem {
  id: number;
  item_name: string;
  cubic_feet: number;
  weight_lbs: number;
  quantity: number;
}

export interface Vehicle {
  name: string;
  maxVolumeCuFt: number;
  maxWeightLbs: number;
  perCuFtLocal: number;
  perKmRateIntercity: number;
  perLbRateInterProvince: number;
  crewMemberFee: number;
  // SUV uses flat-rate pricing instead of the standard formulas.
  flatRate?: { local: number; perKm: number };
  // If true, vehicle is excluded from auto-recommendation (must be chosen explicitly).
  manualOnly?: boolean;
}

export type MoveType = "local" | "intercity" | "inter-province";
export type VehicleSelection = "auto" | "suv";

export const SUV_VEHICLE: Vehicle = {
  name: "Extra Large Car / SUV",
  maxVolumeCuFt: 60,
  maxWeightLbs: 800,
  perCuFtLocal: 0,
  perKmRateIntercity: 1.20,
  perLbRateInterProvince: 0,
  crewMemberFee: 25,
  flatRate: { local: 50, perKm: 1.20 },
  manualOnly: true,
};

export const VEHICLE_FLEET: Vehicle[] = [
  SUV_VEHICLE,
  { name: "Cargo Van",     maxVolumeCuFt: 120,  maxWeightLbs: 2000,  perCuFtLocal: 0.95, perKmRateIntercity: 1.45, perLbRateInterProvince: 0.18, crewMemberFee: 35 },
  { name: "12ft Cube Van", maxVolumeCuFt: 400,  maxWeightLbs: 3000,  perCuFtLocal: 1.10, perKmRateIntercity: 1.80, perLbRateInterProvince: 0.26, crewMemberFee: 45 },
  { name: "16ft Truck",    maxVolumeCuFt: 800,  maxWeightLbs: 4500,  perCuFtLocal: 1.25, perKmRateIntercity: 2.15, perLbRateInterProvince: 0.35, crewMemberFee: 60 },
  { name: "26ft Truck",    maxVolumeCuFt: 1400, maxWeightLbs: 10000, perCuFtLocal: 1.45, perKmRateIntercity: 2.60, perLbRateInterProvince: 0.48, crewMemberFee: 75 },
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

  let servicePrice = 0;
  let breakdown: Record<string, unknown> = {};

  if (vehicle.flatRate) {
    // SUV flat-rate logic
    if (moveType === "local") {
      servicePrice = vehicle.flatRate.local;
      breakdown = { flatRate: vehicle.flatRate.local, serviceCost: servicePrice };
    } else {
      servicePrice = vehicle.flatRate.local + distanceKm * vehicle.flatRate.perKm;
      breakdown = {
        flatRate: vehicle.flatRate.local,
        distanceKm,
        ratePerKm: vehicle.flatRate.perKm,
        serviceCost: servicePrice,
      };
    }
  } else {
    switch (moveType) {
      case "local":
        servicePrice = totalVolume * vehicle.perCuFtLocal;
        breakdown = {
          totalVolumeCuFt: totalVolume,
          ratePerCuFt: vehicle.perCuFtLocal,
          serviceCost: servicePrice,
        };
        break;
      case "intercity":
        servicePrice = distanceKm * vehicle.perKmRateIntercity;
        breakdown = {
          distanceKm,
          ratePerKm: vehicle.perKmRateIntercity,
          serviceCost: servicePrice,
        };
        break;
      case "inter-province":
        servicePrice = totalWeight * vehicle.perLbRateInterProvince;
        breakdown = {
          totalWeightLbs: totalWeight,
          ratePerLb: vehicle.perLbRateInterProvince,
          serviceCost: servicePrice,
        };
        break;
    }
  }

  const safeCrew = Math.max(0, Math.floor(crewCount));
  const crewCost = safeCrew * vehicle.crewMemberFee;
  const finalPrice = servicePrice + crewCost;

  return {
    recommendedVehicle: vehicle.name,
    isFlatRate: !!vehicle.flatRate,
    totalVolumeCuFt: totalVolume,
    totalWeightLbs: totalWeight,
    crewCount: safeCrew,
    crewMemberFee: vehicle.crewMemberFee,
    crewCost,
    servicePrice: Math.round(servicePrice * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    breakdown,
  };
}
