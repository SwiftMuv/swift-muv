/// <reference types="google.maps" />
import { useEffect, useState } from "react";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;

let loaderPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __lovableGoogleMapsInit?: () => void;
    gm_authFailure?: () => void;
    google: typeof google;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps browser key missing"));

  loaderPromise = new Promise((resolve, reject) => {
    window.__lovableGoogleMapsInit = () => {
      if (window.google?.maps?.importLibrary) resolve(window.google);
      else reject(new Error("Google Maps did not initialize"));
    };
    window.gm_authFailure = () => {
      loaderPromise = null;
      reject(new Error("Google Maps rejected this app origin or API key"));
    };
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__lovableGoogleMapsInit",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState<boolean>(
    typeof window !== "undefined" && !!window.google?.maps,
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (ready) return;
    loadGoogleMaps()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [ready]);
  return { ready, error };
}
