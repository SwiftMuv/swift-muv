import { useEffect, useRef, useState } from "react";
import { HOSTED_MAP_ORIGIN, HOSTED_MAP_PATH, acceptsMapMessage, parseMapState, type HostedMapState } from "@/lib/hostedMapProtocol";
import { cn } from "@/lib/utils";

export function HostedIosMap({ state, className, rounded, fallbackText = "Loading map…" }: { state: HostedMapState; className?: string; rounded?: boolean; fallbackText?: string }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [channel] = useState(() => crypto.randomUUID());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(state);
  latest.current = state;
  const send = () => {
    const safe = parseMapState(latest.current);
    if (safe) iframe.current?.contentWindow?.postMessage({ type: "swiftmuv:map-state", channel, state: safe }, HOSTED_MAP_ORIGIN);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => setError("Map unavailable — update the published SwiftMuv website and reopen the app."), 20000);
    const receive = (event: MessageEvent) => {
      if (!acceptsMapMessage(event, iframe.current?.contentWindow, channel, false)) return;
      if (event.data.type === "swiftmuv:map-ready") {
        window.clearTimeout(timer);
        setReady(true);
        setError(null);
        send();
      }
    };
    window.addEventListener("message", receive);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [channel]);
  useEffect(() => { if (ready) send(); }, [state, ready]);
  return <div className={cn("relative h-full w-full overflow-hidden bg-background", rounded && "rounded-2xl", className)}>
    <iframe ref={iframe} title="SwiftMuv trip map" src={`${HOSTED_MAP_ORIGIN}${HOSTED_MAP_PATH}#${channel}`} className="h-full w-full border-0" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" />
    {(!ready || error) && <div className="pointer-events-none absolute inset-x-0 top-16 bg-background px-6 py-6 text-center text-xs text-muted-foreground">{error ?? fallbackText}</div>}
  </div>;
}