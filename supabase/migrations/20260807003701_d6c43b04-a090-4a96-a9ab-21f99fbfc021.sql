CREATE OR REPLACE FUNCTION public.recalculate_booking_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  crew_rate numeric := 15;
  suv_flat_local numeric := 50;
  suv_included_km numeric := 3;
  per_km numeric := 20.0;
  base_fee numeric := 20;
  tax_rate numeric := 0.14975;
  total_vol numeric := 0;
  total_wt  numeric := 0;
  it jsonb;
  item_id bigint;
  qty numeric;
  item_vol numeric;
  item_wt numeric;
  km numeric := 0;
  service_price numeric := 0;
  crew_fee numeric := 0;
  subtotal numeric := 0;
  tax_amount numeric := 0;
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

  km := GREATEST(COALESCE(NEW.distance_km, 0), 0);

  IF NEW.vehicle_category = 'suv' THEN
    service_price := suv_flat_local + GREATEST(km - suv_included_km, 0) * per_km;
    recommended := 'Extra Large Car / SUV';
  ELSE
    recommended := CASE
      WHEN total_vol <= 120  AND total_wt <= 2000  THEN 'Cargo Van'
      WHEN total_vol <= 400  AND total_wt <= 3000  THEN '12ft Cube Van'
      WHEN total_vol <= 800  AND total_wt <= 4500  THEN '16ft Truck'
      ELSE '26ft Truck'
    END;
    base_fee := CASE recommended
      WHEN 'Cargo Van'     THEN 20
      WHEN '12ft Cube Van' THEN 28
      WHEN '16ft Truck'    THEN 39.20
      ELSE 54.88
    END;
    service_price := base_fee + km * per_km;
  END IF;

  crew_fee := COALESCE(NEW.crew_count, 0) * crew_rate;
  subtotal := service_price + crew_fee;
  tax_amount := round(subtotal * tax_rate * 100) / 100.0;
  final_price := subtotal + tax_amount;

  NEW.base_price := CASE WHEN NEW.vehicle_category = 'suv' THEN suv_flat_local ELSE base_fee END;
  NEW.distance_fee := round((service_price - NEW.base_price) * 100) / 100.0;
  NEW.service_fee := crew_fee;
  NEW.recommended_vehicle := recommended;
  NEW.total_price := round((final_price + COALESCE(NEW.tip_amount, 0)) * 100) / 100.0;
  RETURN NEW;
END;
$function$;