import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVehicleIcon } from "@/lib/vehicleIcons";
import type { LucideIcon } from "lucide-react";
import type { VehicleCategory } from "@/lib/booking";

export interface DbVehicleOption {
  id: VehicleCategory;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const useVehicleCategories = () => {
  const [options, setOptions] = useState<DbVehicleOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("vehicle_categories")
        .select("code, name, description, icon, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (!active) return;
      setOptions(
        (data ?? []).map((r) => ({
          id: r.code as VehicleCategory,
          name: r.name,
          description: r.description,
          icon: getVehicleIcon(r.icon),
        })),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { options, loading };
};
