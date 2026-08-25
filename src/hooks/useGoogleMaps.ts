/// <reference types="google.maps" />
import { useEffect, useState } from "react";

const LOCAL_BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const LOVABLE_BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
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

const getBrowserKey = () => {
  const key = LOCAL_BROWSER_KEY || LOVABLE_BROWSER_KEY;
  return key?.trim();
};

const buildScriptUrl = (key: string) => {
  const params = new URLSearchParams({
    key,
    v: "weekly",
    libraries: "places",
    loading: "async",
    callback: "__swiftmuvGoogleMapsReady",
  });
  if (TRACKING_ID) params.set("channel", TRACKING_ID);
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
};

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps cannot load outside the browser"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  const browserKey = getBrowserKey();
  if (!browserKey) return Promise.reject(new Error("Google Maps browser key missing"));

  loaderPromise = new Promise((resolve, reject) => {
    let settled = false;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      loaderPromise = null;
      reject(new Error(message));
    };
    const succeed = () => {
      if (settled) return;
      if (!window.google?.maps?.importLibrary) {
        fail("Google Maps loaded but did not initialize correctly");
        return;
      }
      settled = true;
      resolve(window.google);
    };

    const timeout = window.setTimeout(() => {
      fail("Google Maps took too long to load. Check the browser key and network access.");
    }, LOAD_TIMEOUT_MS);

    window.__swiftmuvGoogleMapsReady = () => {
      window.clearTimeout(timeout);
      succeed();
    };
    window.gm_authFailure = () => {
      window.clearTimeout(timeout);
      window.dispatchEvent(new Event(AUTH_FAILURE_EVENT));
      fail("Google Maps rejected this app origin or API key");
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("error", () => fail("Failed to load Google Maps"), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = buildScriptUrl(browserKey);
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      fail("Failed to load Google Maps");
    };
    document.head.appendChild(script);
  });

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
    const handleAuthFailure = () => {
      if (!active) return;
      setReady(false);
      setError("Google Maps rejected this app origin or API key");
    };

    window.addEventListener(AUTH_FAILURE_EVENT, handleAuthFailure);
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
      window.removeEventListener(AUTH_FAILURE_EVENT, handleAuthFailure);
    };
  }, [enabled]);

  return { ready, error };
}
