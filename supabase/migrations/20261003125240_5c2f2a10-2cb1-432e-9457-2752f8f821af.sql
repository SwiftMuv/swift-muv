
-- Lets a signed-in user claim a referral code without reading other customers' profiles.
CREATE OR REPLACE FUNCTION public.claim_referral_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _referrer uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT user_id INTO _referrer
  FROM public.customer_profiles
  WHERE referral_code = upper(trim(_code));

  IF _referrer IS NULL OR _referrer = auth.uid() THEN
    RETURN false;
  END IF;

  -- Already referred? Treat as success, don't duplicate.
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = auth.uid()) THEN
    RETURN true;
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, code)
  VALUES (_referrer, auth.uid(), upper(trim(_code)));
  RETURN true;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.claim_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(text) TO authenticated;
