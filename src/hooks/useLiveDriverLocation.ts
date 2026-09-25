import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LatLngLiteral } from "@/lib/mapCore";

export type RealtimeState = "connecting" | "live" | "reconnecting";

/**
 * Customer side: subscribes to the booking row and returns the latest
 * driver_lat / driver_lng. Falls back to polling while the realtime
 * connection is down and reconnects automatically.
 */
export function useLiveDriverLocation(bookingId: string | null | undefined) {
  const [position, setPosition] = useState<LatLngLiteral | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [connection, setConnection] = useState<RealtimeState>("connecting");

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    let poll: number | null = null;
    let retry: number | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const apply = (row: { driver_lat?: number | null; driver_lng?: number | null; driver_location_updated_at?: string | null }) => {
      if (!active) return;
      if (row.driver_lat != null && row.driver_lng != null) {
        setPosition({ lat: row.driver_lat, lng: row.driver_lng });
        setUpdatedAt(row.driver_location_updated_at ?? null);
      }
    };

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("driver_lat, driver_lng, driver_location_updated_at" as "id")
        .eq("id", bookingId)
        .maybeSingle();
      if (data) apply(data as never);
    };

    const startPolling = () => {
      if (poll === null) poll = window.setInterval(fetchOnce, 10_000);
    };
    const stopPolling = () => {
      if (poll !== null) window.clearInterval(poll);
      poll = null;
    };

    const subscribe = () => {
      channel = supabase
        .channel(`live-driver-${bookingId}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
          (payload) => apply(payload.new as never),
        )
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            setConnection("live");
            stopPolling();
            fetchOnce();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnection("reconnecting");
            startPolling();
            if (retry === null) {
              retry = window.setTimeout(() => {
                retry = null;
                if (channel) supabase.removeChannel(channel);
                if (active) subscribe();
              }, 5_000);
            }
          }
        });
    };

    fetchOnce();
    subscribe();
    return () => {
      active = false;
      stopPolling();
      if (retry !== null) window.clearTimeout(retry);
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return { position, updatedAt, connection };
}
