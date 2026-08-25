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
  const cameraRef = useRef<{ coordinate: LatLngLiteral; zoom: number }>({
    coordinate: SWIFTMUV_DEFAULT_CENTER,
    zoom: 13,
  });
  // 0 = no live native map. Increments on every successful (re)creation so the
  // route/marker effect re-applies its overlays onto the fresh map instance.
  const [mapEpoch, setMapEpoch] = useState(0);

  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isNativeAndroid()) return;

    const host = hostRef.current;
    const element = elementRef.current;
    if (!host || !element) return;

    let active = true;
    let startupTimer: number | undefined;
    let rebuildTimer: number | undefined;
    let creating = false;
    let announcedReady = false;
    let lastSize = { width: 0, height: 0 };

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

    const hasUsableSize = () => {
      const bounds = measuredBounds();
      return bounds.width > 1 && bounds.height > 1 ? bounds : null;
    };

    const waitForNonZeroBounds = (timeoutMs = 8000) =>
      new Promise<ReturnType<typeof measuredBounds>>((resolve, reject) => {
        const immediate = hasUsableSize();
        if (immediate) {
          resolve(immediate);
          return;
        }

        let settled = false;
        let poll: number | undefined;
        let observer: ResizeObserver | undefined;
        const finish = (bounds: ReturnType<typeof measuredBounds> | null) => {
          if (settled) return;
          settled = true;
          observer?.disconnect();
          if (poll) window.clearInterval(poll);
          window.clearTimeout(timer);
          if (bounds) resolve(bounds);
          else reject(new Error("map container has no size"));
        };

        observer = new ResizeObserver(() => finish(hasUsableSize()));
        observer.observe(element);
        // Layout can settle without a ResizeObserver entry (e.g. WebView first
        // paint after a route change), so poll as a safety net.
        poll = window.setInterval(() => finish(hasUsableSize()), 120);
        const timer = window.setTimeout(() => finish(hasUsableSize()), timeoutMs);
      });

    const destroyCurrentMap = async () => {
      const map = mapRef.current;
      mapRef.current = null;
      markerIdsRef.current = [];
      polylineIdsRef.current = [];
      if (!map) return;
      try {
        await map.destroy();
      } catch {
        /* map already gone */
      }
    };

    const createNativeMap = async () => {
      if (!active || creating) return;
      creating = true;
      try {
        applyFullScreenBounds();
        await nextFrame();
        await nextFrame();
        const bounds = await waitForNonZeroBounds();
        if (!active) return;

        await destroyCurrentMap();

        startupTimer = window.setTimeout(() => {
          if (active && !mapRef.current) {
            onErrorRef.current(
              "Native Google Map failed: startup timed out. Verify the Android Maps SDK key, package name, SHA-1, and network access.",
            );
          }
        }, 12000);

        const map = await GoogleMap.create({
          id: MAP_ID,
          element,
          apiKey: NATIVE_MAP_KEY,
          forceCreate: true,
          config: {
            center: cameraRef.current.coordinate,
            zoom: cameraRef.current.zoom,
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

        if (startupTimer) window.clearTimeout(startupTimer);

        if (!active) {
          await map.destroy();
          return;
        }

        mapRef.current = map;
        lastSize = { width: bounds.width, height: bounds.height };
        setMapEpoch((epoch) => epoch + 1);
        if (!announcedReady) {
          announcedReady = true;
          onReadyRef.current();
        }
      } catch (error: unknown) {
        if (startupTimer) window.clearTimeout(startupTimer);
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        onErrorRef.current(friendlyNativeMapError(message));
      } finally {
        creating = false;
      }
    };

    // The native view is a separate Android surface: it does not reflow with the
    // WebView, so a real size change requires recreating it at the new bounds.
    const scheduleRebuild = (force = false) => {
      if (!active) return;
      if (rebuildTimer) window.clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(() => {
        if (!active) return;
        applyFullScreenBounds();
        const bounds = hasUsableSize();
        if (!bounds) return;
        const changed =
          Math.abs(bounds.width - lastSize.width) > 2 || Math.abs(bounds.height - lastSize.height) > 2;
        if (!force && mapRef.current && !changed) return;
        void createNativeMap();
      }, 220);
    };

    const handleViewportChange = () => {
      applyFullScreenBounds();
      scheduleRebuild();
    };

    // Remount after navigation / app resume: the native surface is detached when
    // the WebView page is hidden, so force a fresh map when we become visible.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") scheduleRebuild(true);
    };

    const hostObserver = new ResizeObserver(() => scheduleRebuild());
    hostObserver.observe(element);

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.addEventListener("pageshow", handleVisibility);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    document.addEventListener("visibilitychange", handleVisibility);

    void createNativeMap();

    return () => {
      active = false;
      if (startupTimer) window.clearTimeout(startupTimer);
      if (rebuildTimer) window.clearTimeout(rebuildTimer);
      hostObserver.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("pageshow", handleVisibility);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      setMapEpoch(0);
      document.documentElement.classList.remove("native-map-active");
      document.body.classList.remove("native-map-active");
      transparentAncestors.forEach((node) => node.classList.remove("native-map-host"));
      void destroyCurrentMap();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapEpoch || !map) return;

    let cancelled = false;

    const updateRoute = async () => {
      if (markerIdsRef.current.length) await map.removeMarkers(markerIdsRef.current);
      if (polylineIdsRef.current.length) await map.removePolylines(polylineIdsRef.current);
      markerIdsRef.current = [];
      polylineIdsRef.current = [];
      if (cancelled) return;

      const points = [pickup, dropoff].filter(isValidLatLng);
      if (points.length) {
        markerIdsRef.current = await map.addMarkers(
          points.map((coordinate, index) => ({
            coordinate,
            title: index === 0 ? "Pickup" : "Drop-off",
          })),
        );
      }
      if (cancelled) return;

      if (pickup && dropoff && isValidLatLng(pickup) && isValidLatLng(dropoff)) {
        const path = [pickup, dropoff];
        polylineIdsRef.current = await map.addPolylines([
          { path, strokeColor: ROUTE_CASING.strokeColor, strokeOpacity: ROUTE_CASING.strokeOpacity, strokeWeight: ROUTE_CASING.strokeWeight },
          { path, strokeColor: ROUTE_LINE.strokeColor, strokeOpacity: ROUTE_LINE.strokeOpacity, strokeWeight: ROUTE_LINE.strokeWeight },
        ]);
        const bounds = nativeBoundsFor(path);
        if (bounds) await map.fitBounds(new LatLngBounds(bounds), 80);
        cameraRef.current = {
          coordinate: {
            lat: (pickup.lat + dropoff.lat) / 2,
            lng: (pickup.lng + dropoff.lng) / 2,
          },
          zoom: 12,
        };
        return;
      }

      if (pickup && isValidLatLng(pickup)) {
        cameraRef.current = { coordinate: pickup, zoom: 14 };
        await map.setCamera({ coordinate: pickup, zoom: 14, animate: true });
      }
    };

    void updateRoute().catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      onErrorRef.current(`Native map route failed: ${message}`);
    });

    return () => {
      cancelled = true;
    };
  }, [mapEpoch, dropoff, pickup]);


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
