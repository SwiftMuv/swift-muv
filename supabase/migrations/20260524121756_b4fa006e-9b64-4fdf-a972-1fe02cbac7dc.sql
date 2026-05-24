
-- 1) Re-seed moving items with grouped categories
TRUNCATE TABLE public.moving_items RESTART IDENTITY;

INSERT INTO public.moving_items (category, item_name, cubic_feet, weight_lbs, display_order) VALUES
('Studio & 1-Bedroom Essentials', 'Single/Double Bed & Mattress', 25.0, 90.0, 1),
('Studio & 1-Bedroom Essentials', 'Small Dining Table & Chairs', 15.0, 50.0, 2),
('Studio & 1-Bedroom Essentials', 'Mini Fridge', 15.0, 60.0, 3),
('Bedroom', 'King Bed / Mattress', 45.0, 160.0, 10),
('Bedroom', 'Queen Bed / Mattress', 35.0, 130.0, 11),
('Bedroom', 'Large Dresser / Bureau', 30.0, 110.0, 12),
('Bedroom', 'Nightstand', 5.0, 25.0, 13),
('Living Room', '3-Seat Sofa', 50.0, 180.0, 20),
('Living Room', 'Loveseat', 35.0, 120.0, 21),
('Living Room', 'Armchair', 15.0, 50.0, 22),
('Living Room', 'Coffee Table', 10.0, 40.0, 23),
('Living Room', 'Large TV Stand & TV', 12.0, 55.0, 24),
('Kitchen & Dining', 'Full-Size Refrigerator', 60.0, 250.0, 30),
('Kitchen & Dining', 'Main Dining Table', 25.0, 80.0, 31),
('Kitchen & Dining', 'Dining Chair', 4.0, 15.0, 32),
('Boxes & Sundries', 'Medium Moving Box', 3.0, 30.0, 40),
('Boxes & Sundries', 'Large Moving Box', 4.5, 40.0, 41),
('Boxes & Sundries', 'Bicycle', 10.0, 35.0, 42);

-- 2) Replace price trigger: no base fees, optional crew adder
CREATE OR REPLACE FUNCTION public.recalculate_booking_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fleet jsonb := '[
    {"name":"Cargo Van",     "maxVol":120,  "maxWt":2000,  "perCuFt":0.95, "perKm":1.45, "perLb":0.18, "crewFee":35},
    {"name":"12ft Cube Van", "maxVol":400,  "maxWt":3000,  "perCuFt":1.10, "perKm":1.80, "perLb":0.26, "crewFee":45},
    {"name":"16ft Truck",    "maxVol":800,  "maxWt":4500,  "perCuFt":1.25, "perKm":2.15, "perLb":0.35, "crewFee":60},
    {"name":"26ft Truck",    "maxVol":1400, "maxWt":10000, "perCuFt":1.45, "perKm":2.60, "perLb":0.48, "crewFee":75}
  ]'::jsonb;
  total_vol numeric := 0;
  total_wt  numeric := 0;
  buf_vol numeric;
  buf_wt  numeric;
  it jsonb;
  item_id bigint;
  qty numeric;
  item_vol numeric;
  item_wt numeric;
  vehicle jsonb;
  candidate jsonb;
  service_price numeric := 0;
  crew_fee numeric := 0;
  final_price numeric := 0;
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

  buf_vol := total_vol * 1.15;
  buf_wt  := total_wt  * 1.15;
  vehicle := NULL;
  FOR candidate IN SELECT * FROM jsonb_array_elements(fleet) LOOP
    IF (candidate->>'maxVol')::numeric >= buf_vol
       AND (candidate->>'maxWt')::numeric >= buf_wt THEN
      vehicle := candidate; EXIT;
    END IF;
  END LOOP;
  IF vehicle IS NULL THEN vehicle := fleet->-1; END IF;

  CASE NEW.move_type
    WHEN 'local' THEN
      service_price := total_vol * (vehicle->>'perCuFt')::numeric;
    WHEN 'intercity' THEN
      service_price := COALESCE(NEW.distance_km, 0) * (vehicle->>'perKm')::numeric;
    WHEN 'inter-province' THEN
      service_price := total_wt * (vehicle->>'perLb')::numeric;
  END CASE;

  crew_fee := COALESCE(NEW.crew_count, 0) * (vehicle->>'crewFee')::numeric;
  final_price := service_price + crew_fee;

  NEW.base_price := 0;
  NEW.distance_fee := service_price;
  NEW.service_fee := crew_fee;
  NEW.recommended_vehicle := vehicle->>'name';
  NEW.total_price := round((final_price + COALESCE(NEW.tip_amount, 0)) * 100) / 100.0;
  RETURN NEW;
END;
$function$;
