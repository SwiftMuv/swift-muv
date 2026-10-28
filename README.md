# SwiftMuv

## iPhone with Xcode 14.2

Use the separate `ios-legacy` project. It uses Capacitor 5.7.8 without changing
the working Capacitor 8 Android app. It shares the app's current web source,
uses browser Google Maps, and includes native location and local alerts.
Native push is disabled: the current delivery service targets Android FCM,
not Apple APNs. Background/closed-app GPS is not implemented for this shell.

On your Mac, update your local project from your connected GitHub repository,
then run these commands from the project root:

```bash
git pull
npm install
npm install --prefix ios-legacy
npm run build --prefix ios-legacy
(cd ios-legacy && npx cap sync ios)
npm run open --prefix ios-legacy
```

Install CocoaPods first if `pod` is not available (`brew install cocoapods`).
In Xcode 14.2, open `ios-legacy/ios/App/App.xcworkspace`, select the App target,
choose your Apple team under Signing & Capabilities, select an iOS 16.2
simulator or supported connected phone, and press Run. Do not run the root
Capacitor 8 CLI against this iOS project. Repeat the iOS build and sync commands
after updating app source. The simulator/device build must be verified on a Mac;
this workspace has no Xcode. Newer iPhones may require newer Xcode device support.
Current App Store uploads require a newer Apple SDK; this setup is for local
Xcode 14.2 testing, not a current App Store release.

See the [Capacitor mobile guide](https://lovable.dev/blog/capacitor).

## Android Google Maps

The project key is committed for both build paths:

- Web/WebView: `VITE_GOOGLE_MAPS_BROWSER_KEY` in `.env`
- Android native map: `SWIFTMUV_GOOGLE_MAPS_ANDROID_KEY` in `android/gradle.properties`

To override locally, create an uncommitted `.env.local`:

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
Android**, and restrict it to package `com.swiftmuv.app` plus your release
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
