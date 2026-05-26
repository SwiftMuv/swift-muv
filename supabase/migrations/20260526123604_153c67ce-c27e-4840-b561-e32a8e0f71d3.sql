
-- 1. Vehicle categories table
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read vehicle categories"
  ON public.vehicle_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage vehicle categories"
  ON public.vehicle_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.vehicle_categories (code, name, description, icon, display_order) VALUES
  ('suv',             'Extra Large Car / SUV', 'Bags & luggage only · flat $50 local', 'Car',     1),
  ('pickup_truck',    'Pickup Truck',          'Small loads, a few boxes',             'Truck',   2),
  ('cargo_van',       'Cargo Van',             '1-bedroom or studio',                  'Truck',   3),
  ('box_truck',       'Box Truck',             '2-bedroom apartment',                  'Box',     4),
  ('moving_truck_16', '16ft Moving Truck',     '3+ bedroom home',                      'Truck',   5)
ON CONFLICT (code) DO NOTHING;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all notifications"
  ON public.notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. Driver bank details
CREATE TABLE IF NOT EXISTS public.driver_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE,
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  transit_number text NOT NULL,
  institution_number text NOT NULL,
  account_last4 text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own bank details"
  ON public.driver_bank_details FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Drivers insert own bank details"
  ON public.driver_bank_details FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers update own bank details"
  ON public.driver_bank_details FOR UPDATE USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Admins view all bank details"
  ON public.driver_bank_details FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_bank_details_updated
  BEFORE UPDATE ON public.driver_bank_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Drivers can create their own pending payout requests
CREATE POLICY "Drivers create own pending payouts"
  ON public.driver_payouts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id AND status = 'pending'::payout_status);

-- 5. Notification triggers
CREATE OR REPLACE FUNCTION public.notify_booking_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.customer_id, 'booking_receipt', 'Booking confirmed',
            'Your move from ' || NEW.pickup_address || ' to ' || NEW.dropoff_address || ' has been booked. Total: $' || NEW.total_price::text,
            jsonb_build_object('booking_id', NEW.id, 'total', NEW.total_price));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.customer_id, 'booking_status', 'Booking ' || NEW.status,
            'Your move status changed to ' || NEW.status,
            jsonb_build_object('booking_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_bookings
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_changes();

CREATE OR REPLACE FUNCTION public.notify_job_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _customer uuid;
BEGIN
  SELECT customer_id INTO _customer FROM public.bookings WHERE id = NEW.booking_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data) VALUES
      (NEW.driver_id, 'job_assigned', 'New job accepted', 'You accepted a new move.', jsonb_build_object('job_id', NEW.id, 'booking_id', NEW.booking_id)),
      (_customer,     'driver_assigned', 'Driver on the way', 'A driver has accepted your move.', jsonb_build_object('job_id', NEW.id, 'booking_id', NEW.booking_id));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data) VALUES
      (NEW.driver_id, 'job_status_' || NEW.status, 'Job ' || NEW.status, 'Job status updated to ' || NEW.status, jsonb_build_object('job_id', NEW.id)),
      (_customer,     'job_status_' || NEW.status, 'Move ' || NEW.status, 'Your move status: ' || NEW.status, jsonb_build_object('job_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_jobs
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.notify_job_changes();

-- 6. Update price trigger: flat $15/crew member
CREATE OR REPLACE FUNCTION public.recalculate_booking_price()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  fleet jsonb := '[
    {"name":"Cargo Van",     "maxVol":120,  "maxWt":2000,  "perCuFt":0.95, "perKm":1.45, "perLb":0.18},
    {"name":"12ft Cube Van", "maxVol":400,  "maxWt":3000,  "perCuFt":1.10, "perKm":1.80, "perLb":0.26},
    {"name":"16ft Truck",    "maxVol":800,  "maxWt":4500,  "perCuFt":1.25, "perKm":2.15, "perLb":0.35},
    {"name":"26ft Truck",    "maxVol":1400, "maxWt":10000, "perCuFt":1.45, "perKm":2.60, "perLb":0.48}
  ]'::jsonb;
  crew_rate numeric := 15;
  suv_flat_local numeric := 50;
  suv_per_km numeric := 1.20;
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

  IF NEW.vehicle_category = 'suv' THEN
    IF NEW.move_type = 'local' THEN
      service_price := suv_flat_local;
    ELSE
      service_price := suv_flat_local + COALESCE(NEW.distance_km, 0) * suv_per_km;
    END IF;
    crew_fee := COALESCE(NEW.crew_count, 0) * crew_rate;
    final_price := service_price + crew_fee;
    NEW.base_price := 0;
    NEW.distance_fee := service_price;
    NEW.service_fee := crew_fee;
    NEW.recommended_vehicle := 'Extra Large Car / SUV';
    NEW.total_price := round((final_price + COALESCE(NEW.tip_amount, 0)) * 100) / 100.0;
    RETURN NEW;
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

  crew_fee := COALESCE(NEW.crew_count, 0) * crew_rate;
  final_price := service_price + crew_fee;

  NEW.base_price := 0;
  NEW.distance_fee := service_price;
  NEW.service_fee := crew_fee;
  NEW.recommended_vehicle := vehicle->>'name';
  NEW.total_price := round((final_price + COALESCE(NEW.tip_amount, 0)) * 100) / 100.0;
  RETURN NEW;
END;
$function$;
