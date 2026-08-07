// Public web URL of the app. Used for auth email links (password reset,
// email confirmation) because inside the native Android/iOS WebView
// `window.location.origin` is `capacitor://localhost` / `http://localhost`,
// which produces a reset link that no email client can open.
export const PUBLIC_APP_URL = "https://swift-muv.lovable.app";

function isNativeOrigin() {
  if (typeof window === "undefined") return true;
  const { protocol, hostname } = window.location;
  return (
    protocol === "capacitor:" ||
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

/** Absolute URL to use in auth emails, safe for native builds. */
export function authRedirectUrl(path = "/") {
  const base = isNativeOrigin() ? PUBLIC_APP_URL : window.location.origin;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
