import { useEffect } from "react";
import { ensureLocationPermission } from "@/lib/locationPermission";
import { loadPricingConfig } from "@/lib/pricingConfig";

/**
 * Runs once at app boot:
 *  - asks for location access gracefully (native Android/iOS + web)
 *  - loads admin-configured pricing rates into the client pricing engine
 */
const AppBootstrap = () => {
  useEffect(() => {
    ensureLocationPermission().catch(() => {});
    loadPricingConfig().catch(() => {});
    // Pick up admin pricing changes when the app regains focus.
    const refresh = () => loadPricingConfig().catch(() => {});
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return null;
};

export default AppBootstrap;
