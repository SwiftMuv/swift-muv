import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

// Once React has painted, the app owns the DOM. Any later error (network hiccup,
// Google Maps auth, a rejected fetch) must NOT blank the screen — that looked
// like a crash on launch in the installed Android build.
let appMounted = false;

const showStartupError = (message: string) => {
  if (appMounted) return;
  document.body.innerHTML = `<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;"><section style="max-width:360px;border:1px solid rgba(248,250,252,.18);border-radius:8px;padding:20px;background:rgba(15,23,42,.92);"><h1 style="margin:0 0 8px;font-size:20px;">Swift Muv could not start</h1><p style="margin:0 0 12px;color:#cbd5e1;font-size:14px;">Close and reopen the app. If this continues, update to the latest build.</p><p style="overflow-wrap:anywhere;margin:0;padding:12px;border-radius:6px;background:rgba(148,163,184,.14);font-size:12px;color:#cbd5e1;">${message}</p></section></main>`;
};

window.addEventListener("error", (event) => {
  if (appMounted) {
    console.error("Runtime error", event.message);
    return;
  }
  showStartupError(event.message || "Unexpected startup error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "Unexpected startup error");
  if (appMounted) {
    console.error("Unhandled rejection", reason);
    return;
  }
  showStartupError(reason);
});

if (!rootElement) {
  showStartupError("Missing app root element");
  throw new Error("Missing root element");
}

const MountFlag = () => {
  React.useEffect(() => {
    appMounted = true;
  }, []);
  return null;
};

createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <MountFlag />
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
