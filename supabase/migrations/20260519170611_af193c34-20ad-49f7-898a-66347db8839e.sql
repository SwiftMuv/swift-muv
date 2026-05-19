-- Vehicle categories enum
CREATE TYPE public.vehicle_category AS ENUM ('pickup_truck', 'cargo_van', 'box_truck', 'moving_truck_16');

-- Earnings status enum
CREATE TYPE public.earnings_status AS ENUM ('pending', 'released', 'paid_out');

-- Payout status enum
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');

-- Bookings additions
ALTER TABLE public.bookings
  ADD COLUMN vehicle_category public.vehicle_category,
  ADD COLUMN distance_km numeric,
  ADD COLUMN floor_level integer NOT NULL DEFAULT 0,
  ADD COLUMN has_elevator boolean NOT NULL DEFAULT true,
  ADD COLUMN crew_count integer NOT NULL DEFAULT 0,
  ADD COLUMN items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN tip_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN cancellation_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN dropoff_lat double precision,
  ADD COLUMN dropoff_lng double precision,
  ADD COLUMN stripe_payment_intent_id text;

-- Driver profile vehicle category
ALTER TABLE public.driver_profiles
  ADD COLUMN vehicle_category public.vehicle_category;

-- Jobs additions
ALTER TABLE public.jobs
  ADD COLUMN earnings_status public.earnings_status NOT NULL DEFAULT 'pending',
  ADD COLUMN platform_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN driver_earnings numeric NOT NULL DEFAULT 0,
  ADD COLUMN stripe_transfer_id text;

-- Driver payouts table
CREATE TABLE public.driver_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  amount numeric NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  stripe_payout_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own payouts" ON public.driver_payouts
  FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Drivers create own payouts" ON public.driver_payouts
  FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Admins view all payouts" ON public.driver_payouts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Ratings table (two-way)
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  ratee_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, rater_id)
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view ratings about them or by them" ON public.ratings
  FOR SELECT USING (auth.uid() = rater_id OR auth.uid() = ratee_id);
CREATE POLICY "Users create own ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "Admins view all ratings" ON public.ratings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- App config (commission rate, cancellation fee)
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read app config" ON public.app_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update app config" ON public.app_config
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_config (key, value) VALUES
  ('platform_commission_rate', '0.20'::jsonb),
  ('cancellation_fee_cad', '10'::jsonb),
  ('distance_rate_per_km', '2.00'::jsonb),
  ('crew_member_fee', '10'::jsonb),
  ('floor_surcharge', '10'::jsonb),
  ('service_fee_rate', '0.10'::jsonb);

-- Update dispatch policy to also match vehicle category
DROP POLICY IF EXISTS "Drivers can view nearby pending bookings" ON public.bookings;
CREATE POLICY "Drivers can view nearby pending bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    status = 'pending'::booking_status
    AND has_role(auth.uid(), 'driver'::app_role)
    AND EXISTS (
      SELECT 1 FROM driver_profiles dp
      WHERE dp.user_id = auth.uid()
        AND dp.is_verified = true
        AND dp.is_online = true
        AND (bookings.vehicle_category IS NULL OR dp.vehicle_category = bookings.vehicle_category)
    )
    AND driver_within_radius(auth.uid(), id, 20)
  );

-- Trigger to keep ratings rolling-average on driver_profiles
CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_user uuid;
  avg_rating numeric;
BEGIN
  SELECT j.driver_id INTO driver_user FROM public.jobs j WHERE j.id = NEW.job_id;
  IF driver_user = NEW.ratee_id THEN
    SELECT AVG(stars)::numeric(3,2) INTO avg_rating
      FROM public.ratings WHERE ratee_id = driver_user;
    UPDATE public.driver_profiles SET rating = COALESCE(avg_rating, 5.0) WHERE user_id = driver_user;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_driver_rating
AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.update_driver_rating();