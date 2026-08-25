import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleRouteMap } from "@/components/maps/GoogleRouteMap";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import type { LatLngLiteral } from "@/lib/mapCore";

interface Props {
  pickup?: LatLngLiteral | null;
  dropoff?: LatLngLiteral | null;
  onReady: () => void;
  onError: (message: string) => void;
}

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

/**
 * Native (Android WebView) booking map.
 *
 * Uses the Maps JavaScript API inside the WebView instead of the Capacitor
 * native Google Map surface: this avoids native container sizing problems and
 * the separate Android SDK key / SHA-1 restriction requirements.
 */
export const NativeBookingMap = ({ pickup, dropoff, onReady, onError }: Props) => {
  const { ready, error } = useGoogleMaps(true);
  const announcedRef = useRef(false);

  useEffect(() => {
    if (error) {
      onError(`Native Google Map failed: ${error}`);
      return;
    }
    if (ready && !announcedRef.current) {
      announcedRef.current = true;
      onReady();
      // Force a layout pass so the Android WebView paints tiles immediately.
      const timer = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
      return () => window.clearTimeout(timer);
    }
  }, [ready, error, onReady, onError]);

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-neutral-900">
      <GoogleRouteMap
        pickup={pickup}
        dropoff={dropoff}
        className="absolute inset-0 h-full w-full"
        routeMode="straight"
        fitMode="always"
        showUserLocation
        fallbackText="Loading map…"
      />

    </div>
  );
};

export default NativeBookingMap;
