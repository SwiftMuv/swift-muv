export const isEmbeddedFrame = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const prepareCheckoutRedirectWindow = () => {
  if (typeof window === "undefined" || !isEmbeddedFrame()) return null;

  const checkoutWindow = window.open("about:blank", "_blank");
  if (!checkoutWindow) return null;

  try {
    checkoutWindow.opener = null;
    checkoutWindow.document.write(`<!doctype html><html><head><title>Opening Stripe…</title><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:grid;min-height:100vh;place-items:center;"><main style="text-align:center;padding:24px;"><h1 style="font-size:20px;margin:0 0 8px;">Opening secure payment…</h1><p style="margin:0;color:#94a3b8;">Keep this tab open while SwiftGo connects to Stripe.</p></main></body></html>`);
    checkoutWindow.document.close();
  } catch {
    // If the browser blocks document access, we can still assign location later.
  }

  return checkoutWindow;
};

export const closePreparedCheckoutWindow = (checkoutWindow: Window | null) => {
  try {
    if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
  } catch {
    // Ignore browser-specific popup close restrictions.
  }
};

export const redirectToCheckoutUrl = (url: string, checkoutWindow: Window | null) => {
  if (checkoutWindow && !checkoutWindow.closed) {
    checkoutWindow.location.href = url;
    return "prepared-window";
  }

  if (isEmbeddedFrame()) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) return "new-window";
  }

  window.location.assign(url);
  return "current-window";
};