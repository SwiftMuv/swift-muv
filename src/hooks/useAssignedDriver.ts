import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm, type LatLngLiteral } from "@/lib/mapCore";

export interface AssignedDriver {
  driverId: string;
  fullName: string | null;
  phone: string | null;
  photoUrl: string | null;
  rating: number | null;
  licensePlate: string | null;
  vehicleLabel: string | null;
  vehicleCategory: string | null;
  position: LatLngLiteral | null;
}

/**
 * Live snapshot of the driver assigned to a booking: real name, phone number,
 * vehicle details and an expected arrival time derived from their last known
 * position. Refreshes on job/driver changes and every 10s while mounted.
 */
export const useAssignedDriver = (bookingId: string | null, pickup: LatLngLiteral | null) => {
  const [driver, setDriver] = useState<AssignedDriver | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setDriver(null);
      return;
    }
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data: job } = await supabase
          .from("jobs")
          .select("driver_id")
          .eq("booking_id", bookingId)
          .maybeSingle();
        if (!active) return;
        if (!job?.driver_id) {
          setDriver(null);
          return;
        }
        const { data: profile } = await supabase
          .from("driver_profiles")
          .select(
            "full_name, phone, avatar_url, profile_picture_url, rating, license_plate, vehicle_make, vehicle_model, vehicle_color, vehicle_year, vehicle_category, current_lat, current_lng",
          )
          .eq("user_id", job.driver_id)
          .maybeSingle();
        if (!active) return;
        if (!profile) {
          setDriver(null);
          return;
        }
        const vehicleLabel =
          [profile.vehicle_color, profile.vehicle_make, profile.vehicle_model, profile.vehicle_year]
            .filter(Boolean)
            .join(" ") || null;
        setDriver({
          driverId: job.driver_id,
          fullName: profile.full_name ?? null,
          phone: profile.phone ?? null,
          photoUrl: profile.profile_picture_url || profile.avatar_url || null,
          rating: profile.rating != null ? Number(profile.rating) : null,
          licensePlate: profile.license_plate ?? null,
          vehicleLabel,
          vehicleCategory: profile.vehicle_category ?? null,
          position:
            profile.current_lat != null && profile.current_lng != null
              ? { lat: profile.current_lat, lng: profile.current_lng }
              : null,
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const poll = setInterval(() => void load(), 10_000);
    const channel = supabase
      .channel(`assigned-driver-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_profiles" }, () => void load())
      .subscribe();

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Expected arrival at the pickup point from the driver's last known position
  // (~30 km/h city average) — the tracking map refines it with a real route.
  const etaMinutes =
    driver?.position && pickup ? Math.max(2, Math.round((haversineKm(driver.position, pickup) / 30) * 60)) : null;

  return { driver, loading, etaMinutes };
};
