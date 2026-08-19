# SwiftMuv

## Android Google Maps

The hosted web app uses Lovable's managed Google Maps browser key. That key is
restricted to Lovable-hosted domains and cannot render Maps JavaScript inside
the Android WebView.

For a local Android build, create an uncommitted `.env.local` file containing
your own browser key:

```env
VITE_GOOGLE_MAPS_BROWSER_KEY=your_google_maps_browser_key
```

Enable **Maps JavaScript API** and **Places API (New)** for that key. Allow
`https://localhost/*` in its HTTP referrer restrictions. Then rebuild the web
assets before syncing Android:

```bash
npm run build
npx cap sync android
```

The installed Android app now uses the native **Maps SDK for Android** for the
background map. Create a separate Android-restricted key, enable **Maps SDK for
Android**, and restrict it to package `com.swiftmuv.app.v2` plus your release
certificate SHA-1. Add it to your user Gradle properties (never commit it):

```properties
SWIFTMUV_GOOGLE_MAPS_ANDROID_KEY=your_android_maps_key
```

The build reads this key, in order, from a Gradle project property, the
`SWIFTMUV_GOOGLE_MAPS_ANDROID_KEY` environment variable, or
`android/local.properties`. Use `~/.gradle/gradle.properties` for a machine-wide
value. The browser key above remains needed
for Places autocomplete inside the WebView. Then rebuild and sync:

```bash
npm run build
npx cap sync android
```

Uninstall the previous app from the device before running the new Android build
to ensure stale assets are not retained.
