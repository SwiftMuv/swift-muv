import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

let nextId = 1000;

/** Show a phone notification (native local notification or browser Notification) plus an in-app toast. */
export async function phoneNotify(title: string, body: string) {
  toast.info(title, { description: body });
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* ignore */ }
  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") return;
      await LocalNotifications.schedule({ notifications: [{ id: nextId++, title, body }] });
      return;
    }
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") new Notification(title, { body, icon: "/favicon.png" });
  } catch { /* notification unavailable */ }
}
