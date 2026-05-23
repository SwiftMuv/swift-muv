// 1. Interfaces for Data Structures

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
  baseLocalFee: number;
  hourlyRate: number;
  baseIntercityFee: number;
  perKmRateIntercity: number;
  baseInterProvinceFee: number;
  perLbRateInterProvince: number;
}

export type MoveType = "local" | "intercity" | "inter-province";

// 2. Vehicle Fleet Parameters
export const VEHICLE_FLEET: Vehicle[] = [
  {
    name: "Cargo Van",
    maxVolumeCuFt: 120,
    maxWeightLbs: 2000,
    baseLocalFee: 50,
    hourlyRate: 45,
    baseIntercityFee: 100,
    perKmRateIntercity: 1.25,
    baseInterProvinceFee: 250,
    perLbRateInterProvince: 0.15,
  },
  {
    name: "12ft Cube Van",
    maxVolumeCuFt: 400,
    maxWeightLbs: 3000,
    baseLocalFee: 75,
    hourlyRate: 60,
    baseIntercityFee: 150,
    perKmRateIntercity: 1.5,
    baseInterProvinceFee: 400,
    perLbRateInterProvince: 0.22,
  },
  {
    name: "16ft Truck",
    maxVolumeCuFt: 800,
    maxWeightLbs: 4500,
    baseLocalFee: 100,
    hourlyRate: 75,
    baseIntercityFee: 200,
    perKmRateIntercity: 1.85,
    baseInterProvinceFee: 600,
    perLbRateInterProvince: 0.3,
  },
  {
    name: "26ft Truck",
    maxVolumeCuFt: 1400,
    maxWeightLbs: 10000,
    baseLocalFee: 150,
    hourlyRate: 95,
    baseIntercityFee: 300,
    perKmRateIntercity: 2.2,
    baseInterProvinceFee: 900,
    perLbRateInterProvince: 0.42,
  },
];

// 3. Vehicle Recommendation
export function recommendVehicle(items: SelectedItem[]): Vehicle {
  let totalVolume = 0;
  let totalWeight = 0;

  items.forEach((item) => {
    totalVolume += item.cubic_feet * item.quantity;
    totalWeight += item.weight_lbs * item.quantity;
  });

  const bufferedVolume = totalVolume * 1.15;
  const bufferedWeight = totalWeight * 1.15;

  const suitableVehicle = VEHICLE_FLEET.find(
    (vehicle) =>
      vehicle.maxVolumeCuFt >= bufferedVolume &&
      vehicle.maxWeightLbs >= bufferedWeight
  );

  return suitableVehicle || VEHICLE_FLEET[VEHICLE_FLEET.length - 1];
}

// 4. Dynamic Price Calculation
interface PriceCalculationInput {
  items: SelectedItem[];
  moveType: MoveType;
  distanceKm: number;
}

export function calculateMovePrice({
  items,
  moveType,
  distanceKm,
}: PriceCalculationInput) {
  const vehicle = recommendVehicle(items);

  let totalVolume = 0;
  let totalWeight = 0;
  items.forEach((item) => {
    totalVolume += item.cubic_feet * item.quantity;
    totalWeight += item.weight_lbs * item.quantity;
  });

  let finalPrice = 0;
  let breakDownDetails: Record<string, unknown> = {};

  switch (moveType) {
    case "local": {
      const estimatedHours = Math.max(2, Math.ceil(totalVolume / 100) + 1);
      const laborCost = estimatedHours * vehicle.hourlyRate;
      finalPrice = vehicle.baseLocalFee + laborCost;

      breakDownDetails = {
        baseFee: vehicle.baseLocalFee,
        estimatedHours,
        hourlyRate: vehicle.hourlyRate,
        laborCost,
      };
      break;
    }

    case "intercity": {
      const distanceCost = distanceKm * vehicle.perKmRateIntercity;
      finalPrice = vehicle.baseIntercityFee + distanceCost;

      breakDownDetails = {
        baseFee: vehicle.baseIntercityFee,
        distanceKm,
        ratePerKm: vehicle.perKmRateIntercity,
        distanceCost,
      };
      break;
    }

    case "inter-province": {
      const weightCost = totalWeight * vehicle.perLbRateInterProvince;
      finalPrice = vehicle.baseInterProvinceFee + weightCost;

      breakDownDetails = {
        baseFee: vehicle.baseInterProvinceFee,
        estimatedWeightLbs: totalWeight,
        ratePerLb: vehicle.perLbRateInterProvince,
        weightCost,
      };
      break;
    }
  }

  return {
    recommendedVehicle: vehicle.name,
    totalVolumeCuFt: totalVolume,
    totalWeightLbs: totalWeight,
    finalPrice: Math.round(finalPrice * 100) / 100,
    breakdown: breakDownDetails,
  };
}
