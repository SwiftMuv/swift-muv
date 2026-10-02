
-- Promo codes (admin-managed)
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can check active codes" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (is_active IS TRUE AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Referrals
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES auth.users(id),
  referee_id uuid REFERENCES auth.users(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up','completed')),
  referrer_credit numeric NOT NULL DEFAULT 0,
  referee_credit numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE (referrer_id, referee_id)
);
GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see referrals they are part of" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Signed-in users can claim a referral code" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referee_id);

-- Customer profile: personal referral code + credit balance
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS credit_balance numeric NOT NULL DEFAULT 0;

-- Generate a referral code for existing and future customers
CREATE OR REPLACE FUNCTION public.generate_referral_code(_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
DECLARE
  _base text;
  _code text;
BEGIN
  _base := upper(regexp_replace(coalesce(nullif(_name, ''), 'MUV'), '[^A-Za-z]', '', 'g'));
  _base := left(_base, 6);
  LOOP
    _code := _base || lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.customer_profiles WHERE referral_code = _code);
  END LOOP;
  RETURN _code;
END;
$fn$;

UPDATE public.customer_profiles
SET referral_code = public.generate_referral_code(full_name)
WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.ensure_customer_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_customer_referral_code BEFORE INSERT ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_customer_referral_code();

-- Validate a promo code and return the discount for a given subtotal
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text, _subtotal numeric)
RETURNS TABLE(valid boolean, discount numeric, message text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _p public.promo_codes%ROWTYPE;
  _discount numeric;
BEGIN
  SELECT * INTO _p FROM public.promo_codes
   WHERE upper(code) = upper(trim(_code)) AND is_active IS TRUE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 'Invalid promo code'::text; RETURN;
  END IF;
  IF _p.expires_at IS NOT NULL AND _p.expires_at <= now() THEN
    RETURN QUERY SELECT false, 0::numeric, 'This code has expired'::text; RETURN;
  END IF;
  IF _p.max_uses IS NOT NULL AND _p.uses_count >= _p.max_uses THEN
    RETURN QUERY SELECT false, 0::numeric, 'This code has been fully used'::text; RETURN;
  END IF;
  IF _p.discount_type = 'percent' THEN
    _discount := round(_subtotal * LEAST(_p.discount_value, 100) / 100.0 * 100) / 100.0;
  ELSE
    _discount := LEAST(_p.discount_value, _subtotal);
  END IF;
  RETURN QUERY SELECT true, _discount, 'OK'::text;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;

-- Apply referral rewards when a referred customer completes their first move
CREATE OR REPLACE FUNCTION public.apply_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _r public.referrals%ROWTYPE;
  _reward numeric := 10;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT * INTO _r FROM public.referrals
     WHERE referee_id = NEW.customer_id AND status = 'signed_up'
     ORDER BY created_at ASC LIMIT 1;
    IF FOUND THEN
      UPDATE public.referrals
         SET status = 'completed', completed_at = now(),
             referrer_credit = _reward, referee_credit = _reward
       WHERE id = _r.id;
      UPDATE public.customer_profiles SET credit_balance = credit_balance + _reward WHERE user_id = _r.referrer_id;
      UPDATE public.customer_profiles SET credit_balance = credit_balance + _reward WHERE user_id = _r.referee_id;
      INSERT INTO public.notifications (user_id, type, title, body, data) VALUES
        (_r.referrer_id, 'referral_reward', 'Referral reward earned',
         'Your friend completed their first move — $' || _reward::text || ' credit added to your account.',
         jsonb_build_object('referral_id', _r.id, 'credit', _reward)),
        (_r.referee_id, 'referral_reward', 'Referral reward earned',
         'You completed your first move — $' || _reward::text || ' credit added to your account.',
         jsonb_build_object('referral_id', _r.id, 'credit', _reward));
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_apply_referral_reward AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.apply_referral_reward();
