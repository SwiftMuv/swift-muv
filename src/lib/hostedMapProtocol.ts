export const HOSTED_MAP_ORIGIN = "https://swift-muv.lovable.app";
export const HOSTED_MAP_PATH = "/mobile-map";
export type MapPoint = { lat: number; lng: number };
export interface HostedMapState {
  pickup: MapPoint | null;
  dropoff: MapPoint | null;
  driver: MapPoint | null;
  routePath: MapPoint[];
  fitMode: "always" | "smart";
  showLiveBadge: boolean;
}
export const usesHostedMap = (platform: string) => platform === "ios";
export const validMapPoint = (value: unknown): value is MapPoint => {
  if (!value || typeof value !== "object") return false;
  const point = value as MapPoint;
  return Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
};
export function parseMapState(value: unknown): HostedMapState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as HostedMapState;
  if (![state.pickup, state.dropoff, state.driver].every(p => p === null || validMapPoint(p))) return null;
  if (!Array.isArray(state.routePath) || state.routePath.length > 10000 || !state.routePath.every(validMapPoint)) return null;
  if (!["always", "smart"].includes(state.fitMode) || typeof state.showLiveBadge !== "boolean") return null;
  const point = (p: MapPoint | null) => p ? { lat: p.lat, lng: p.lng } : null;
  return { pickup: point(state.pickup), dropoff: point(state.dropoff), driver: point(state.driver), routePath: state.routePath.map(p => ({ lat: p.lat, lng: p.lng })), fitMode: state.fitMode, showLiveBadge: state.showLiveBadge };
}
export const allowedMapParent = (origin: string) => ["capacitor://localhost", "ionic://localhost", "null"].includes(origin);
export function acceptsMapMessage(event: { origin: string; source: unknown; data: unknown }, expectedWindow: unknown, channel: string, fromParent: boolean) {
  if (!expectedWindow || event.source !== expectedWindow || !channel) return false;
  if (fromParent ? !allowedMapParent(event.origin) : event.origin !== HOSTED_MAP_ORIGIN) return false;
  const data = event.data as { channel?: unknown } | null;
  return Boolean(data && data.channel === channel);
}