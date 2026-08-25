import { useEffect, useState } from "react";
import { GoogleRouteMap } from "@/components/maps/GoogleRouteMap";
import { type LatLngLiteral } from "@/lib/mapCore";

interface DriverTrackingMapProps {
  driverLocation?: LatLngLiteral | null;
  pickupLocation?: LatLngLiteral | null;
  dropoffLocation?: LatLngLiteral | null;
  onEtaUpdate?: (minutes: number) => void;
}

const SIM_ROUTE: LatLngLiteral[] = [
  { lat: 30.2849, lng: -97.7341 },
  { lat: 30.2801, lng: -97.736 },
  { lat: 30.2758, lng: -97.7382 },
  { lat: 30.272, lng: -97.7405 },
  { lat: 30.269, lng: -97.739 },
  { lat: 30.2665, lng: -97.7365 },
  { lat: 30.264, lng: -97.734 },
  { lat: 30.2615, lng: -97.731 },
  { lat: 30.2595, lng: -97.7285 },
  { lat: 30.258, lng: -97.726 },
  { lat: 30.257, lng: -97.7235 },
  { lat: 30.2555, lng: -97.721 },
];

const SIM_PICKUP: LatLngLiteral = { lat: 30.2555, lng: -97.721 };

const DriverTrackingMap = ({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  onEtaUpdate,
}: DriverTrackingMapProps) => {
  const [simIndex, setSimIndex] = useState(0);
  const simulate = !driverLocation || !pickupLocation;

  useEffect(() => {
    if (!simulate) return;

    const interval = window.setInterval(() => {
      setSimIndex((previous) => {
        const next = Math.min(previous + 1, SIM_ROUTE.length - 1);
        onEtaUpdate?.((SIM_ROUTE.length - 1 - next) * 4);
        return next;
      });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [onEtaUpdate, simulate]);

  return (
    <GoogleRouteMap
      driver={driverLocation ?? SIM_ROUTE[simIndex]}
      pickup={pickupLocation ?? SIM_PICKUP}
      dropoff={dropoffLocation}
      routeMode="directions"
      fitMode="smart"
      rounded
      showLiveBadge
      onEtaUpdate={onEtaUpdate}
    />
  );
};

export default DriverTrackingMap;
