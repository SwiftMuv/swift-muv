
-- App reviews table
CREATE TABLE public.app_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.app_reviews TO authenticated;
GRANT ALL ON public.app_reviews TO service_role;

ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers insert own app reviews"
  ON public.app_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id AND public.has_role(auth.uid(), 'driver'::app_role));

CREATE POLICY "Drivers view own app reviews"
  ON public.app_reviews FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins view all app reviews"
  ON public.app_reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Clear all pending and cancelled bookings
DELETE FROM public.jobs WHERE booking_id IN (
  SELECT id FROM public.bookings WHERE status IN ('pending','cancelled')
);
DELETE FROM public.bookings WHERE status IN ('pending','cancelled');
