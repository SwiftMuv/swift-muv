import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Pops a real-time alert (in-app + system notification when allowed) when a customer's trip completes. */
const TripCompleteListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default" && window.top === window.self) {
      Notification.requestPermission().catch(() => {});
    }
    const ch = supabase
      .channel(`trip-complete-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { type: string; title: string; body: string | null; data: { receipt_url?: string } };
          if (n.type !== "trip_complete") return;
          const url = n.data?.receipt_url;
          toast.success(n.title, {
            description: n.body ?? undefined,
            duration: 15000,
            action: url ? { label: "View receipt", onClick: () => navigate(url) } : undefined,
          });
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              const sys = new Notification(n.title, { body: n.body ?? "", icon: "/favicon.png" });
              sys.onclick = () => { window.focus(); if (url) navigate(url); };
            }
          } catch { /* not supported in this webview */ }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, navigate]);

  return null;
};

export default TripCompleteListener;
