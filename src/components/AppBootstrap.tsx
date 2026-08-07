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
  }, []);
  return null;
};

export default AppBootstrap;
