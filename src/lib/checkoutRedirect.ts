const isEmbeddedWindow = () => {
  try {
    return window.self !== window.top;
  } catch (_err) {
    return true;
  }
};

export const needsExternalCheckoutWindow = () => isEmbeddedWindow();

export const reserveStripeCheckoutWindow = () => {
  if (!isEmbeddedWindow()) return null;

  const checkoutWindow = window.open("about:blank", "_blank");
  if (!checkoutWindow) return null;

  try {
    checkoutWindow.opener = null;
    checkoutWindow.document.write(`<!doctype html><html><head><title>Opening Stripe checkout…</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{text-align:center;padding:24px}p{color:#94a3b8}</style></head><body><main><h1>Opening Stripe checkout…</h1><p>Please keep this tab open.</p></main></body></html>`);
    checkoutWindow.document.close();
  } catch (_err) {
    // The browser may prevent writing to the reserved tab; we can still navigate it later.
  }

  return checkoutWindow;
};

export const closeReservedCheckoutWindow = (checkoutWindow: Window | null) => {
  try {
    if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
  } catch (_err) {
    // Ignore browser restrictions while cleaning up a blocked checkout attempt.
  }
};

const isAllowedStripeUrl = (url: URL) => {
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return (
    host === "checkout.stripe.com" ||
    host.endsWith(".stripe.com") ||
    host.endsWith(".stripe.network")
  );
};

export const openStripeCheckout = (checkoutUrl: string, reservedWindow: Window | null = null): "redirected" | "opened" => {
  if (typeof checkoutUrl !== "string" || !checkoutUrl.trim()) {
    throw new Error("Checkout response did not include a redirect URL.");
  }

  let stripeUrl: URL;
  try {
    stripeUrl = new URL(checkoutUrl);
  } catch {
    throw new Error("Checkout returned a malformed redirect URL.");
  }

  if (!isAllowedStripeUrl(stripeUrl)) {
    throw new Error("Checkout returned an unexpected redirect URL.");
  }

  const target = stripeUrl.toString();

  if (reservedWindow && !reservedWindow.closed) {
    try {
      reservedWindow.location.href = target;
      return "opened";
    } catch (_err) {
      // Fall through to alternate strategies below.
    }
  }

  if (isEmbeddedWindow()) {
    let checkoutWindow: Window | null = null;
    try {
      checkoutWindow = window.open(target, "_blank", "noopener,noreferrer");
    } catch (_err) {
      checkoutWindow = null;
    }
    if (checkoutWindow) {
      try {
        checkoutWindow.opener = null;
      } catch (_err) {
        // Some browsers do not allow opener changes after opening the tab.
      }
      return "opened";
    }

    throw new Error("Your browser blocked the Stripe checkout window. Please allow popups and try again.");
  }

  try {
    window.location.assign(target);
  } catch (_err) {
    window.location.href = target;
  }
  return "redirected";
};