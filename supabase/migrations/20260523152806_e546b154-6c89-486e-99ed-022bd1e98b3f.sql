-- Move type for the new engine
DO $$ BEGIN
  CREATE TYPE public.move_type AS ENUM ('local','intercity','inter-province');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS move_type public.move_type NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS recommended_vehicle text;

-- Rewrite the pricing trigger to use moving_items + vehicle fleet
CREATE OR REPLACE FUNCTION public.recalculate_booking_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Vehicle fleet (must match src/lib/movingEngine.ts)
  fleet jsonb := '[
    {"name":"Cargo Van",     "maxVol":120,  "maxWt":2000,  "baseLocal":50,  "hourly":45, "baseInter":100, "perKm":1.25, "baseProv":250, "perLb":0.15},
    {"name":"12ft Cube Van", "maxVol":400,  "maxWt":3000,  "baseLocal":75,  "hourly":60, "baseInter":150, "perKm":1.50, "baseProv":400, "perLb":0.22},
    {"name":"16ft Truck",    "maxVol":800,  "maxWt":4500,  "baseLocal":100, "hourly":75, "baseInter":200, "perKm":1.85, "baseProv":600, "perLb":0.30},
    {"name":"26ft Truck",    "maxVol":1400, "maxWt":10000, "baseLocal":150, "hourly":95, "baseInter":300, "perKm":2.20, "baseProv":900, "perLb":0.42}
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
  est_hours numeric;
  labor numeric;
  final_price numeric := 0;
BEGIN
  -- Sum volume/weight from items: expects [{"id": <bigint>, "qty": <int>}, ...]
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

  -- 15% buffer, pick smallest vehicle that fits, fallback to largest
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

  -- Price by move type
  CASE NEW.move_type
    WHEN 'local' THEN
      est_hours := GREATEST(2, ceil(total_vol / 100.0) + 1);
      labor := est_hours * (vehicle->>'hourly')::numeric;
      final_price := (vehicle->>'baseLocal')::numeric + labor;
      NEW.base_price := (vehicle->>'baseLocal')::numeric;
      NEW.distance_fee := labor;
    WHEN 'intercity' THEN
      final_price := (vehicle->>'baseInter')::numeric
                   + COALESCE(NEW.distance_km, 0) * (vehicle->>'perKm')::numeric;
      NEW.base_price := (vehicle->>'baseInter')::numeric;
      NEW.distance_fee := COALESCE(NEW.distance_km, 0) * (vehicle->>'perKm')::numeric;
    WHEN 'inter-province' THEN
      final_price := (vehicle->>'baseProv')::numeric
                   + total_wt * (vehicle->>'perLb')::numeric;
      NEW.base_price := (vehicle->>'baseProv')::numeric;
      NEW.distance_fee := total_wt * (vehicle->>'perLb')::numeric;
  END CASE;

  NEW.service_fee := 0;
  NEW.recommended_vehicle := vehicle->>'name';
  NEW.total_price := round((final_price + COALESCE(NEW.tip_amount, 0)) * 100) / 100.0;
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists (recreate to be safe)
DROP TRIGGER IF EXISTS recalculate_booking_price_trg ON public.bookings;
CREATE TRIGGER recalculate_booking_price_trg
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_booking_price();