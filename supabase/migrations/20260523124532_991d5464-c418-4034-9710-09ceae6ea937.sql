
-- 1. Restrict driver_profiles SELECT for customers
DROP POLICY IF EXISTS "Customers can view driver profiles" ON public.driver_profiles;

CREATE OR REPLACE FUNCTION public.customer_has_job_with_driver(_customer_id uuid, _driver_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.bookings b ON b.id = j.booking_id
    WHERE j.driver_id = _driver_id AND b.customer_id = _customer_id
  );
$$;

CREATE POLICY "Customers view assigned driver profiles"
ON public.driver_profiles FOR SELECT
TO authenticated
USING (public.customer_has_job_with_driver(auth.uid(), user_id));

-- 2. Fix handle_new_user to disallow admin role at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role app_role;
  _requested text;
BEGIN
  _requested := NEW.raw_user_meta_data->>'role';
  _role := CASE
    WHEN _requested = 'driver' THEN 'driver'::app_role
    ELSE 'customer'::app_role
  END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'customer' THEN
    INSERT INTO public.customer_profiles (user_id, full_name, phone, address)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'address');
  ELSIF _role = 'driver' THEN
    INSERT INTO public.driver_profiles (
      user_id, full_name, phone, address, profile_picture_url, avatar_url, date_of_birth
    ) VALUES (
      NEW.id, NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'profile_picture_url',
      NEW.raw_user_meta_data->>'profile_picture_url',
      NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::date
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Restrict user_roles INSERT to admins only (explicit policy)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Remove driver self-insert payouts policy
DROP POLICY IF EXISTS "Drivers create own payouts" ON public.driver_payouts;

-- 5. Fix ratings INSERT to require participation
DROP POLICY IF EXISTS "Users create own ratings" ON public.ratings;
CREATE POLICY "Participants create ratings"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND (
    public.is_customer_for_job(auth.uid(), job_id)
    OR EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND driver_id = auth.uid())
  )
);

-- 6. Storage: require auth for driver-avatars upload
DROP POLICY IF EXISTS "Anyone can upload driver avatars during signup" ON storage.objects;
CREATE POLICY "Authenticated users upload driver avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-avatars' AND auth.uid() IS NOT NULL);

-- 7. Server-side booking price calculation trigger
CREATE OR REPLACE FUNCTION public.recalculate_booking_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  catalog jsonb := '{
    "box": 15, "chair": 18, "table": 25, "tv": 25, "bed": 30,
    "dresser": 30, "sofa": 35, "wardrobe": 40, "appliance": 40, "other": 20
  }'::jsonb;
  items_total numeric := 0;
  distance_total numeric := 0;
  crew_total numeric := 0;
  floor_total numeric := 0;
  subtotal numeric := 0;
  service_total numeric := 0;
  it jsonb;
  unit numeric;
BEGIN
  IF NEW.items IS NOT NULL THEN
    FOR it IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      unit := COALESCE((catalog ->> (it->>'id'))::numeric, 0);
      items_total := items_total + unit * COALESCE((it->>'qty')::numeric, 0);
    END LOOP;
  END IF;

  distance_total := round(GREATEST(0, COALESCE(NEW.distance_km, 0)) * 2.0 * 100) / 100.0;
  crew_total := COALESCE(NEW.crew_count, 0) * 10;
  IF COALESCE(NEW.has_elevator, true) = false AND COALESCE(NEW.floor_level, 0) > 0 THEN
    floor_total := NEW.floor_level * 10;
  END IF;

  subtotal := items_total + distance_total + crew_total + floor_total;
  service_total := round(subtotal * 0.10 * 100) / 100.0;

  NEW.base_price := items_total;
  NEW.distance_fee := distance_total;
  NEW.service_fee := service_total;
  NEW.total_price := round((subtotal + service_total + COALESCE(NEW.tip_amount, 0)) * 100) / 100.0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_price_recalc ON public.bookings;
CREATE TRIGGER booking_price_recalc
BEFORE INSERT OR UPDATE OF items, distance_km, crew_count, floor_level, has_elevator, tip_amount
ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.recalculate_booking_price();
