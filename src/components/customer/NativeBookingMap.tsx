import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleMap, LatLngBounds } from "@capacitor/google-maps";
import {
  ROUTE_CASING,
  ROUTE_LINE,
  SWIFTMUV_DARK_MAP_STYLES,
  SWIFTMUV_DEFAULT_CENTER,
  isValidLatLng,
  nativeBoundsFor,
  type LatLngLiteral,
} from "@/lib/mapCore";

interface Props {
  pickup?: LatLngLiteral | null;
  dropoff?: LatLngLiteral | null;
  onReady: () => void;
  onError: (message: string) => void;
}

const MAP_ID = "swiftmuv-native-booking-map";
const NATIVE_MAP_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
  "native-manifest-key";

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const getViewportSize = () => ({
  width: Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth)),
  height: Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight)),
});

const friendlyNativeMapError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("authorization") || lower.includes("api key") || lower.includes("apikey")) {
    return "Native Google Map failed: Android Maps key is not authorized. Enable Maps SDK for Android and allow package com.swiftmuv.app.v2 with the SHA-1 used to sign this APK.";
  }
  if (lower.includes("size") || lower.includes("width") || lower.includes("height")) {
    return "Native Google Map failed: map container has no size. Rebuild and sync Android so the latest map host sizing is bundled.";
  }
  return `Native Google Map failed: ${message}`;
};

export const NativeBookingMap = ({ pickup, dropoff, onReady, onError }: Props) => {
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
    const element = elementRef.current;
    if (!host || !element) return;

    let active = true;
    let startupTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const applyFullScreenBounds = () => {
      const { width, height } = getViewportSize();
      host.style.position = "fixed";
      host.style.inset = "0";
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;
      host.style.minWidth = "1px";
      host.style.minHeight = "1px";
      host.style.overflow = "hidden";
      element.style.display = "block";
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.minWidth = "1px";
      element.style.minHeight = "1px";
    };

    const transparentAncestors: HTMLElement[] = [];
    let ancestor: HTMLElement | null = host;
    while (ancestor) {
      ancestor.classList.add("native-map-host");
      transparentAncestors.push(ancestor);
      ancestor = ancestor.parentElement;
    }
    document.documentElement.classList.add("native-map-active");
    document.body.classList.add("native-map-active");

    const measuredBounds = () => {
      applyFullScreenBounds();
      const rect = element.getBoundingClientRect();
      const viewport = getViewportSize();
      return {
        width: Math.max(1, Math.round(rect.width || viewport.width)),
        height: Math.max(1, Math.round(rect.height || viewport.height)),
        x: Math.round(Number.isFinite(rect.x) ? rect.x : 0),
        y: Math.round(Number.isFinite(rect.y) ? rect.y : 0),
      };
    };

    const waitForNonZeroBounds = (timeoutMs = 5000) =>
      new Promise<ReturnType<typeof measuredBounds>>((resolve, reject) => {
        const read = () => {
          const bounds = measuredBounds();
          return bounds.width > 0 && bounds.height > 0 ? bounds : null;
        };
        const immediate = read();
        if (immediate) {
          resolve(immediate);
          return;
        }

        let settled = false;
        const finish = (bounds: ReturnType<typeof measuredBounds> | null) => {
          if (settled) return;
          settled = true;
          resizeObserver?.disconnect();
          window.clearTimeout(timer);
          if (bounds) resolve(bounds);
          else reject(new Error("map container has no size"));
        };

        resizeObserver = new ResizeObserver(() => finish(read()));
        resizeObserver.observe(element);
        const timer = window.setTimeout(() => finish(read()), timeoutMs);
      });

    const createNativeMap = async () => {
      applyFullScreenBounds();
      await nextFrame();
      await nextFrame();
      const bounds = await waitForNonZeroBounds();
      if (!active) return;

      startupTimer = window.setTimeout(() => {
        if (active && !mapRef.current) {
          onErrorRef.current("Native Google Map failed: startup timed out. Verify the Android Maps SDK key, package name, SHA-1, and network access.");
        }
      }, 12000);

      const map = await GoogleMap.create({
        id: MAP_ID,
        element,
        apiKey: NATIVE_MAP_KEY,
        forceCreate: true,
        config: {
          center: SWIFTMUV_DEFAULT_CENTER,
          zoom: 13,
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          mapTypeId: "roadmap",
          androidLiteMode: false,
          devicePixelRatio: window.devicePixelRatio || 1,
          styles: SWIFTMUV_DARK_MAP_STYLES,
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

    const resizeNativeMap = () => {
      applyFullScreenBounds();
      const map = mapRef.current;
      if (!map) return;
      const bounds = measuredBounds();
      void map.setCamera({ coordinate: pickup && isValidLatLng(pickup) ? pickup : SWIFTMUV_DEFAULT_CENTER, zoom: 13 });
      void GoogleMap.create({
        id: MAP_ID,
        element,
        apiKey: NATIVE_MAP_KEY,
        forceCreate: true,
        config: {
          center: pickup && isValidLatLng(pickup) ? pickup : SWIFTMUV_DEFAULT_CENTER,
          zoom: 13,
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          mapTypeId: "roadmap",
          androidLiteMode: false,
          devicePixelRatio: window.devicePixelRatio || 1,
          styles: SWIFTMUV_DARK_MAP_STYLES,
        },
      }).then((nextMap) => {
        if (!active) {
          void nextMap.destroy();
          return;
        }
        mapRef.current = nextMap;
        setCreated(true);
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        onErrorRef.current(friendlyNativeMapError(message));
      });
    };

    window.addEventListener("resize", resizeNativeMap);
    window.addEventListener("orientationchange", resizeNativeMap);

    void createNativeMap().catch((error: unknown) => {
      if (startupTimer) window.clearTimeout(startupTimer);
      const message = error instanceof Error ? error.message : String(error);
      onErrorRef.current(friendlyNativeMapError(message));
    });

    return () => {
      active = false;
      if (startupTimer) window.clearTimeout(startupTimer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeNativeMap);
      window.removeEventListener("orientationchange", resizeNativeMap);
      setCreated(false);
      document.documentElement.classList.remove("native-map-active");
      document.body.classList.remove("native-map-active");
      transparentAncestors.forEach((node) => node.classList.remove("native-map-host"));
      const map = mapRef.current;
      mapRef.current = null;
      if (map) void map.destroy();
    };
  }, [pickup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!created || !map) return;

    const updateRoute = async () => {
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

      if (pickup && dropoff && isValidLatLng(pickup) && isValidLatLng(dropoff)) {
        const path = [pickup, dropoff];
        polylineIdsRef.current = await map.addPolylines([
          { path, strokeColor: ROUTE_CASING.strokeColor, strokeOpacity: ROUTE_CASING.strokeOpacity, strokeWeight: ROUTE_CASING.strokeWeight },
          { path, strokeColor: ROUTE_LINE.strokeColor, strokeOpacity: ROUTE_LINE.strokeOpacity, strokeWeight: ROUTE_LINE.strokeWeight },
        ]);
        const bounds = nativeBoundsFor(path);
        if (bounds) await map.fitBounds(new LatLngBounds(bounds), 80);
        return;
      }

      if (pickup && isValidLatLng(pickup)) {
        await map.setCamera({ coordinate: pickup, zoom: 14, animate: true });
      }
    };

    void updateRoute().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      onErrorRef.current(`Native map route failed: ${message}`);
    });
  }, [created, dropoff, pickup]);

  return (
    <div ref={hostRef} className="absolute inset-0 block h-full w-full">
      <capacitor-google-map
        ref={(element) => {
          elementRef.current = element;
        }}
        className="block h-full w-full"
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
