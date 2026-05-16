import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * While `enabled` is true, continuously watch the device's GPS and
 * push current_lat / current_lng to driver_profiles every ~10s
 * (or whenever the position changes meaningfully).
 */
export function useDriverGeolocation(userId: string | undefined, enabled: boolean) {
  const lastSentAt = useRef(0);
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!userId || !enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const push = async (lat: number, lng: number) => {
      lastCoords.current = { lat, lng };
      lastSentAt.current = Date.now();
      await supabase
        .from("driver_profiles")
        .update({
          current_lat: lat,
          current_lng: lng,
          location_updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    };

    const onPos = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const now = Date.now();
      const moved =
        !lastCoords.current ||
        Math.abs(lastCoords.current.lat - latitude) > 0.0002 ||
        Math.abs(lastCoords.current.lng - longitude) > 0.0002;
      if (now - lastSentAt.current > 10_000 || moved) {
        push(latitude, longitude);
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      console.warn("Geolocation error:", err.message);
    };

    // Initial fast fix
    navigator.geolocation.getCurrentPosition(onPos, onErr, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });

    // Continuous watch
    const watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 20_000,
    });

    // Periodic heartbeat in case watchPosition is quiet (driver stationary)
    const interval = window.setInterval(() => {
      if (lastCoords.current) push(lastCoords.current.lat, lastCoords.current.lng);
    }, 30_000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(interval);
    };
  }, [userId, enabled]);
}
