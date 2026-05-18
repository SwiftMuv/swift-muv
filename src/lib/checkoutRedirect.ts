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

export const openStripeCheckout = (checkoutUrl: string, reservedWindow: Window | null = null): "redirected" | "opened" => {
  const stripeUrl = new URL(checkoutUrl);
  if (stripeUrl.origin !== "https://checkout.stripe.com") {
    throw new Error("Checkout returned an unexpected redirect URL.");
  }

  if (reservedWindow && !reservedWindow.closed) {
    reservedWindow.location.href = stripeUrl.toString();
    return "opened";
  }

  if (isEmbeddedWindow()) {
    const checkoutWindow = window.open(stripeUrl.toString(), "_blank");
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

  window.location.assign(stripeUrl.toString());
  return "redirected";
};