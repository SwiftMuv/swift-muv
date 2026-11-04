import { useEffect, useState } from "react";
import { BrowserGoogleRouteMap } from "@/components/maps/GoogleRouteMap";
import { acceptsMapMessage, parseMapState, type HostedMapState } from "@/lib/hostedMapProtocol";

// Rendering only: no auth provider, account lookup, or backend requests.
export default function HostedMap() {
  const [state, setState] = useState<HostedMapState | null>(null);
  useEffect(() => {
    const channel = window.location.hash.slice(1);
    if (!/^[a-f0-9-]{36}$/i.test(channel) || window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (!acceptsMapMessage(event, window.parent, channel, true) || event.data.type !== "swiftmuv:map-state") return;
      const safe = parseMapState(event.data.state);
      if (safe) setState(safe);
    };
    window.addEventListener("message", receive);
    // A local iOS custom-scheme parent has an opaque origin. This sends only
    // a readiness signal and nonce, never location or account information.
    window.parent.postMessage({ type: "swiftmuv:map-ready", channel }, "*");
    return () => window.removeEventListener("message", receive);
  }, []);
  return <main className="h-dvh w-full bg-background">
    {state && <BrowserGoogleRouteMap {...state} routeMode="straight" />}
  </main>;
}