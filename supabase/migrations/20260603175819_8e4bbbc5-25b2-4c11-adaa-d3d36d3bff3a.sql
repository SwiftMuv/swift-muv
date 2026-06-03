
-- 1) Hide completion_code from drivers (column-level) and add server-side trigger + RPCs
REVOKE SELECT (completion_code) ON public.jobs FROM authenticated;
REVOKE SELECT (completion_code) ON public.jobs FROM anon;
REVOKE INSERT (completion_code) ON public.jobs FROM authenticated;
REVOKE INSERT (completion_code) ON public.jobs FROM anon;
REVOKE UPDATE (completion_code) ON public.jobs FROM authenticated;
REVOKE UPDATE (completion_code) ON public.jobs FROM anon;

CREATE OR REPLACE FUNCTION public.set_job_completion_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completion_code IS NULL OR length(NEW.completion_code) <> 4 THEN
    NEW.completion_code := lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_job_completion_code_before_insert ON public.jobs;
CREATE TRIGGER set_job_completion_code_before_insert
BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_job_completion_code();

CREATE OR REPLACE FUNCTION public.get_job_completion_code(_job_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.completion_code
  FROM public.jobs j
  JOIN public.bookings b ON b.id = j.booking_id
  WHERE j.id = _job_id
    AND b.customer_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.complete_job_with_code(_job_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stored text;
  _driver uuid;
BEGIN
  SELECT completion_code, driver_id INTO _stored, _driver
  FROM public.jobs WHERE id = _job_id;

  IF _driver IS NULL OR _driver <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _stored IS NULL OR _stored <> _code THEN
    RETURN false;
  END IF;

  UPDATE public.jobs
     SET status = 'completed', completed_at = now()
   WHERE id = _job_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_completion_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_job_with_code(uuid, text) TO authenticated;

-- 2) Hide sensitive driver_profiles columns from authenticated clients
REVOKE SELECT (stripe_connect_id, date_of_birth, driver_license_url, background_check_url)
  ON public.driver_profiles FROM authenticated;
REVOKE SELECT (stripe_connect_id, date_of_birth, driver_license_url, background_check_url)
  ON public.driver_profiles FROM anon;

-- 3) Restrict ratings visibility; expose a safe public view that excludes rater identity
DROP POLICY IF EXISTS "Anyone can view ratings about drivers" ON public.ratings;

CREATE OR REPLACE VIEW public.driver_reviews_public
WITH (security_invoker = off) AS
  SELECT r.id, r.ratee_id, r.stars, r.comment, r.created_at
  FROM public.ratings r
  JOIN public.user_roles ur
    ON ur.user_id = r.ratee_id AND ur.role = 'driver'::app_role;

GRANT SELECT ON public.driver_reviews_public TO authenticated, anon;
