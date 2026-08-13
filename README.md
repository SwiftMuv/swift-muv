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

Uninstall the previous app from the device before running the new Android build
to ensure stale assets are not retained.
