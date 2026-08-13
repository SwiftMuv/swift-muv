import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swiftmuv.app.v2',
  appName: 'swift-muv',
  webDir: 'dist',
  // Give bundled Android assets a stable, secure origin. Google Maps sees
  // requests from https://localhost instead of Capacitor's custom scheme.
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
  },
  // NOTE:
  // The `server.url` block below is ONLY for live hot-reload from the Lovable
  // sandbox during development. It must stay COMMENTED OUT for any build you
  // run in Android Studio / ship to a device, otherwise the WebView tries to
  // load the preview URL (which requires login and blocks itself in a WebView)
  // and you get a black/dark screen.
  //
  // For live reload, temporarily add a `url` property to the server block
  // above. Never ship a preview URL in the installed build.
};

export default config;
