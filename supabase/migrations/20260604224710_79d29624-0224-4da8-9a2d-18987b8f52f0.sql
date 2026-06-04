
REVOKE SELECT (completion_code) ON public.jobs FROM authenticated;
REVOKE SELECT (completion_code) ON public.jobs FROM anon;

GRANT SELECT (
  id, booking_id, driver_id, status, started_at, completed_at,
  customer_rating, driver_rating, tip_amount, created_at, updated_at,
  earnings_status, platform_fee, driver_earnings, stripe_transfer_id
) ON public.jobs TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_driver_job_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.driver_earnings     IS DISTINCT FROM OLD.driver_earnings
  OR NEW.platform_fee        IS DISTINCT FROM OLD.platform_fee
  OR NEW.stripe_transfer_id  IS DISTINCT FROM OLD.stripe_transfer_id
  OR NEW.earnings_status     IS DISTINCT FROM OLD.earnings_status
  OR NEW.tip_amount          IS DISTINCT FROM OLD.tip_amount
  OR NEW.completion_code     IS DISTINCT FROM OLD.completion_code
  OR NEW.customer_rating     IS DISTINCT FROM OLD.customer_rating
  OR NEW.driver_id           IS DISTINCT FROM OLD.driver_id
  OR NEW.booking_id          IS DISTINCT FROM OLD.booking_id THEN
    RAISE EXCEPTION 'Drivers cannot modify financial or protected job fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_driver_job_sensitive_updates_trg ON public.jobs;
CREATE TRIGGER prevent_driver_job_sensitive_updates_trg
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_job_sensitive_updates();

DROP POLICY IF EXISTS "Drivers can update own jobs" ON public.jobs;
CREATE POLICY "Drivers can update own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);
