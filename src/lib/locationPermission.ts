import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type LocationPermissionState = "granted" | "denied" | "prompt" | "unavailable";

let inflight: Promise<LocationPermissionState> | null = null;

/**
 * Ask for foreground location access gracefully.
 * - Native (Capacitor/Android): uses the Geolocation plugin, which maps to
 *   ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION declared in AndroidManifest.xml.
 * - Web: relies on the browser prompt (triggered lazily by getCurrentPosition).
 * Never throws — callers can safely fire-and-forget.
 */
export async function ensureLocationPermission(): Promise<LocationPermissionState> {
  if (inflight) return inflight;

  inflight = (async (): Promise<LocationPermissionState> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const current = await Geolocation.checkPermissions();
        if (current.location === "granted" || current.coarseLocation === "granted") {
          return "granted";
        }
        if (current.location === "denied") return "denied";
        const req = await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
        if (req.location === "granted" || req.coarseLocation === "granted") return "granted";
        return req.location === "denied" ? "denied" : "prompt";
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable";

      const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
      if (perms?.query) {
        try {
          const status = await perms.query({ name: "geolocation" as PermissionName });
          return status.state as LocationPermissionState;
        } catch {
          /* Safari / unsupported — fall through */
        }
      }
      return "prompt";
    } catch (err) {
      console.warn("Location permission check failed:", err);
      return "unavailable";
    } finally {
      // Allow a later re-check (e.g. user changed settings) after this resolves.
      setTimeout(() => {
        inflight = null;
      }, 0);
    }
  })();

  return inflight;
}

/** Single position read that works on both native and web. */
export async function getCurrentPositionSafe(): Promise<{ lat: number; lng: number } | null> {
  const state = await ensureLocationPermission();
  if (state === "denied" || state === "unavailable") return null;
  try {
    if (Capacitor.isNativePlatform()) {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    });
  } catch {
    return null;
  }
}
