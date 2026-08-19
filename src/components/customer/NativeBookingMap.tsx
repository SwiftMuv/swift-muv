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
  const hostRef = useRef<HTMLDivElement | null>(null);
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
    if (!isNativeAndroid()) return;
    const host = hostRef.current;
    const mapElement = elementRef.current;
    if (!host || !mapElement) return;

    let active = true;
    let startupTimer: number | undefined;

    // 1. Always give the host + custom element explicit pixel dimensions so the
    //    native bridge can never read a 0px bounding box.
    const applyExplicitSize = () => {
      const width = Math.max(1, Math.round(window.innerWidth));
      const height = Math.max(1, Math.round(window.innerHeight));
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;
      mapElement.style.display = "block";
      mapElement.style.width = `${width}px`;
      mapElement.style.height = `${height}px`;
    };
    applyExplicitSize();
    window.addEventListener("resize", applyExplicitSize);
    window.addEventListener("orientationchange", applyExplicitSize);

    const transparentAncestors: HTMLElement[] = [];
    let ancestor: HTMLElement | null = host;
    while (ancestor) {
      ancestor.classList.add("native-map-host");
      transparentAncestors.push(ancestor);
      ancestor = ancestor.parentElement;
    }
    document.documentElement.classList.add("native-map-active");
    document.body.classList.add("native-map-active");

    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    // 2. Wait for the layout engine to actually report a non-zero box.
    //    ResizeObserver resolves as soon as the box exists; the timeout guards
    //    against environments where it never fires.
    const waitForSize = (timeoutMs = 4000) =>
      new Promise<boolean>((resolve) => {
        const measure = () => {
          const rect = mapElement.getBoundingClientRect();
          return rect.width >= 1 && rect.height >= 1;
        };
        if (measure()) {
          resolve(true);
          return;
        }
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          window.clearTimeout(timer);
          resolve(ok);
        };
        const observer = new ResizeObserver(() => {
          if (measure()) finish(true);
        });
        observer.observe(mapElement);
        const timer = window.setTimeout(() => finish(measure()), timeoutMs);
      });

    const createMap = async () => {
      // Double rAF: let styles/layout settle after mount and sheet animation.
      await nextFrame();
      await nextFrame();

      let sized = await waitForSize();
      if (!sized) {
        // Fallback: pin the element to the viewport so it has real bounds,
        // then retry once before surfacing an error.
        host.style.position = "fixed";
        host.style.left = "0";
        host.style.top = "0";
        applyExplicitSize();
        await nextFrame();
        sized = await waitForSize(1500);
        if (!sized) throw new Error("map container has no size");
      }
      if (!active) return;

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
      window.removeEventListener("resize", applyExplicitSize);
      window.removeEventListener("orientationchange", applyExplicitSize);
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
    <div
      ref={hostRef}
      className="absolute inset-0 block h-full w-full"
      style={{ minWidth: "1px", minHeight: "1px" }}
    >
      <capacitor-google-map
        ref={(element) => {
          elementRef.current = element;
        }}
        className="block h-full w-full"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "capacitor-google-map": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
