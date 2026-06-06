
-- Strengthen the bank-details guard to also cover INSERTs (a driver inserting a
-- row with is_verified = true). Drop existing UPDATE-only trigger and replace
-- with one that fires on both INSERT and UPDATE.
DROP TRIGGER IF EXISTS prevent_driver_bank_self_verify ON public.driver_bank_details;

CREATE OR REPLACE FUNCTION public.prevent_driver_bank_self_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Drivers can only create their own row in an UNVERIFIED state.
    IF NEW.is_verified IS TRUE THEN
      RAISE EXCEPTION 'Drivers cannot create pre-verified bank details';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Drivers cannot modify bank verification status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_driver_bank_self_verify
  BEFORE INSERT OR UPDATE ON public.driver_bank_details
  FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_bank_self_verify();
