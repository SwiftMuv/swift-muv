/// <reference types="google.maps" />

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type MapMarkerRole = "pickup" | "dropoff" | "driver";

export const SWIFTMUV_DEFAULT_CENTER: LatLngLiteral = { lat: 45.5017, lng: -73.5673 };

export const SWIFTMUV_DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0B0F14" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#AAB2BD" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B0F14" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#263241" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0C1C13" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#263241" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#C2CAD4" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#344151" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#46566A" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#607086" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#202A36" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#06131C" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4B6476" }] },
];

export const ROUTE_CASING: Pick<google.maps.PolylineOptions, "strokeColor" | "strokeOpacity" | "strokeWeight" | "zIndex"> = {
  strokeColor: "#FFFFFF",
  strokeOpacity: 0.96,
  strokeWeight: 8,
  zIndex: 1,
};

export const ROUTE_LINE: Pick<google.maps.PolylineOptions, "strokeColor" | "strokeOpacity" | "strokeWeight" | "zIndex"> = {
  strokeColor: "#0F172A",
  strokeOpacity: 1,
  strokeWeight: 5,
  zIndex: 2,
};

export const TRACKING_ROUTE_CASING: Pick<google.maps.PolylineOptions, "strokeColor" | "strokeOpacity" | "strokeWeight" | "zIndex"> = {
  strokeColor: "#05070A",
  strokeOpacity: 0.9,
  strokeWeight: 10,
  zIndex: 1,
};

export const TRACKING_ROUTE_LINE: Pick<google.maps.PolylineOptions, "strokeColor" | "strokeOpacity" | "strokeWeight" | "zIndex"> = {
  strokeColor: "#2BB2FF",
  strokeOpacity: 1,
  strokeWeight: 6,
  zIndex: 2,
};

export const isValidLatLng = (point?: LatLngLiteral | null): point is LatLngLiteral =>
  Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180,
  );

export const midpoint = (a: LatLngLiteral, b: LatLngLiteral): LatLngLiteral => ({
  lat: (a.lat + b.lat) / 2,
  lng: (a.lng + b.lng) / 2,
});

export const haversineKm = (a: LatLngLiteral, b: LatLngLiteral) => {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const startLat = (a.lat * Math.PI) / 180;
  const endLat = (b.lat * Math.PI) / 180;
  const chord =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(chord));
};

export const googleBoundsFor = (maps: typeof google.maps, points: LatLngLiteral[]) => {
  const bounds = new maps.LatLngBounds();
  points.filter(isValidLatLng).forEach((point) => bounds.extend(point));
  return bounds;
};

export const nativeBoundsFor = (points: LatLngLiteral[]) => {
  const valid = points.filter(isValidLatLng);
  if (!valid.length) return null;
  const lats = valid.map((point) => point.lat);
  const lngs = valid.map((point) => point.lng);
  const southwest = { lat: Math.min(...lats), lng: Math.min(...lngs) };
  const northeast = { lat: Math.max(...lats), lng: Math.max(...lngs) };
  return { southwest, center: midpoint(southwest, northeast), northeast };
};

export const markerSymbol = (maps: typeof google.maps, role: Exclude<MapMarkerRole, "driver">): google.maps.Symbol => ({
  path: maps.SymbolPath.CIRCLE,
  scale: role === "pickup" ? 8 : 8,
  fillColor: role === "pickup" ? "#111827" : "#FFC107",
  fillOpacity: 1,
  strokeColor: "#FFFFFF",
  strokeWeight: 3,
});

export const driverIcon = (maps: typeof google.maps): google.maps.Icon => ({
  url:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r="17" fill="#05070A" stroke="#FFFFFF" stroke-width="3"/>
        <g transform="translate(12,12)" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H6.3a2 2 0 0 0-1.6.9L2 9.5l-2 1.1V16c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
        </g>
      </svg>`,
    ),
  scaledSize: new maps.Size(46, 46),
  anchor: new maps.Point(23, 23),
});
