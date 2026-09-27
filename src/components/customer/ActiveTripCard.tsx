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
import { phoneNotify } from "@/lib/phoneNotify";

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [routeEtaMin, setRouteEtaMin] = useState<number | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const driverIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("id, driver_id, status")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (!job?.driver_id) {
        if (active) {
          setInfo(null);
          setJobId(null);
          setAssignmentLoading(false);
        }
        return;
      }
      driverIdRef.current = job.driver_id;
      if (active) {
        setJobId(job.id);
        setJobStatus((job as { status?: string }).status ?? null);
      }
      const { data: profile } = await         supabase
          .from("driver_profiles")
          .select(
            "full_name, avatar_url, profile_picture_url, license_plate, vehicle_make, vehicle_model, vehicle_color, vehicle_category, vehicle_photo_url, rating, phone, current_lat, current_lng",
          )
          .eq("user_id", job.driver_id)
          .maybeSingle();
      if (!active) return;
      // Keep the last good snapshot if a transient read returns nothing.
      if (profile) setInfo(profile as unknown as DriverInfo);
      setAssignmentLoading(false);
    };
    load();
    // Poll fast until a driver is attached, then slower as a safety net.
    const poll = setInterval(() => {
      if (!driverIdRef.current || Date.now() % 3 === 0) void load();
    }, 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    const channel = supabase
      .channel(`active-trip-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `booking_id=eq.${bookingId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        () => load(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });
    return () => {
      active = false;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      supabase.removeChannel(channel);
    };
  }, [bookingId, bookingStatus]);

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

  // Phase 1: driver → pick-up. Phase 2 (after "arrived at pick-up"): pick-up → drop-off.
  const toDropoff =
    ["arrived", "loading", "in_transit"].includes(jobStatus ?? "") || bookingStatus === "in_progress";
  const navTarget = toDropoff ? dropoffPos : pickupPos;
  useEffect(() => setRouteEtaMin(null), [toDropoff]);

  const km = driverPos && navTarget ? haversineKm(driverPos, navTarget) : null;
  const miles = km != null ? km * 0.621371 : null;
  const etaMin = routeEtaMin ?? (km != null ? Math.max(1, Math.round((km / 30) * 60)) : null);

  // Live countdown to the driver's arrival at the pick-up point.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [arrivalAt, setArrivalAt] = useState<number | null>(null);
  useEffect(() => {
    if (etaMin == null || toDropoff) { setArrivalAt(null); return; }
    setArrivalAt(Date.now() + etaMin * 60_000);
  }, [etaMin, toDropoff]);
  const remainingMs = arrivalAt != null ? Math.max(0, arrivalAt - now) : null;
  const countdown = remainingMs != null
    ? `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}`
    : null;
  const arrivalClock = arrivalAt != null
    ? new Date(arrivalAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  // Phone alerts: at 5 min away, then every 2 min, then on arrival.
  const lastAlertRef = useRef<number | null>(null);
  const arrivedAlertRef = useRef(false);
  useEffect(() => {
    if (!info || toDropoff || etaMin == null) return;
    if (etaMin > 5) return;
    const last = lastAlertRef.current;
    if (last == null || Date.now() - last >= 2 * 60_000) {
      lastAlertRef.current = Date.now();
      void phoneNotify(
        etaMin <= 1 ? "Your driver is almost there" : `Your driver is ${etaMin} min away`,
        `${info.full_name ?? "Your driver"} will reach the pick-up point around ${arrivalClock ?? "soon"}.`,
      );
    }
  }, [etaMin, now, toDropoff, info]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (jobStatus === "arrived" && !arrivedAlertRef.current) {
      arrivedAlertRef.current = true;
      void phoneNotify("Your driver has arrived", `${info?.full_name ?? "Your driver"} is at the pick-up point.`);
    }
  }, [jobStatus, info?.full_name]);

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
          key={toDropoff ? "to-dropoff" : "to-pickup"}
          target={navTarget}
          destination={null}
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
        statusTitle={
          toDropoff
            ? jobStatus === "arrived" ? "Your driver has arrived" : etaMin != null ? `Drop-off in ${etaMin} min` : "On the way to drop-off"
            : countdown != null ? `Pick-up in ${countdown}` : t("cust.trip.driverOnWay")
        }
        statusSubtitle={
          !toDropoff && arrivalClock ? `Arriving at the pick-up point around ${arrivalClock}` : t("cust.trip.meetAtSpot")
        }
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
                await navigator.clipboard.writeText(pickupAddress);
                toast.success(t("cust.trip.addressCopied"));
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> {t("cust.trip.copyAddress")}
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

        <TripProgress
          pickup={pickupPos}
          dropoff={dropoffPos}
          driver={driverPos}
          bookingStatus={bookingStatus}
          jobStatus={jobStatus}
        />
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

const STAGES = ["Accepted", "Picked up", "In transit", "Delivered"];

/** Pickup → drop-off meter driven by live driver GPS and the job's status. */
const TripProgress = ({
  pickup, dropoff, driver, bookingStatus, jobStatus,
}: {
  pickup: LatLngLiteral | null;
  dropoff: LatLngLiteral | null;
  driver: LatLngLiteral | null;
  bookingStatus?: string;
  jobStatus: string | null;
}) => {
  const done = jobStatus === "completed" || bookingStatus === "completed";
  const toDropoff = done || jobStatus === "loading" || jobStatus === "in_transit" || bookingStatus === "in_progress";
  const total = pickup && dropoff ? haversineKm(pickup, dropoff) : null;
  let pct = 0;
  let left: number | null = null;
  let label = "Driver heading to pick-up";
  if (done) {
    pct = 100; left = 0; label = "Delivered";
  } else if (toDropoff) {
    label = jobStatus === "loading" ? "Loading your items" : "On the way to drop-off";
    left = driver && dropoff ? haversineKm(driver, dropoff) : total;
    // Loading counts as having started; travel fills the rest of the bar.
    const travelled = total && left != null ? Math.max(0, Math.min(1, (total - left) / total)) : 0;
    pct = Math.round(10 + travelled * 89);
  } else if (jobStatus === "arrived") {
    label = "Driver has arrived at pick-up"; pct = 8; left = total;
  } else {
    left = driver && pickup ? haversineKm(driver, pickup) : null;
    pct = 3;
  }
  const stage = done ? 3 : jobStatus === "in_transit" ? 2 : toDropoff ? 1 : 0;
  return (
    <div className="mb-3 rounded-xl border border-border bg-muted/60 p-3" aria-label="Trip progress">
      <div className="mb-2 flex justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{label}</span>
        <span>{left != null && !done ? `${left.toFixed(1)} km ${toDropoff ? "to drop-off" : "to pick-up"}` : ""}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-4 text-[10px] uppercase">
        {STAGES.map((s, i) => (
          <span key={s} className={`${i === 0 ? "text-left" : i === 3 ? "text-right" : "text-center"} ${i <= stage ? "font-semibold text-primary" : "text-muted-foreground"}`}>{s}</span>
        ))}
      </div>
    </div>
  );
};

export default ActiveTripCard;
