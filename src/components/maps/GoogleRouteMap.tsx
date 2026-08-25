/// <reference types="google.maps" />
import { useEffect, useMemo, useRef } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import {
  SWIFTMUV_DARK_MAP_STYLES,
  SWIFTMUV_DEFAULT_CENTER,
  ROUTE_CASING,
  ROUTE_LINE,
  TRACKING_ROUTE_CASING,
  TRACKING_ROUTE_LINE,
  driverIcon,
  googleBoundsFor,
  isValidLatLng,
  markerSymbol,
  type LatLngLiteral,
} from "@/lib/mapCore";
import { cn } from "@/lib/utils";

interface GoogleRouteMapProps {
  pickup?: LatLngLiteral | null;
  dropoff?: LatLngLiteral | null;
  driver?: LatLngLiteral | null;
  className?: string;
  routeMode?: "straight" | "directions";
  fitMode?: "always" | "smart";
  rounded?: boolean;
  showLiveBadge?: boolean;
  fallbackText?: string;
  onEtaUpdate?: (minutes: number) => void;
}

const defaultPadding: google.maps.Padding = { top: 80, right: 48, bottom: 340, left: 48 };
const compactPadding: google.maps.Padding = { top: 40, right: 40, bottom: 40, left: 40 };

export const GoogleRouteMap = ({
  pickup,
  dropoff,
  driver,
  className,
  routeMode = "straight",
  fitMode = "always",
  rounded = false,
  showLiveBadge = false,
  fallbackText = "Loading map…",
  onEtaUpdate,
}: GoogleRouteMapProps) => {
  const { ready, error } = useGoogleMaps(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Record<"pickup" | "dropoff" | "driver", google.maps.Marker | null>>({
    pickup: null,
    dropoff: null,
    driver: null,
  });
  const routeRefs = useRef<{ casing: google.maps.Polyline | null; line: google.maps.Polyline | null }>({
    casing: null,
    line: null,
  });
  const directionsRef = useRef<google.maps.DirectionsService | null>(null);
  const hasFittedRef = useRef(false);
  const routeKeyRef = useRef("");

  const validPickup = isValidLatLng(pickup) ? pickup : null;
  const validDropoff = isValidLatLng(dropoff) ? dropoff : null;
  const validDriver = isValidLatLng(driver) ? driver : null;

  const initialCenter = useMemo(
    () => validDriver ?? validPickup ?? validDropoff ?? SWIFTMUV_DEFAULT_CENTER,
    [validDriver, validPickup, validDropoff],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!ready || !element || mapRef.current) return;

    const maps = window.google.maps;
    mapRef.current = new maps.Map(element, {
      center: initialCenter,
      zoom: 13,
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "greedy",
      backgroundColor: "#0B0F14",
      styles: SWIFTMUV_DARK_MAP_STYLES,
    });
    directionsRef.current = new maps.DirectionsService();
  }, [initialCenter, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const maps = window.google.maps;

    const syncMarker = (key: "pickup" | "dropoff" | "driver", position: LatLngLiteral | null) => {
      const existing = markerRefs.current[key];
      if (!position) {
        existing?.setMap(null);
        markerRefs.current[key] = null;
        return;
      }
      if (existing) {
        existing.setPosition(position);
        return;
      }
      markerRefs.current[key] = new maps.Marker({
        map,
        position,
        icon: key === "driver" ? driverIcon(maps) : markerSymbol(maps, key),
        zIndex: key === "driver" ? 5 : 3,
      });
    };

    syncMarker("pickup", validPickup);
    syncMarker("dropoff", validDropoff);
    syncMarker("driver", validDriver);
  }, [ready, validDropoff, validDriver, validPickup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const maps = window.google.maps;
    const origin = routeMode === "directions" ? validDriver : validPickup;
    const destination = routeMode === "directions" ? validPickup : validDropoff;
    const pathBase = [validDriver, validPickup, validDropoff].filter(isValidLatLng);
    const routeKey = [routeMode, origin?.lat, origin?.lng, destination?.lat, destination?.lng, validDropoff?.lat, validDropoff?.lng].join("|");
    if (routeKey === routeKeyRef.current) return;
    routeKeyRef.current = routeKey;

    const clearRoute = () => {
      routeRefs.current.casing?.setMap(null);
      routeRefs.current.line?.setMap(null);
      routeRefs.current = { casing: null, line: null };
    };

    const fitPath = (path: LatLngLiteral[]) => {
      const boundsPoints = [...path, validDropoff].filter(isValidLatLng);
      if (!boundsPoints.length) return;
      const bounds = googleBoundsFor(maps, boundsPoints);
      if (boundsPoints.length === 1) {
        map.setCenter(boundsPoints[0]);
        map.setZoom(14);
        return;
      }
      const padding = showLiveBadge || fitMode === "smart" ? compactPadding : defaultPadding;
      if (fitMode === "always" || !hasFittedRef.current) {
        map.fitBounds(bounds, padding);
        hasFittedRef.current = true;
        return;
      }
      const visible = map.getBounds();
      const allVisible = visible && boundsPoints.every((point) => visible.contains(point));
      if (!allVisible) map.panToBounds(bounds, padding);
    };

    const drawRoute = (path: LatLngLiteral[]) => {
      clearRoute();
      if (path.length < 2) {
        fitPath(pathBase);
        return;
      }
      const routeStyle = routeMode === "directions" ? TRACKING_ROUTE_LINE : ROUTE_LINE;
      const casingStyle = routeMode === "directions" ? TRACKING_ROUTE_CASING : ROUTE_CASING;
      routeRefs.current.casing = new maps.Polyline({ ...casingStyle, path, map });
      routeRefs.current.line = new maps.Polyline({ ...routeStyle, path, map });
      fitPath(path);
    };

    if (!origin || !destination) {
      clearRoute();
      fitPath(pathBase);
      return;
    }

    if (routeMode !== "directions") {
      drawRoute([origin, destination]);
      return;
    }

    let cancelled = false;
    directionsRef.current?.route(
      {
        origin,
        destination,
        travelMode: maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;
        if (status === maps.DirectionsStatus.OK && result?.routes?.[0]) {
          const route = result.routes[0];
          const routePath = route.overview_path.map((point) => ({ lat: point.lat(), lng: point.lng() }));
          drawRoute(routePath);
          const seconds = route.legs?.[0]?.duration?.value;
          if (typeof seconds === "number") onEtaUpdate?.(Math.max(1, Math.round(seconds / 60)));
          return;
        }
        drawRoute([origin, destination]);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [fitMode, onEtaUpdate, ready, routeMode, showLiveBadge, validDropoff, validDriver, validPickup]);

  useEffect(
    () => () => {
      routeRefs.current.casing?.setMap(null);
      routeRefs.current.line?.setMap(null);
      markerRefs.current.pickup?.setMap(null);
      markerRefs.current.dropoff?.setMap(null);
      markerRefs.current.driver?.setMap(null);
      mapRef.current = null;
    },
    [],
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-background", rounded && "rounded-2xl", className)}>
      <div ref={containerRef} className="h-full w-full" />

      {(!ready || error) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background text-xs text-muted-foreground">
          {error ? "Map unavailable" : fallbackText}
        </div>
      )}

      {showLiveBadge && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 shadow-md backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-xs font-semibold text-foreground">LIVE</span>
        </div>
      )}
    </div>
  );
};
