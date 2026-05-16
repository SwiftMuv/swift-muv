
-- 1. Geo columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision;

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lng double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- 2. Distance helper (Haversine, km)
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT 2 * 6371 * asin(
    sqrt(
      sin(radians((lat2 - lat1) / 2)) ^ 2
      + cos(radians(lat1)) * cos(radians(lat2))
        * sin(radians((lng2 - lng1) / 2)) ^ 2
    )
  );
$$;

-- 3. Driver-within-radius check (SECURITY DEFINER so it can read driver_profiles)
CREATE OR REPLACE FUNCTION public.driver_within_radius(
  _driver_id uuid, _booking_id uuid, _km integer
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.driver_profiles dp, public.bookings b
    WHERE dp.user_id = _driver_id
      AND b.id = _booking_id
      AND dp.current_lat IS NOT NULL
      AND dp.current_lng IS NOT NULL
      AND b.pickup_lat IS NOT NULL
      AND b.pickup_lng IS NOT NULL
      AND public.haversine_km(dp.current_lat, dp.current_lng, b.pickup_lat, b.pickup_lng) <= _km
  );
$$;

-- 4. Replace the pending-bookings policy with role + verified + 20km gate
DROP POLICY IF EXISTS "Drivers can view pending bookings" ON public.bookings;

CREATE POLICY "Drivers can view nearby pending bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  status = 'pending'::booking_status
  AND public.has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.user_id = auth.uid()
      AND dp.is_verified = true
      AND dp.is_online = true
  )
  AND public.driver_within_radius(auth.uid(), id, 20)
);
