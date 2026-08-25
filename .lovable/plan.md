# Rewrite the map code

Rewrite the app's map implementation so web and Android use one consistent map layer strategy, with a reliable native Android fallback and shared route/marker behavior.

## What will change

1. **Create a shared map foundation**
   - Add a reusable map utility/module for:
     - Google Maps style definitions
     - default Montreal center
     - marker icons
     - route polyline styling
     - safe coordinate helpers
   - This removes duplicated map setup scattered across booking and tracking screens.

2. **Rewrite the Google Maps loader**
   - Keep `VITE_GOOGLE_MAPS_BROWSER_KEY` as the first web key source.
   - Fall back to the Lovable Google Maps browser key only for hosted preview/web.
   - Keep async loading with callback support.
   - Surface clear errors when the key is missing, blocked, or rejected.

3. **Rewrite the booking background map**
   - Replace the current inline Google Maps logic in `UberBookingScreen.tsx` with a dedicated reusable web map component.
   - Keep the full-screen Uber-style background map.
   - Draw pickup/dropoff markers and an Uber-style route line when coordinates are available.
   - Keep the native Android path separate so the bottom sheet and booking logic remain unchanged.

4. **Rewrite the native Android map component**
   - Keep `@capacitor/google-maps`, but simplify and harden lifecycle handling.
   - Guarantee a non-zero full-screen map host before `GoogleMap.create()`.
   - Recreate/update the native map safely on mount, resize, and route changes.
   - Keep Android using `SWIFTMUV_GOOGLE_MAPS_ANDROID_KEY` through the Gradle manifest placeholder.
   - Show a plain, actionable error if the native SDK key is unauthorized.

5. **Rewrite driver tracking map**
   - Replace the current one-off tracking implementation with the same shared Google map layer.
   - Keep live driver marker, pickup marker, optional dropoff marker, ETA callback, and route line.
   - Use Google Directions when available; fall back to a straight route line if Directions fails.

6. **Remove mixed map providers where practical**
   - Replace the active-trip Leaflet mini-map with the shared Google tracking map component.
   - This avoids using Google Maps in one screen and third-party tiles in another.

## Technical notes

- Files expected to change:
  - `src/hooks/useGoogleMaps.ts`
  - `src/components/customer/NativeBookingMap.tsx`
  - `src/components/customer/UberBookingScreen.tsx`
  - `src/components/customer/ActiveTripCard.tsx`
  - `src/components/tracking/DriverTrackingMap.tsx`
  - likely one new shared map utility/component file under `src/components/maps/` or `src/lib/`
- Booking, pricing, auth, payments, and database behavior will not be changed.
- This code rewrite can improve sizing/lifecycle bugs, but if Android still shows blank beige/white tiles after the rewrite, the remaining cause is almost certainly Google Cloud key authorization: package name + SHA-1 + Maps SDK for Android.
- After changes, run locally:
  ```bash
  npm run build
  npx cap sync android
  cd android
  gradlew clean
  ```
  Then uninstall the old app from the device/emulator before reinstalling.
