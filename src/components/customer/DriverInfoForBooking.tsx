import { useEffect, useState } from "react";
import { Car, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getVehicleImage } from "@/lib/vehicleImages";

interface Props {
  bookingId: string;
}

interface DriverInfo {
  full_name: string | null;
  avatar_url: string | null;
  profile_picture_url: string | null;
  license_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_category: string | null;
  vehicle_photo_url: string | null;
}

const DriverInfoForBooking = ({ bookingId }: Props) => {
  const [info, setInfo] = useState<DriverInfo | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("driver_id")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (!job?.driver_id) {
        if (active) setInfo(null);
        return;
      }
      const { data: profile } = await supabase
        .from("driver_profiles")
        .select("full_name, avatar_url, profile_picture_url, license_plate, vehicle_make, vehicle_model, vehicle_category, vehicle_photo_url")
        .eq("user_id", job.driver_id)
        .maybeSingle();
      if (active) setInfo((profile as DriverInfo) ?? null);
    };
    load();

    const channel = supabase
      .channel(`driver-info-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `booking_id=eq.${bookingId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  if (!info) return null;

  const photo = info.profile_picture_url || info.avatar_url || undefined;
  const carImg = getVehicleImage(info.vehicle_category);
  const initials = (info.full_name ?? "Driver")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const vehicleLabel = [info.vehicle_make, info.vehicle_model].filter(Boolean).join(" ");

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 flex items-center gap-3">
      <Avatar className="w-14 h-14 ring-2 ring-cyan-500/50">
        {photo && <AvatarImage src={photo} alt={info.full_name ?? "Driver"} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {info.full_name ?? "Your driver"}
        </p>
        {vehicleLabel && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Car className="w-3 h-3" /> {vehicleLabel}
          </p>
        )}
        {info.license_plate && (
          <p className="text-xs font-mono font-semibold text-cyan-500 flex items-center gap-1">
            <IdCard className="w-3 h-3" /> {info.license_plate}
          </p>
        )}
      </div>
      {carImg && (
        <img
          src={carImg}
          alt={vehicleLabel || "Vehicle"}
          className="w-20 h-14 object-contain shrink-0"
          loading="lazy"
        />
      )}
    </div>
  );
};

export default DriverInfoForBooking;
