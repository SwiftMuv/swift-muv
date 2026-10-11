import { Capacitor, registerPlugin } from "@capacitor/core";

interface BookingMapThemePlugin {
  applyDark(options: { id: string }): Promise<void>;
}

const BookingMapTheme = registerPlugin<BookingMapThemePlugin>("BookingMapTheme");

/** The Maps bridge does not forward colorScheme to the Android SDK. */
export const applyNativeBookingMapDarkTheme = async (id: string): Promise<void> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
  await BookingMapTheme.applyDark({ id });
};