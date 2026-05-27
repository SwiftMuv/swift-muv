import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DriverReviews from "@/components/DriverReviews";

interface Props {
  bookingId: string;
}

const DriverReviewsForBooking = ({ bookingId }: Props) => {
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("driver_id")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (active) setDriverId(data?.driver_id ?? null);
    })();
    return () => {
      active = false;
    };
  }, [bookingId]);

  if (!driverId) return null;
  return (
    <div className="pt-3 border-t border-border/40">
      <DriverReviews driverId={driverId} limit={3} title="Your driver's recent reviews" />
    </div>
  );
};

export default DriverReviewsForBooking;
