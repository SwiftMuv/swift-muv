import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { ensureLocationPermission } from "@/lib/locationPermission";

export type BroadcastState = "idle" | "requesting" | "active" | "denied" | "error";

const MIN_INTERVAL_MS = 3_000;

/**
 * Driver side: watches the device GPS while a trip is active and writes
 * driver_lat / driver_lng onto the booking row (throttled to every ~5s).
 */
export function useBookingLocationBroadcast(
  bookingId: string | null | undefined,
  enabled: boolean,
  onPosition?: (lat: number, lng: number, accuracy: number | null) => void,
) {
  const [state, setState] = useState<BroadcastState>("idle");
  const onPosRef = useRef(onPosition);
  onPosRef.current = onPosition;

  useEffect(() => {
    if (!bookingId || !enabled) {
      setState("idle");
      return;
    }
    let cancelled = false;
    let lastSent = 0;
    let nativeWatch: string | null = null;
    let webWatch: number | null = null;

    const push = async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastSent < MIN_INTERVAL_MS) return;
      lastSent = now;
      const { error } = await supabase
        .from("bookings")
        .update({ driver_lat: lat, driver_lng: lng, driver_location_updated_at: new Date().toISOString() } as never)
        .eq("id", bookingId);
      if (error) {
        console.warn("Driver location update failed:", error.message);
        lastSent = 0; // retry on the next GPS reading
      }
    };

    (async () => {
      setState("requesting");
      const perm = await ensureLocationPermission();
      if (cancelled) return;
      if (perm === "denied" || perm === "unavailable") {
        setState("denied");
        return;
      }
      // Quick first fix (cached/low accuracy is fine) so the customer sees the driver immediately.
      const first = (lat: number, lng: number, acc: number | null) => {
        if (cancelled) return;
        setState("active");
        onPosRef.current?.(lat, lng, acc);
        lastSent = 0;
        push(lat, lng);
      };
      try {
        if (Capacitor.isNativePlatform()) {
          Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 })
            .then((p) => first(p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? null))
            .catch(() => {});
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (p) => first(p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? null),
            () => {},
            { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
          );
        }
      } catch { /* watch below still runs */ }
      try {
        if (Capacitor.isNativePlatform()) {
          nativeWatch = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
            (pos, err) => {
              if (err || !pos) return;
              setState("active");
              onPosRef.current?.(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null);
              push(pos.coords.latitude, pos.coords.longitude);
            },
          );
        } else if (navigator.geolocation) {
          webWatch = navigator.geolocation.watchPosition(
            (pos) => {
              setState("active");
              onPosRef.current?.(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null);
              push(pos.coords.latitude, pos.coords.longitude);
            },
            () => { if (!cancelled) setState((s) => (s === "active" ? s : "error")); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
          );
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      if (nativeWatch) Geolocation.clearWatch({ id: nativeWatch }).catch(() => {});
      if (webWatch !== null) navigator.geolocation.clearWatch(webWatch);
    };
  }, [bookingId, enabled]);

  return state;
}
