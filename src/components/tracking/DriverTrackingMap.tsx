import { GoogleRouteMap } from "@/components/maps/GoogleRouteMap";
import { type LatLngLiteral } from "@/lib/mapCore";

interface DriverTrackingMapProps {
  driverLocation?: LatLngLiteral | null;
  pickupLocation?: LatLngLiteral | null;
  dropoffLocation?: LatLngLiteral | null;
  onEtaUpdate?: (minutes: number) => void;
}

/**
 * Live trip tracking map. Only real coordinates are rendered — no simulated
 * driver or invented ETA. Until a live driver GPS fix arrives, the map shows
 * the pickup marker only and the caller falls back to its haversine ETA.
 */
const DriverTrackingMap = ({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  onEtaUpdate,
}: DriverTrackingMapProps) => {
  return (
    <GoogleRouteMap
      driver={driverLocation ?? null}
      pickup={pickupLocation ?? null}
      dropoff={dropoffLocation ?? null}
      routeMode="directions"
      fitMode="smart"
      rounded
      showLiveBadge
      onEtaUpdate={onEtaUpdate}
    />
  );
};

export default DriverTrackingMap;
