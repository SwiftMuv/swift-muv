
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_customer_referral_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_referral_reward() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) FROM anon;
