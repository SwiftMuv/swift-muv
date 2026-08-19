# Fix "map container has no size" on native Android

The native Google Map fails to attach because the `<capacitor-google-map>` element can report a 0x0 bounding box at the moment `GoogleMap.create()` runs. Custom elements have no default display, so before Tailwind/CSS settles (or while the booking screen is animating in) the layout engine can compute zero height, and the Capacitor bridge refuses to attach the native view.

## What will change

1. **Guaranteed sized host wrapper**
   - Wrap `<capacitor-google-map>` in a plain `div` that is absolutely positioned to fill the screen and given explicit pixel dimensions measured from the viewport (`window.innerWidth` / `innerHeight`), kept in sync on resize and orientation change.
   - Give the custom element itself inline explicit pixel `width`/`height` plus `display: block` before creation, so it never depends on inherited percentage heights.

2. **Global CSS rule**
   - Add to `src/index.css`:
     ```css
     capacitor-google-map { display: block; width: 100%; height: 100%; }
     ```
     so the layout engine always computes a valid box even before inline styles apply.

3. **Robust mount timing**
   - Keep the polling loop but base readiness on a double `requestAnimationFrame` plus a `ResizeObserver` on the host element, resolving as soon as a non-zero box is observed instead of only sampling per frame.
   - Only start `GoogleMap.create()` after the element reports a non-zero box; if the observer never fires within the timeout, fall back to the explicit fixed-viewport sizing (already present) and retry once before surfacing an error.

4. **Loading overlay ordering**
   - The full-screen black loading overlay in `UberBookingScreen.tsx` stays, but the map host is mounted and sized underneath it (never `display:none`), so the native view has real bounds while the spinner shows.

## Technical notes

- Files touched: `src/components/customer/NativeBookingMap.tsx`, `src/index.css`.
- No changes to pricing, booking logic, or the web (non-native) Google Maps path.
- Requires `npm run build && npx cap sync android` and an Android Studio rebuild to take effect on device.
