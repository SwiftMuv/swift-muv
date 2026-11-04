import { useEffect, useRef, useState } from "react";
import { HostedIosMap } from "./HostedIosMap";
import { decodePolyline, haversineKm, isValidLatLng, type LatLngLiteral } from "@/lib/mapCore";

interface Props {
  pickup?: LatLngLiteral | null; dropoff?: LatLngLiteral | null; driver?: LatLngLiteral | null;
  routePath?: LatLngLiteral[] | null; routeMode?: "straight" | "directions";
  fitMode?: "always" | "smart"; showLiveBadge?: boolean; rounded?: boolean;
  className?: string; fallbackText?: string; onEtaUpdate?: (minutes: number) => void;
}
export default function IosRouteMap(props: Props) {
  const [path, setPath] = useState<LatLngLiteral[]>([]);
  const last = useRef<{ time: number; origin: LatLngLiteral; target: string } | null>(null);
  const etaCallback = useRef(props.onEtaUpdate);
  etaCallback.current = props.onEtaUpdate;
  const pickup = isValidLatLng(props.pickup) ? props.pickup : null;
  const dropoff = isValidLatLng(props.dropoff) ? props.dropoff : null;
  const driver = isValidLatLng(props.driver) ? props.driver : null;
  useEffect(() => {
    if (props.routeMode !== "directions" || props.routePath?.length) return;
    const origin = driver ?? pickup;
    const nextStop = driver ? (pickup ?? dropoff) : dropoff;
    if (!origin || !nextStop) { setPath([]); return; }
    const target = `${nextStop.lat},${nextStop.lng}|${dropoff?.lat},${dropoff?.lng}`;
    if (last.current?.target === target && Date.now() - last.current.time < 30000 && haversineKm(last.current.origin, origin) < 0.1) return;
    last.current = { time: Date.now(), origin, target };
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        // Only the authenticated iPhone parent calls the backend; the hosted
        // page receives geometry alone. Reuse the existing bounded endpoint.
        const { supabase } = await import("@/integrations/supabase/client");
        const route = async (from: LatLngLiteral, to: LatLngLiteral) => {
          const { data, error } = await supabase.functions.invoke("calculate-distance", { body: { origin: `${from.lat},${from.lng}`, destination: `${to.lat},${to.lng}` } });
          if (error || data?.error || data?.fallback) throw new Error("Route unavailable");
          const points = decodePolyline(data?.polyline);
          if (points.length < 2) throw new Error("Route geometry unavailable");
          return { points, seconds: data.durationSec as unknown };
        };
        const first = await route(origin, nextStop);
        if (!active) return;
        setPath(first.points);
        if (driver && typeof first.seconds === "number" && Number.isFinite(first.seconds) && first.seconds >= 0) etaCallback.current?.(Math.max(1, Math.round(first.seconds / 60)));
        if (driver && pickup && dropoff) {
          const second = await route(pickup, dropoff);
          if (active) setPath([...first.points, ...second.points]);
        }
      } catch { if (active) setPath([]); }
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, driver?.lat, driver?.lng, props.routeMode, props.routePath]);
  return <HostedIosMap className={props.className} rounded={props.rounded} fallbackText={props.fallbackText} state={{ pickup, dropoff, driver, routePath: props.routePath?.length ? props.routePath : path, fitMode: props.fitMode ?? "always", showLiveBadge: props.showLiveBadge ?? false }} />;
}