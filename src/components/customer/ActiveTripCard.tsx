import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Phone, MessageSquare, MoreHorizontal, Star, KeyRound, Share2, Copy, LifeBuoy, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVehicleImage } from "@/lib/vehicleImages";
import JobChatSheet from "@/components/shared/JobChatSheet";
import DriverInfoCard from "@/components/customer/DriverInfoCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  bookingId: string;
  pickupAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
}

interface DriverInfo {
  full_name: string | null;
  avatar_url: string | null;
  profile_picture_url: string | null;
  license_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_category: string | null;
  vehicle_photo_url: string | null;
  rating: number | null;
  phone: string | null;
  current_lat: number | null;
  current_lng: number | null;
}

const carIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;background:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.6)">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H6.3a2 2 0 0 0-1.6.9L2 9.5l-2 1.1V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  </div>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const pickupIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
    <div style="background:#fff;color:#000;font:600 11px/1 'DM Sans',sans-serif;padding:5px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.5)">Pick-up spot</div>
    <div style="width:14px;height:14px;background:#fff;border:3px solid #000;border-radius:3px"></div>
  </div>`,
  className: "",
  iconSize: [90, 40],
  iconAnchor: [45, 40],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
  }, [map, points]);
  return null;
}

const haversineKm = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const ActiveTripCard = ({ bookingId, pickupAddress, pickupLat, pickupLng }: Props) => {
  const { t } = useI18n();
  const [info, setInfo] = useState<DriverInfo | null>(null);
  const [completionCode, setCompletionCode] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const driverIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("id, driver_id")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (!job?.driver_id) {
        if (active) {
          setInfo(null);
          setCompletionCode(null);
          setJobId(null);
        }
        return;
      }
      driverIdRef.current = job.driver_id;
      if (active) setJobId(job.id);
      const [{ data: profile }, { data: code }] = await Promise.all([
        supabase
          .from("driver_profiles")
          .select(
            "full_name, avatar_url, profile_picture_url, license_plate, vehicle_make, vehicle_model, vehicle_color, vehicle_category, vehicle_photo_url, rating, phone, current_lat, current_lng",
          )
          .eq("user_id", job.driver_id)
          .maybeSingle(),
        supabase.rpc("get_job_completion_code", { _job_id: job.id }),
      ]);
      if (!active) return;
      setInfo((profile as unknown as DriverInfo) ?? null);
      setCompletionCode((code as string | null) ?? null);
    };
    load();
    const poll = setInterval(load, 10000);

    const channel = supabase
      .channel(`active-trip-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `booking_id=eq.${bookingId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const driverPos = useMemo<[number, number] | null>(
    () => (info?.current_lat != null && info?.current_lng != null ? [info.current_lat, info.current_lng] : null),
    [info?.current_lat, info?.current_lng],
  );
  const pickupPos = useMemo<[number, number] | null>(
    () => (pickupLat != null && pickupLng != null ? [pickupLat, pickupLng] : null),
    [pickupLat, pickupLng],
  );

  if (!info) return null;

  const points = [driverPos, pickupPos].filter(Boolean) as [number, number][];
  const km = driverPos && pickupPos ? haversineKm(driverPos, pickupPos) : null;
  const miles = km != null ? km * 0.621371 : null;
  const etaMin = km != null ? Math.max(1, Math.round((km / 30) * 60)) : null;

  const photo = info.profile_picture_url || info.avatar_url || undefined;
  const carImg = info.vehicle_photo_url || getVehicleImage(info.vehicle_category);
  const initials = (info.full_name ?? t("cust.trip.driver"))
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const vehicleLabel = [info.vehicle_color, info.vehicle_make, info.vehicle_model].filter(Boolean).join(" ");

  return (
    <div className="overflow-hidden rounded-2xl bg-black text-white">
      {/* Map */}
      <div className="relative h-56 w-full bg-black">
        {points.length > 0 ? (
          <MapContainer
            center={points[0]}
            zoom={14}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
            className="h-full w-full"
            style={{ background: "#000000" }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <FitBounds points={points} />
            {points.length === 2 && (
              <>
                <Polyline positions={points} pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.25 }} />
                <Polyline positions={points} pathOptions={{ color: "#ffffff", weight: 4, opacity: 1 }} />
              </>
            )}
            {pickupPos && <Marker position={pickupPos} icon={pickupIcon} />}
            {driverPos && <Marker position={driverPos} icon={carIcon} />}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/50">
            {t("cust.trip.waitingLocation")}
          </div>
        )}

        {miles != null && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-lg">
            {t("cust.trip.milesAway", { miles: miles.toFixed(1) })}
          </div>
        )}
      </div>

      <DriverInfoCard
        statusTitle={etaMin != null ? t("cust.trip.pickupInMin", { min: etaMin }) : t("cust.trip.driverOnWay")}
        statusSubtitle={t("cust.trip.meetAtSpot")}
        pickupAddress={pickupAddress}
        driverName={info.full_name ?? t("cust.trip.yourDriver")}
        driverPhoto={photo}
        driverInitials={initials}
        driverRating={info.rating ?? 5}
        vehicleModel={vehicleLabel}
        licensePlate={info.license_plate ?? ""}
        isTopRated={(info.rating ?? 0) >= 4.9}
        vehicleImage={carImg}
        messageLabel={t("cust.trip.message")}
        callLabel={t("cust.trip.call")}
        optionsLabel={t("cust.trip.options")}
        onMessage={() => {
          if (!jobId) {
            toast.error(t("cust.trip.chatUnavailable"));
            return;
          }
          setChatOpen(true);
        }}
        onCall={() => {
          if (!info.phone) {
            toast.error(t("cust.trip.phoneUnavailable"));
            return;
          }
          window.location.href = `tel:${info.phone}`;
        }}
        optionsItems={
          <>
            <DropdownMenuItem
              onSelect={async () => {
                const text = t("cust.trip.shareTrackingText", {
                  driver: info.full_name ?? t("cust.trip.assigned"),
                  plate: info.license_plate ? ` (${info.license_plate})` : "",
                  pickup: pickupAddress,
                  eta: etaMin != null ? t("cust.trip.etaSuffix", { min: etaMin }) : "",
                });
                try {
                  if (navigator.share) {
                    await navigator.share({ title: "My SwiftMuv trip", text, url: window.location.href });
                  } else {
                    await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
                    toast.success(t("cust.trip.tripDetailsCopied"));
                  }
                } catch {
                  /* user dismissed share */
                }
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> {t("cust.trip.shareTripStatus")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                if (pickupPos) {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${pickupPos[0]},${pickupPos[1]}`,
                    "_blank",
                    "noopener",
                  );
                } else {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`,
                    "_blank",
                    "noopener",
                  );
                }
              }}
            >
              <MapPin className="mr-2 h-4 w-4" /> {t("cust.trip.openPickupMaps")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await navigator.clipboard.writeText(completionCode ?? pickupAddress);
                toast.success(completionCode ? t("cust.trip.completionCodeCopied") : t("cust.trip.addressCopied"));
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> {completionCode ? t("cust.trip.copyCompletionCode") : t("cust.trip.copyAddress")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const subject = t("cust.trip.supportSubject", { job: jobId ? ` (job ${jobId.slice(0, 8)})` : "" });
                window.location.href = `mailto:support@swiftmuv.com?subject=${encodeURIComponent(subject)}`;
              }}
            >
              <LifeBuoy className="mr-2 h-4 w-4" /> {t("cust.trip.contactSupport")}
            </DropdownMenuItem>
          </>
        }
      >
        {jobId && (
          <JobChatSheet
            jobId={jobId}
            open={chatOpen}
            onOpenChange={setChatOpen}
            title={info.full_name ? t("cust.trip.chatWith", { name: info.full_name }) : t("cust.trip.chatWithDriver")}
          />
        )}

        {completionCode && (
          <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
            <KeyRound className="h-5 w-5 shrink-0 text-white/70" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-white/50">{t("cust.trip.completionCode")}</p>
              <p className="text-xs text-white/70">{t("cust.trip.shareCodeNote")}</p>
            </div>
            <p className="font-mono text-xl font-bold tracking-[0.3em]">{completionCode}</p>
          </div>
        )}
      </DriverInfoCard>
    </div>
  );
};

export default ActiveTripCard;
