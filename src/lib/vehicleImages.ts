import suv from "@/assets/vehicles/suv.png";
import pickup from "@/assets/vehicles/pickup.png";
import cargoVan from "@/assets/vehicles/cargo-van.png";
import boxTruck from "@/assets/vehicles/box-truck.png";
import movingTruck from "@/assets/vehicles/moving-truck.png";

export const VEHICLE_IMAGES: Record<string, string> = {
  suv,
  pickup_truck: pickup,
  cargo_van: cargoVan,
  box_truck: boxTruck,
  moving_truck_16: movingTruck,
};

export const getVehicleImage = (code: string | null | undefined): string | undefined =>
  (code && VEHICLE_IMAGES[code]) || undefined;
