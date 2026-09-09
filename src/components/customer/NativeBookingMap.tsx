import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleMap, LatLngBounds } from "@capacitor/google-maps";
import { SWIFTMUV_DEFAULT_CENTER, isValidLatLng, type LatLngLiteral } from "@/lib/mapCore";

interface Props {
  pickup?: LatLngLiteral | null;
  dropoff?: LatLngLiteral | null;
  onReady: () => void;
  onError: (message: string) => void;
}

const NATIVE_MAP_ID = "swiftmuv-booking-map";
const ANDROID_MAP_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim() ||
  "AIzaSyDjl-mHd2ViaJq2SaPeHV_s7CpaRFqWkV0";

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

/** Native Android map rendered beneath the transparent Capacitor WebView. */
export const NativeBookingMap = ({ pickup, dropoff, onReady, onError }: Props) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerIdsRef = useRef<string[]>([]);
  const polylineIdsRef = useRef<string[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    document.documentElement.classList.add("native-map-visible");
    document.body.classList.add("native-map-visible");
    document.getElementById("root")?.classList.add("native-map-visible");

    let cancelled = false;
    let observer: ResizeObserver | null = null;

    const createMap = async () => {
      const element = elementRef.current;
      if (!element) return;

      // Android cannot mount a native surface into a zero-sized element.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) break;
        await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
      }
      if (cancelled) return;

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        throw new Error("map container has no size");
      }

      const center = isValidLatLng(pickup) ? pickup : SWIFTMUV_DEFAULT_CENTER;
      const map = await GoogleMap.create({
        id: NATIVE_MAP_ID,
        element,
        apiKey: ANDROID_MAP_KEY,
        forceCreate: true,
        config: {
          center,
          zoom: isValidLatLng(pickup) ? 14 : 12,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          androidLiteMode: false,
        },
      });

      if (cancelled) {
        await map.destroy();
        return;
      }

      mapRef.current = map;
      setMapReady(true);
      await map.enableTouch();
      try {
        await map.enableCurrentLocation(true);
      } catch {
        // The base map remains usable if location permission is declined.
      }
      observer = new ResizeObserver(() => window.dispatchEvent(new Event("resize")));
      observer.observe(element);
      onReadyRef.current();
    };

    createMap().catch((error: unknown) => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : String(error);
        onErrorRef.current(`Native Google Map failed: ${message}`);
      }
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      const map = mapRef.current;
      mapRef.current = null;
      setMapReady(false);
      if (map) void map.destroy().catch(() => undefined);
      document.documentElement.classList.remove("native-map-visible");
      document.body.classList.remove("native-map-visible");
      document.getElementById("root")?.classList.remove("native-map-visible");
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    let cancelled = false;
    const syncRoute = async () => {
      if (markerIdsRef.current.length) await map.removeMarkers(markerIdsRef.current);
      if (polylineIdsRef.current.length) await map.removePolylines(polylineIdsRef.current);
      markerIdsRef.current = [];
      polylineIdsRef.current = [];

      const points = [pickup, dropoff].filter(isValidLatLng);
      if (points.length) {
        markerIdsRef.current = await map.addMarkers(
          points.map((coordinate, index) => ({
            coordinate,
            title: index === 0 ? "Pickup" : "Drop-off",
          })),
        );
      }
      if (points.length === 2) {
        polylineIdsRef.current = await map.addPolylines([
          { path: points, strokeColor: "#0F172A", strokeOpacity: 1, strokeWeight: 6 },
        ]);
        const southwest = {
          lat: Math.min(points[0].lat, points[1].lat),
          lng: Math.min(points[0].lng, points[1].lng),
        };
        const northeast = {
          lat: Math.max(points[0].lat, points[1].lat),
          lng: Math.max(points[0].lng, points[1].lng),
        };
        await map.fitBounds(new LatLngBounds({
          southwest,
          center: {
            lat: (southwest.lat + northeast.lat) / 2,
            lng: (southwest.lng + northeast.lng) / 2,
          },
          northeast,
        }), 80);
      } else if (points.length === 1) {
        await map.setCamera({ coordinate: points[0], zoom: 14, animate: true });
      }
    };

    syncRoute().catch((error: unknown) => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : String(error);
        onErrorRef.current(`Native Google Map failed: ${message}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mapReady, pickup, dropoff]);

  return (
    <capacitor-google-map
      ref={(element) => {
        elementRef.current = element;
      }}
      className="absolute inset-0 block h-full w-full"
      aria-label="Booking route map"
    />
  );
};

export default NativeBookingMap;