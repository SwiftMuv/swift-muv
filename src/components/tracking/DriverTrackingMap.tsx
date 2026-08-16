/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface DriverTrackingMapProps {
  driverLocation?: LatLngLiteral | null;
  pickupLocation?: LatLngLiteral | null;
  dropoffLocation?: LatLngLiteral | null;
  onEtaUpdate?: (minutes: number) => void;
}

/* Simulated fallback route (used when no live coordinates are supplied) */
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

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1b1b1b" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d3d3d" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e0e" }] },
];

const CAR_ICON_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">
      <circle cx="23" cy="23" r="17" fill="#111" stroke="#fff" stroke-width="3"/>
      <g transform="translate(12,12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H6.3a2 2 0 0 0-1.6.9L2 9.5l-2 1.1V16c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </g>
    </svg>`,
  );

const dotIcon = (fill: string): google.maps.Symbol => ({
  path: window.google.maps.SymbolPath.CIRCLE,
  scale: 8,
  fillColor: fill,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 3,
});

const DriverTrackingMap = ({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  onEtaUpdate,
}: DriverTrackingMapProps) => {
  const { ready, error } = useGoogleMaps(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const casingRef = useRef<google.maps.Polyline | null>(null);
  const routeRef = useRef<google.maps.Polyline | null>(null);
  const directionsRef = useRef<google.maps.DirectionsService | null>(null);
  const didFitRef = useRef(false);
  const lastRouteKeyRef = useRef<string>("");

  // Simulation fallback when the parent does not stream live coordinates
  const [simIndex, setSimIndex] = useState(0);
  const simulate = !driverLocation || !pickupLocation;

  useEffect(() => {
    if (!simulate) return;
    const id = setInterval(() => {
      setSimIndex((prev) => {
        const next = Math.min(prev + 1, SIM_ROUTE.length - 1);
        onEtaUpdate?.((SIM_ROUTE.length - 1 - next) * 4);
        return next;
      });
    }, 10000);
    return () => clearInterval(id);
  }, [simulate, onEtaUpdate]);

  const driver = driverLocation ?? SIM_ROUTE[simIndex];
  const pickup = pickupLocation ?? SIM_PICKUP;

  /* Init map once */
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const g = window.google;
    const map = new g.maps.Map(containerRef.current, {
      center: driver,
      zoom: 13,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      clickableIcons: false,
      backgroundColor: "#1b1b1b",
      styles: DARK_MAP_STYLE,
    });
    mapRef.current = map;
    directionsRef.current = new g.maps.DirectionsService();

    casingRef.current = new g.maps.Polyline({
      map,
      strokeColor: "#0b0b0b",
      strokeOpacity: 0.9,
      strokeWeight: 10,
      zIndex: 1,
    });
    routeRef.current = new g.maps.Polyline({
      map,
      strokeColor: "#2BB2FF",
      strokeOpacity: 1,
      strokeWeight: 6,
      zIndex: 2,
    });

    pickupMarkerRef.current = new g.maps.Marker({ map, position: pickup, icon: dotIcon("#0fa968"), zIndex: 3 });
    driverMarkerRef.current = new g.maps.Marker({
      map,
      position: driver,
      icon: { url: CAR_ICON_SVG, scaledSize: new g.maps.Size(46, 46), anchor: new g.maps.Point(23, 23) },
      zIndex: 5,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* Dropoff marker (optional) */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (!dropoffLocation) {
      dropoffMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current = null;
      return;
    }
    if (!dropoffMarkerRef.current) {
      dropoffMarkerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        icon: dotIcon("#e8a000"),
        zIndex: 3,
      });
    }
    dropoffMarkerRef.current.setPosition(dropoffLocation);
  }, [ready, dropoffLocation]);

  /* Live updates: marker position, route path, bounds */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;

    driverMarkerRef.current?.setPosition(driver);
    pickupMarkerRef.current?.setPosition(pickup);

    const applyPath = (path: google.maps.LatLngLiteral[]) => {
      casingRef.current?.setPath(path);
      routeRef.current?.setPath(path);

      const bounds = new g.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      if (dropoffLocation) bounds.extend(dropoffLocation);

      if (!didFitRef.current) {
        map.fitBounds(bounds, 72);
        didFitRef.current = true;
      } else {
        // Keep both endpoints visible without resetting zoom/view on every tick
        const visible = map.getBounds();
        if (!visible || !visible.contains(driver) || !visible.contains(pickup)) {
          map.panToBounds(bounds, 72);
        }
      }
    };

    const key = `${driver.lat.toFixed(4)},${driver.lng.toFixed(4)}|${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}`;
    if (key === lastRouteKeyRef.current) return;
    lastRouteKeyRef.current = key;

    let cancelled = false;
    directionsRef.current?.route(
      {
        origin: driver,
        destination: pickup,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;
        if (status === g.maps.DirectionsStatus.OK && result?.routes?.[0]) {
          const route = result.routes[0];
          const path = route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          applyPath(path);
          const secs = route.legs?.[0]?.duration?.value;
          if (secs != null) onEtaUpdate?.(Math.max(1, Math.round(secs / 60)));
        } else {
          // Fallback: straight wired line between driver and pickup
          applyPath([driver, pickup]);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [ready, driver.lat, driver.lng, pickup.lat, pickup.lng, dropoffLocation, onEtaUpdate]);

  /* Cleanup */
  useEffect(
    () => () => {
      casingRef.current?.setMap(null);
      routeRef.current?.setMap(null);
      driverMarkerRef.current?.setMap(null);
      pickupMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current?.setMap(null);
      mapRef.current = null;
    },
    [],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#1b1b1b]">
      <div ref={containerRef} className="h-full w-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
          {error ? "Map unavailable" : "Loading map…"}
        </div>
      )}

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 shadow-md backdrop-blur-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2BB2FF] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2BB2FF]" />
        </span>
        <span className="text-xs font-semibold text-white">LIVE</span>
      </div>
    </div>
  );
};

export default DriverTrackingMap;
