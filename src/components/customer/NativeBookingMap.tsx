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
    document.documentElement.classList.add("native-map-active");
    document.body.classList.add("native-map-active");

    GoogleMap.create({
      id: MAP_ID,
      element: elementRef.current,
      apiKey: "",
      forceCreate: true,
      config: {
        center: { lat: 45.5017, lng: -73.5673 },
        zoom: 13,
        styles,
      },
    })
      .then((map) => {
        if (!active) {
          void map.destroy();
          return;
        }
        mapRef.current = map;
        setCreated(true);
        onReadyRef.current();
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        onErrorRef.current(`Native Google Map failed: ${message}`);
      });

    return () => {
      active = false;
      setCreated(false);
      document.documentElement.classList.remove("native-map-active");
      document.body.classList.remove("native-map-active");
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