import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c3150a8d567e4ea6a58059caaa19da0f',
  appName: 'swift-muv',
  webDir: 'dist',
  // NOTE:
  // The `server.url` block below is ONLY for live hot-reload from the Lovable
  // sandbox during development. It must stay COMMENTED OUT for any build you
  // run in Android Studio / ship to a device, otherwise the WebView tries to
  // load the preview URL (which requires login and blocks itself in a WebView)
  // and you get a black/dark screen.
  //
  // server: {
  //   url: 'https://c3150a8d-567e-4ea6-a580-59caaa19da0f.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
};

export default config;
