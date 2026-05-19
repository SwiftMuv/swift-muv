import { Truck, Package2, Container, Box } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VehicleCategory = "pickup_truck" | "cargo_van" | "box_truck" | "moving_truck_16";

export interface VehicleOption {
  id: VehicleCategory;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  { id: "pickup_truck", name: "Pickup Truck", description: "Small loads, a few boxes", icon: Truck },
  { id: "cargo_van", name: "Cargo Van", description: "1-bedroom or studio", icon: Package2 },
  { id: "box_truck", name: "Box Truck", description: "2-bedroom apartment", icon: Container },
  { id: "moving_truck_16", name: "16ft Moving Truck", description: "3+ bedroom home", icon: Box },
];

// Pricing constants
export const ITEM_CATALOG = [
  { id: "box", name: "Moving Box", price: 5 },
  { id: "chair", name: "Chair", price: 8 },
  { id: "table", name: "Table", price: 15 },
  { id: "tv", name: "TV", price: 15 },
  { id: "bed", name: "Bed", price: 20 },
  { id: "dresser", name: "Dresser", price: 20 },
  { id: "sofa", name: "Sofa", price: 25 },
  { id: "wardrobe", name: "Wardrobe", price: 30 },
  { id: "appliance", name: "Appliance (fridge/washer)", price: 30 },
  { id: "other", name: "Other item", price: 10 },
];

export const PRICING = {
  distancePerKm: 2.0,
  minDistanceFee: 15,
  crewPerMember: 10,
  floorSurchargePerFloor: 10, // only when no elevator
  serviceFeeRate: 0.10,
};

export const FLOORS = [
  { id: 0, label: "Ground floor" },
  { id: -1, label: "Basement" },
  { id: 1, label: "1st floor" },
  { id: 2, label: "2nd floor" },
  { id: 3, label: "3rd floor" },
  { id: 4, label: "4th floor" },
  { id: 5, label: "5th floor +" },
];

export interface PriceBreakdown {
  items: number;
  distance: number;
  crew: number;
  floor: number;
  service: number;
  tip: number;
  total: number;
}

export function calculatePrice(input: {
  itemsTotal: number;
  distanceKm: number;
  crewCount: number;
  floorLevel: number;
  hasElevator: boolean;
  tip?: number;
}): PriceBreakdown {
  const items = input.itemsTotal;
  const distance = Math.max(PRICING.minDistanceFee, Math.round(input.distanceKm * PRICING.distancePerKm * 100) / 100);
  const crew = input.crewCount * PRICING.crewPerMember;
  // Floor surcharge only if no elevator and above ground
  const floor = !input.hasElevator && input.floorLevel > 0
    ? input.floorLevel * PRICING.floorSurchargePerFloor
    : 0;
  const tip = input.tip ?? 0;
  const subtotal = items + distance + crew + floor;
  const service = Math.round(subtotal * PRICING.serviceFeeRate * 100) / 100;
  const total = Math.round((subtotal + service + tip) * 100) / 100;
  return { items, distance, crew, floor, service, tip, total };
}

export const moveSizeFromVehicle = (v: VehicleCategory): "small" | "medium" | "large" | "xlarge" => {
  switch (v) {
    case "pickup_truck": return "small";
    case "cargo_van": return "medium";
    case "box_truck": return "large";
    case "moving_truck_16": return "xlarge";
  }
};
