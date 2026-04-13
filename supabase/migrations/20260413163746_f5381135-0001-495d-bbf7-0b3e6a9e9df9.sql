
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    DROP TYPE public.booking_status CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    DROP TYPE public.job_status CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'move_size') THEN
    DROP TYPE public.move_size CASCADE;
  END IF;
END $$;

CREATE TYPE public.booking_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.job_status AS ENUM ('assigned', 'en_route', 'arrived', 'loading', 'in_transit', 'completed');
CREATE TYPE public.move_size AS ENUM ('small', 'medium', 'large', 'xlarge');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  move_size move_size NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  distance_fee NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  service_fee NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status job_status NOT NULL DEFAULT 'assigned',
  completion_code TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  customer_rating INT CHECK (customer_rating >= 1 AND customer_rating <= 5),
  driver_rating INT CHECK (driver_rating >= 1 AND driver_rating <= 5),
  tip_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_driver_for_booking(_driver_id UUID, _booking_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE driver_id = _driver_id AND booking_id = _booking_id);
$$;

CREATE OR REPLACE FUNCTION public.is_customer_for_job(_customer_id UUID, _job_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j JOIN public.bookings b ON b.id = j.booking_id
    WHERE j.id = _job_id AND b.customer_id = _customer_id
  );
$$;

CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Drivers can view assigned bookings" ON public.bookings FOR SELECT USING (public.is_driver_for_booking(auth.uid(), id));

CREATE POLICY "Drivers can view own jobs" ON public.jobs FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "Customers can view jobs for own bookings" ON public.jobs FOR SELECT USING (public.is_customer_for_job(auth.uid(), id));

CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_jobs_driver ON public.jobs(driver_id);
CREATE INDEX idx_jobs_booking ON public.jobs(booking_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
