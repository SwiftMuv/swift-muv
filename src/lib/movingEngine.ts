// Vehicle-fleet pricing engine — no base fees.
// Local: volume × per-ft³ rate. Intercity: km × per-km rate.
// Inter-province: lbs × per-lb rate. Optional additional crew members add a flat fee per person.

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
}

export type MoveType = "local" | "intercity" | "inter-province";

export const VEHICLE_FLEET: Vehicle[] = [
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
  return (
    VEHICLE_FLEET.find((v) => v.maxVolumeCuFt >= bufV && v.maxWeightLbs >= bufW) ||
    VEHICLE_FLEET[VEHICLE_FLEET.length - 1]
  );
}

interface PriceCalculationInput {
  items: SelectedItem[];
  moveType: MoveType;
  distanceKm: number;
  crewCount?: number;
}

export function calculateMovePrice({
  items,
  moveType,
  distanceKm,
  crewCount = 0,
}: PriceCalculationInput) {
  const vehicle = recommendVehicle(items);

  let totalVolume = 0;
  let totalWeight = 0;
  items.forEach((i) => {
    totalVolume += i.cubic_feet * i.quantity;
    totalWeight += i.weight_lbs * i.quantity;
  });

  let servicePrice = 0;
  let breakdown: Record<string, unknown> = {};

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

  const safeCrew = Math.max(0, Math.floor(crewCount));
  const crewCost = safeCrew * vehicle.crewMemberFee;
  const finalPrice = servicePrice + crewCost;

  return {
    recommendedVehicle: vehicle.name,
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
