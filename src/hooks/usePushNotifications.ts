import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Registers the device for native push notifications (FCM on Android) and
 * stores the device token so the backend can target this phone. No-op on web.
 */
export const usePushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    let cancelled = false;

    void (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;

        await PushNotifications.addListener("registration", async (token) => {
          if (cancelled) return;
          await supabase.from("device_tokens").upsert(
            {
              user_id: user.id,
              token: token.value,
              platform: Capacitor.getPlatform(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" },
          );
        });

        await PushNotifications.addListener("registrationError", (err) => {
          console.warn("push registration error", err);
        });

        await PushNotifications.register();
      } catch (e) {
        console.warn("push notifications unavailable", e);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
};
