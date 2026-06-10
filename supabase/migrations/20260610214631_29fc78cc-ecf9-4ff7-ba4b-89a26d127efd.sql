
-- Update pricing trigger: SUV = flat $50 local, $50 + $2/km otherwise; all others = $20 + $2/km.
CREATE OR REPLACE FUNCTION public.recalculate_booking_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  crew_rate numeric := 15;
  suv_flat_local numeric := 50;
  suv_per_km numeric := 2.0;
  base_fee numeric := 20;
  per_km numeric := 2.0;
  total_vol numeric := 0;
  total_wt  numeric := 0;
  it jsonb;
  item_id bigint;
  qty numeric;
  item_vol numeric;
  item_wt numeric;
  service_price numeric := 0;
  crew_fee numeric := 0;
  final_price numeric := 0;
  recommended text;
BEGIN
  IF NEW.items IS NOT NULL THEN
    FOR it IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      item_id := NULLIF(it->>'id','')::bigint;
      qty := COALESCE((it->>'qty')::numeric, 0);
      IF item_id IS NOT NULL AND qty > 0 THEN
        SELECT cubic_feet, weight_lbs INTO item_vol, item_wt
          FROM public.moving_items WHERE id = item_id;
        IF item_vol IS NOT NULL THEN
          total_vol := total_vol + item_vol * qty;
          total_wt  := total_wt  + item_wt  * qty;
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF NEW.vehicle_category = 'suv' THEN
    IF NEW.move_type = 'local' THEN
      service_price := suv_flat_local;
    ELSE
      service_price := suv_flat_local + COALESCE(NEW.distance_km, 0) * suv_per_km;
    END IF;
    recommended := 'Extra Large Car / SUV';
  ELSE
    service_price := base_fee + COALESCE(NEW.distance_km, 0) * per_km;
    -- Recommend a vehicle by volume / weight (informational only).
    recommended := CASE
      WHEN total_vol <= 120  AND total_wt <= 2000  THEN 'Cargo Van'
      WHEN total_vol <= 400  AND total_wt <= 3000  THEN '12ft Cube Van'
      WHEN total_vol <= 800  AND total_wt <= 4500  THEN '16ft Truck'
      ELSE '26ft Truck'
    END;
  END IF;

  crew_fee := COALESCE(NEW.crew_count, 0) * crew_rate;
  final_price := service_price + crew_fee;

  NEW.base_price := CASE WHEN NEW.vehicle_category = 'suv' THEN 0 ELSE 20 END;
  NEW.distance_fee := service_price - NEW.base_price;
  NEW.service_fee := crew_fee;
  NEW.recommended_vehicle := recommended;
  NEW.total_price := round((final_price + COALESCE(NEW.tip_amount, 0)) * 100) / 100.0;
  RETURN NEW;
END;
$function$;
