import { Truck, Box, Car, Caravan, Container, CarFront, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Maps `vehicle_categories.icon` strings (stored in DB) to Lucide React components.
export const VEHICLE_ICON_MAP: Record<string, LucideIcon> = {
  Truck,
  Box,
  Car,
  CarFront,
  Caravan,
  Container,
  Package,
};

export const getVehicleIcon = (name: string | null | undefined): LucideIcon =>
  (name && VEHICLE_ICON_MAP[name]) || Truck;
