export type PickupCoordinates = { lat: number; lng: number };

// Coordinates are a usable Google geocoding input even when address lookup is down.
export function currentPickupValue(position: PickupCoordinates, address?: string | null): string {
  return address?.trim() || `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
}