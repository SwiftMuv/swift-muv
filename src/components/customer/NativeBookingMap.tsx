import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleMap, LatLngBounds } from "@capacitor/google-maps";

interface Point {
  lat: number;
  lng: number;
}

interface Props {
  pickup?: Point;
  dropoff?: Point;
  styles: google.maps.MapTypeStyle[];
  onReady: () => void;
  onError: (message: string) => void;
}

const MAP_ID = "swiftmuv-booking-map";

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const NativeBookingMap = ({ pickup, dropoff, styles, onReady, onError }: Props) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerIdsRef = useRef<string[]>([]);
  const polylineIdsRef = useRef<string[]>([]);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const [created, setCreated] = useState(false);

  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isNativeAndroid() || !elementRef.current) return;

    let active = true;
    let startupTimer: number | undefined;
    const mapElement = elementRef.current;
    const transparentAncestors: HTMLElement[] = [];
    let ancestor = mapElement.parentElement;
    while (ancestor) {
      ancestor.classList.add("native-map-host");
      transparentAncestors.push(ancestor);
      ancestor = ancestor.parentElement;
    }
    document.documentElement.classList.add("native-map-active");
    document.body.classList.add("native-map-active");

    const createMap = async () => {
      // Wait for the fixed map element to receive its final viewport bounds.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const bounds = mapElement.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) {
        throw new Error("map container has no size");
      }

      startupTimer = window.setTimeout(() => {
        if (active && !mapRef.current) {
          onErrorRef.current("Native map startup timed out. Verify the Android Maps SDK key and its package/SHA-1 restrictions.");
        }
      }, 12000);

      const map = await GoogleMap.create({
        id: MAP_ID,
        element: mapElement,
        apiKey: "native-manifest-key",
        forceCreate: true,
        config: {
          center: { lat: 45.5017, lng: -73.5673 },
          zoom: 13,
          styles,
        },
      });
      if (!active) {
        await map.destroy();
        return;
      }
      if (startupTimer) window.clearTimeout(startupTimer);
      mapRef.current = map;
      setCreated(true);
      onReadyRef.current();
    };

    void createMap().catch((error: unknown) => {
      if (startupTimer) window.clearTimeout(startupTimer);
      const message = error instanceof Error ? error.message : String(error);
      onErrorRef.current(`Native Google Map failed: ${message}`);
    });

    return () => {
      active = false;
      if (startupTimer) window.clearTimeout(startupTimer);
      setCreated(false);
      document.documentElement.classList.remove("native-map-active");
      document.body.classList.remove("native-map-active");
      transparentAncestors.forEach((element) => element.classList.remove("native-map-host"));
      const map = mapRef.current;
      mapRef.current = null;
      if (map) void map.destroy();
    };
  }, [styles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!created || !map) return;

    const updateRoute = async () => {
      if (markerIdsRef.current.length) await map.removeMarkers(markerIdsRef.current);
      if (polylineIdsRef.current.length) await map.removePolylines(polylineIdsRef.current);
      markerIdsRef.current = [];
      polylineIdsRef.current = [];

      const points = [pickup, dropoff].filter((point): point is Point => Boolean(point));
      if (points.length) {
        markerIdsRef.current = await map.addMarkers(
          points.map((coordinate) => ({ coordinate })),
        );
      }

      if (pickup && dropoff) {
        polylineIdsRef.current = await map.addPolylines([
          {
            path: [pickup, dropoff],
            strokeColor: "#FFFFFF",
            strokeOpacity: 1,
            strokeWeight: 8,
          },
          {
            path: [pickup, dropoff],
            strokeColor: "#0F172A",
            strokeOpacity: 1,
            strokeWeight: 5,
          },
        ]);
        await map.fitBounds(
          new LatLngBounds({
            southwest: {
              lat: Math.min(pickup.lat, dropoff.lat),
              lng: Math.min(pickup.lng, dropoff.lng),
            },
            center: {
              lat: (pickup.lat + dropoff.lat) / 2,
              lng: (pickup.lng + dropoff.lng) / 2,
            },
            northeast: {
              lat: Math.max(pickup.lat, dropoff.lat),
              lng: Math.max(pickup.lng, dropoff.lng),
            },
          }),
          80,
        );
      } else if (pickup) {
        await map.setCamera({ coordinate: pickup, zoom: 14, animate: true });
      }
    };

    void updateRoute().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      onErrorRef.current(`Native map route failed: ${message}`);
    });
  }, [created, dropoff, pickup]);

  return (
    <capacitor-google-map
      ref={(element) => {
        elementRef.current = element;
      }}
      className="absolute inset-0 block h-full w-full"
    />
  );
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "capacitor-google-map": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}