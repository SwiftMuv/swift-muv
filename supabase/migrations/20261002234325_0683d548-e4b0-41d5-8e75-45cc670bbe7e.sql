
REVOKE ALL ON public.device_tokens FROM anon;
REVOKE EXECUTE ON FUNCTION public.dispatch_push_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_customer_referral_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_referral_reward() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;
