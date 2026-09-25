import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleMap } from "@capacitor/google-maps";
import { Loader2, WifiOff } from "lucide-react";
import DriverTrackingMap from "@/components/tracking/DriverTrackingMap";
import { useLiveDriverLocation } from "@/hooks/useLiveDriverLocation";
import { SWIFTMUV_DARK_MAP_STYLES, SWIFTMUV_DEFAULT_CENTER, type LatLngLiteral } from "@/lib/mapCore";

interface Props {
  bookingId: string;
  target: LatLngLiteral | null; // pickup or destination
  destination?: LatLngLiteral | null;
  onDriverPosition?: (p: LatLngLiteral | null) => void;
  onEtaUpdate?: (min: number) => void;
}

const MAP_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim() ||
  "AIzaSyDjl-mHd2ViaJq2SaPeHV_s7CpaRFqWkV0";

/** Tween a marker from its last position to the new one over ~1s. */
function useSmoothPosition(target: LatLngLiteral | null) {
  const [pos, setPos] = useState<LatLngLiteral | null>(target);
  const fromRef = useRef<LatLngLiteral | null>(target);
  useEffect(() => {
    if (!target) return;
    const from = fromRef.current;
    if (!from) {
      fromRef.current = target;
      setPos(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1000);
      const e = t * (2 - t);
      const p = { lat: from.lat + (target.lat - from.lat) * e, lng: from.lng + (target.lng - from.lng) * e };
      fromRef.current = p;
      setPos(p);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target?.lat, target?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return pos;
}

const NativeLiveMap = ({ driver, target, destination }: { driver: LatLngLiteral | null; target: LatLngLiteral | null; destination: LatLngLiteral | null }) => {
  const elRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const driverMarker = useRef<string | null>(null);
  const targetMarker = useRef<string | null>(null);
  const destinationMarker = useRef<string | null>(null);
  const routeLines = useRef<string[]>([]);
  const fitted = useRef(false);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!elRef.current) return;
        const center = target ?? driver ?? SWIFTMUV_DEFAULT_CENTER;
        const map = await GoogleMap.create({
          id: `swiftmuv-live-trip-${Date.now()}`,
          element: elRef.current,
          apiKey: MAP_KEY,
          config: { center, zoom: 14, styles: SWIFTMUV_DARK_MAP_STYLES, disableDefaultUI: true } as never,
        });
        if (cancelled) return map.destroy();
        mapRef.current = map;
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Map failed to load");
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.destroy().catch(() => {});
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !target) return;
    (async () => {
      if (targetMarker.current) await map.removeMarker(targetMarker.current).catch(() => {});
      targetMarker.current = await map.addMarker({ coordinate: target, title: "Pickup", tintColor: { r: 255, g: 193, b: 7, a: 1 } });
    })();
  }, [ready, target?.lat, target?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !destination) return;
    (async () => {
      if (destinationMarker.current) await map.removeMarker(destinationMarker.current).catch(() => {});
      destinationMarker.current = await map.addMarker({ coordinate: destination, title: "Destination", tintColor: { r: 255, g: 193, b: 7, a: 1 } });
    })();
  }, [ready, destination?.lat, destination?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !driver || busy.current) return;
    busy.current = true;
    (async () => {
      try {
        const old = driverMarker.current;
        driverMarker.current = await map.addMarker({ coordinate: driver, title: "Driver", tintColor: { r: 43, g: 178, b: 255, a: 1 } });
        if (old) await map.removeMarker(old).catch(() => {});
        if (target) {
          if (routeLines.current.length) await map.removePolylines(routeLines.current).catch(() => {});
          routeLines.current = await map.addPolylines([
            { path: [driver, target], strokeColor: "#2BB2FF", strokeOpacity: 1, strokeWeight: 6 },
          ]);
        }
        if (!fitted.current && target) {
          fitted.current = true;
          await map.setCamera({
            coordinate: { lat: (driver.lat + target.lat) / 2, lng: (driver.lng + target.lng) / 2 },
            zoom: 13,
            animate: true,
          });
        }
      } finally {
        busy.current = false;
      }
    })();
  }, [ready, driver?.lat, driver?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0">
      <capacitor-google-map ref={elRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-xs text-white/60">{error}</div>
      )}
    </div>
  );
};

/**
 * Live trip tracking: realtime driver position from the booking row,
 * smooth marker movement, loading and connection-lost states.
 */
const LiveTripMap = ({ bookingId, target, destination = null, onDriverPosition, onEtaUpdate }: Props) => {
  const { position, connection } = useLiveDriverLocation(bookingId);
  const smooth = useSmoothPosition(position);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    onDriverPosition?.(position);
  }, [position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-full w-full bg-black">
      {native ? (
        <NativeLiveMap driver={smooth} target={target} destination={destination} />
      ) : (
        <DriverTrackingMap driverLocation={smooth} pickupLocation={target} dropoffLocation={destination} onEtaUpdate={onEtaUpdate} />
      )}

      {!position && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-xs text-white/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          Waiting for the driver's live location…
        </div>
      )}

      {connection === "reconnecting" && (
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-[11px] font-semibold text-destructive-foreground">
          <WifiOff className="h-3 w-3" /> Reconnecting…
        </div>
      )}
    </div>
  );
};

export default LiveTripMap;
