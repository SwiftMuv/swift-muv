/// <reference types="google.maps" />
import { useEffect, useState } from "react";

// Project Google Maps browser key (Maps JavaScript API enabled). Baked in so
// native/Android builds always have a key even without a local .env file.
const FALLBACK_BROWSER_KEY = "AIzaSyDjl-mHd2ViaJq2SaPeHV_s7CpaRFqWkV0";
const LOCAL_BROWSER_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim() || FALLBACK_BROWSER_KEY;
const LOVABLE_BROWSER_KEY = (
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined
)?.trim();
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

const SCRIPT_ID = "swiftmuv-google-maps-js";
const AUTH_FAILURE_EVENT = "swiftmuv:google-maps-auth-failure";
const LOAD_TIMEOUT_MS = 15000;

let loaderPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __swiftmuvGoogleMapsReady?: () => void;
    gm_authFailure?: () => void;
    google: typeof google;
  }
}

/**
 * The Lovable managed key is referrer-restricted to *.lovable.app /
 * *.lovableproject.com, while the project's own key is restricted to the
 * production domain and the Capacitor `https://localhost` origin. Pick the key
 * that matches the current origin first, and keep the other one as a fallback
 * so a referrer rejection never leaves the map blank.
 */
const isLovableHost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
};

const getCandidateKeys = (): string[] => {
  const ordered = isLovableHost()
    ? [LOVABLE_BROWSER_KEY, LOCAL_BROWSER_KEY]
    : [LOCAL_BROWSER_KEY, LOVABLE_BROWSER_KEY];
  return ordered.filter((k): k is string => Boolean(k));
};

const buildScriptUrl = (key: string) => {
  const params = new URLSearchParams({
    key,
    v: "weekly",
    libraries: "places,geometry",
    loading: "async",
    callback: "__swiftmuvGoogleMapsReady",
  });
  if (TRACKING_ID) params.set("channel", TRACKING_ID);
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
};

const cleanupScript = () => {
  document.getElementById(SCRIPT_ID)?.remove();
  try {
    delete (window as unknown as Record<string, unknown>).google;
  } catch {
    /* noop */
  }
};

const loadWithKey = (key: string): Promise<typeof google> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.__swiftmuvGoogleMapsReady = undefined;
      window.gm_authFailure = undefined;
      fn();
    };

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error("Google Maps took too long to load")));
    }, LOAD_TIMEOUT_MS);

    window.__swiftmuvGoogleMapsReady = () => {
      if (!window.google?.maps?.importLibrary) {
        finish(() => reject(new Error("Google Maps loaded but did not initialize")));
        return;
      }
      finish(() => resolve(window.google));
    };

    window.gm_authFailure = () => {
      finish(() => reject(new Error("Google Maps rejected this origin or API key")));
    };

    cleanupScript();
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = buildScriptUrl(key);
    script.async = true;
    script.defer = true;
    script.onerror = () => finish(() => reject(new Error("Failed to load Google Maps")));
    document.head.appendChild(script);
  });

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps cannot load outside the browser"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  const keys = getCandidateKeys();
  if (keys.length === 0) return Promise.reject(new Error("Google Maps browser key missing"));

  loaderPromise = (async () => {
    let lastError: unknown = null;
    for (const key of keys) {
      try {
        return await loadWithKey(key);
      } catch (e) {
        lastError = e;
        cleanupScript();
      }
    }
    loaderPromise = null;
    window.dispatchEvent(new Event(AUTH_FAILURE_EVENT));
    throw lastError instanceof Error ? lastError : new Error("Google Maps failed to load");
  })();

  return loaderPromise;
}

export function useGoogleMaps(enabled = true) {
  const [ready, setReady] = useState<boolean>(
    enabled && typeof window !== "undefined" && Boolean(window.google?.maps?.importLibrary),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setError(null);
      return;
    }

    let active = true;
    loadGoogleMaps()
      .then(() => {
        if (!active) return;
        setReady(true);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setReady(false);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { ready, error };
}
