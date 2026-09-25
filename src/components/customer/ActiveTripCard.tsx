import { useEffect, useMemo, useRef, useState } from "react";
import { KeyRound, Share2, Copy, LifeBuoy, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVehicleImage } from "@/lib/vehicleImages";
import JobChatSheet from "@/components/shared/JobChatSheet";
import DriverInfoCard from "@/components/customer/DriverInfoCard";
import LiveTripMap from "@/components/tracking/LiveTripMap";
import { haversineKm, type LatLngLiteral } from "@/lib/mapCore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Capacitor } from "@capacitor/core";

interface Props {
  bookingId: string;
  pickupAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  bookingStatus?: string;
  fullScreen?: boolean;
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


const ActiveTripCard = ({ bookingId, pickupAddress, pickupLat, pickupLng, dropoffLat, dropoffLng, bookingStatus, fullScreen = false }: Props) => {
  const { t } = useI18n();
  const [info, setInfo] = useState<DriverInfo | null>(null);
  const [completionCode, setCompletionCode] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [routeEtaMin, setRouteEtaMin] = useState<number | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
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
          setAssignmentLoading(false);
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
      setAssignmentLoading(false);
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

  const [liveDriverPos, setLiveDriverPos] = useState<LatLngLiteral | null>(null);
  const driverPos = useMemo<LatLngLiteral | null>(
    () =>
      liveDriverPos ??
      (info?.current_lat != null && info?.current_lng != null ? { lat: info.current_lat, lng: info.current_lng } : null),
    [liveDriverPos, info?.current_lat, info?.current_lng],
  );
  const pickupPos = useMemo<LatLngLiteral | null>(
    () => (pickupLat != null && pickupLng != null ? { lat: pickupLat, lng: pickupLng } : null),
    [pickupLat, pickupLng],
  );
  const dropoffPos = useMemo<LatLngLiteral | null>(
    () => (dropoffLat != null && dropoffLng != null ? { lat: dropoffLat, lng: dropoffLng } : null),
    [dropoffLat, dropoffLng],
  );

  const km = driverPos && pickupPos ? haversineKm(driverPos, pickupPos) : null;
  const miles = km != null ? km * 0.621371 : null;
  const etaMin = routeEtaMin ?? (km != null ? Math.max(1, Math.round((km / 30) * 60)) : null);

  const photo = info?.profile_picture_url || info?.avatar_url || undefined;
  const carImg = info ? info.vehicle_photo_url || getVehicleImage(info.vehicle_category) : undefined;
  const initials = (info?.full_name ?? t("cust.trip.driver"))
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const vehicleLabel = info ? [info.vehicle_color, info.vehicle_make, info.vehicle_model].filter(Boolean).join(" ") : "";
  const native = Capacitor.isNativePlatform();

  return (
    <div className={fullScreen ? "fixed inset-0 z-30 overflow-hidden bg-background text-foreground" : "overflow-hidden rounded-2xl bg-background text-foreground"}>
      <div className={fullScreen ? (native ? "absolute inset-0 bottom-[290px] bg-background" : "absolute inset-0 bg-background") : "relative h-56 w-full bg-background"}>
        <LiveTripMap
          bookingId={bookingId}
          target={pickupPos}
          destination={dropoffPos}
          showWaitingOverlay={Boolean(info)}
          onDriverPosition={setLiveDriverPos}
          onEtaUpdate={setRouteEtaMin}
        />

        {miles != null && (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground shadow-lg">
            {t("cust.trip.milesAway", { miles: miles.toFixed(1) })}
          </div>
        )}
      </div>

      {info ? <DriverInfoCard
        className={fullScreen ? "absolute inset-x-0 bottom-0 z-20 max-h-[54vh] animate-in slide-in-from-bottom-6 overflow-y-auto rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+3rem)] duration-500" : undefined}
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
                    `https://www.google.com/maps/search/?api=1&query=${pickupPos.lat},${pickupPos.lng}`,
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
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-3">
            <KeyRound className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase text-muted-foreground">{t("cust.trip.completionCode")}</p>
              <p className="text-xs text-muted-foreground">{t("cust.trip.shareCodeNote")}</p>
            </div>
            <p className="font-mono text-xl font-bold tracking-[0.3em]">{completionCode}</p>
          </div>
        )}
      </DriverInfoCard> : (
        <div className={fullScreen ? "absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-border bg-card px-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-3 shadow-2xl" : "border-t border-border bg-card p-6"}>
          <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-muted" />
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold">{assignmentLoading ? "Checking your trip…" : "Finding your driver"}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {bookingStatus === "pending" ? "Nearby drivers can see your request now." : "Your driver details will appear here as soon as they accept."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-lg bg-muted/60 p-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Pick-up point</p>
              <p className="mt-1 truncate text-sm font-medium">{pickupAddress}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveTripCard;
