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
    checkoutWindow.document.write(`<!doctype html><html><head><title>Preparing checkout…</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{text-align:center;padding:24px;max-width:420px}p{color:#94a3b8;line-height:1.5}a{color:#86efac;font-weight:700}</style></head><body><main><h1>Preparing checkout…</h1><p>If this page does not continue, return to SwiftGo and try again.</p></main></body></html>`);
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

const showReservedCheckoutError = (checkoutWindow: Window | null, message: string) => {
  try {
    if (!checkoutWindow || checkoutWindow.closed) return;
    checkoutWindow.document.open();
    checkoutWindow.document.write(`<!doctype html><html><head><title>Checkout could not open</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{text-align:center;padding:24px;max-width:460px}p{color:#cbd5e1;line-height:1.5}button{border:0;border-radius:10px;background:#22c55e;color:#052e16;font-weight:800;padding:12px 16px}</style></head><body><main><h1>Checkout could not open</h1><p>${message.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char)}</p><button onclick="window.close()">Close this tab</button></main></body></html>`);
    checkoutWindow.document.close();
  } catch (_err) {
    closeReservedCheckoutWindow(checkoutWindow);
  }
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);

const writeCheckoutHandoffPage = (checkoutWindow: Window, target: string) => {
  const safeTarget = escapeHtml(target);
  checkoutWindow.document.open();
  checkoutWindow.document.write(`<!doctype html><html><head><title>Opening Stripe checkout…</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="1;url=${safeTarget}"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{text-align:center;padding:24px;max-width:460px}p{color:#cbd5e1;line-height:1.5}.spinner{width:36px;height:36px;border:4px solid #334155;border-top-color:#22c55e;border-radius:999px;margin:0 auto 18px;animation:spin 1s linear infinite}a{display:inline-flex;margin-top:12px;border-radius:10px;background:#22c55e;color:#052e16;font-weight:800;padding:12px 16px;text-decoration:none}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><main><div class="spinner"></div><h1>Opening Stripe checkout…</h1><p>If this page does not continue automatically, tap the button below.</p><a href="${safeTarget}" rel="noreferrer">Open checkout</a><script>setTimeout(function(){ window.location.href = ${JSON.stringify(target)}; }, 100);</script></main></body></html>`);
  checkoutWindow.document.close();
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
    // Navigate the reserved tab directly to Stripe. document.write handoff pages
    // can fail silently inside sandboxed/preview iframes and leave a blank tab.
    let navigated = false;
    try {
      reservedWindow.location.replace(target);
      navigated = true;
    } catch (_err) {
      try {
        reservedWindow.location.href = target;
        navigated = true;
      } catch (_err2) {
        navigated = false;
      }
    }

    if (navigated) {
      return "opened";
    }

    try {
      writeCheckoutHandoffPage(reservedWindow, target);
      return "opened";
    } catch (_err) {
      showReservedCheckoutError(reservedWindow, "Your browser blocked the Stripe checkout redirect. Please return to SwiftGo and try again with popups enabled.");
      throw new Error("Your browser blocked the Stripe checkout redirect. Please allow popups and try again.");
    }
  }

    try {
      writeCheckoutHandoffPage(reservedWindow, target);
      return "opened";
    } catch (_err) {
      showReservedCheckoutError(reservedWindow, "Your browser blocked the Stripe checkout redirect. Please return to SwiftGo and try again with popups enabled.");
      throw new Error("Your browser blocked the Stripe checkout redirect. Please allow popups and try again.");
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