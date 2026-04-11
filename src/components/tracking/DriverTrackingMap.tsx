import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const driverIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;background:#0fa968;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H6.3a2 2 0 0 0-1.6.9L2 9.5l-2 1.1V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  </div>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const pickupIcon = new L.DivIcon({
  html: `<div style="width:32px;height:32px;background:#0fa968;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="6"/></svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const dropoffIcon = new L.DivIcon({
  html: `<div style="width:32px;height:32px;background:#e8a000;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#e8a000"/></svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Simulated route points (Austin area)
const ROUTE_POINTS: [number, number][] = [
  [30.2849, -97.7341],
  [30.2801, -97.7360],
  [30.2758, -97.7382],
  [30.2720, -97.7405],
  [30.2690, -97.7390],
  [30.2665, -97.7365],
  [30.2640, -97.7340],
  [30.2615, -97.7310],
  [30.2595, -97.7285],
  [30.2580, -97.7260],
  [30.2570, -97.7235],
  [30.2555, -97.7210],
];

const PICKUP: [number, number] = [30.2555, -97.7210];
const DROPOFF: [number, number] = [30.2200, -97.6900];

function AnimateMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 1 });
  }, [center, map]);
  return null;
}

interface DriverTrackingMapProps {
  onEtaUpdate?: (minutes: number) => void;
}

const DriverTrackingMap = ({ onEtaUpdate }: DriverTrackingMapProps) => {
  const [driverIndex, setDriverIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDriverIndex((prev) => {
        const next = Math.min(prev + 1, ROUTE_POINTS.length - 1);
        const remaining = ROUTE_POINTS.length - 1 - next;
        onEtaUpdate?.(remaining * 4);
        return next;
      });
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, [onEtaUpdate]);

  const driverPos = ROUTE_POINTS[driverIndex];
  const traveledPath = ROUTE_POINTS.slice(0, driverIndex + 1);
  const remainingPath = ROUTE_POINTS.slice(driverIndex);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <MapContainer
        center={[30.270, -97.730]}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <AnimateMap center={driverPos} />

        {/* Remaining route */}
        <Polyline
          positions={remainingPath}
          pathOptions={{ color: "hsl(160, 84%, 39%)", weight: 4, opacity: 0.4, dashArray: "8, 8" }}
        />
        {/* Traveled route */}
        <Polyline
          positions={traveledPath}
          pathOptions={{ color: "hsl(160, 84%, 39%)", weight: 4, opacity: 1 }}
        />

        {/* Driver */}
        <Marker position={driverPos} icon={driverIcon}>
          <Popup>Driver is here</Popup>
        </Marker>

        {/* Pickup */}
        <Marker position={PICKUP} icon={pickupIcon}>
          <Popup>Pickup location</Popup>
        </Marker>

        {/* Dropoff */}
        <Marker position={DROPOFF} icon={dropoffIcon}>
          <Popup>Drop-off location</Popup>
        </Marker>
      </MapContainer>

      {/* Live indicator */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <span className="text-xs font-semibold text-foreground">LIVE</span>
      </div>
    </div>
  );
};

export default DriverTrackingMap;
