-- Restrict drivers from reading Stripe payment intent IDs on bookings.
-- Only service_role (edge functions: stripe-webhook, cancel-booking, release-earnings) needs this column.
REVOKE SELECT (stripe_payment_intent_id) ON public.bookings FROM authenticated;
REVOKE SELECT (stripe_payment_intent_id) ON public.bookings FROM anon;
REVOKE INSERT (stripe_payment_intent_id) ON public.bookings FROM authenticated;
REVOKE INSERT (stripe_payment_intent_id) ON public.bookings FROM anon;
REVOKE UPDATE (stripe_payment_intent_id) ON public.bookings FROM authenticated;
REVOKE UPDATE (stripe_payment_intent_id) ON public.bookings FROM anon;

-- Re-assert column-level revoke on jobs.completion_code in case any grants were
-- restored. Customers obtain the code via the get_job_completion_code RPC, and
-- drivers must use complete_job_with_code; neither needs direct column access.
REVOKE SELECT (completion_code) ON public.jobs FROM authenticated;
REVOKE SELECT (completion_code) ON public.jobs FROM anon;
REVOKE INSERT (completion_code) ON public.jobs FROM authenticated;
REVOKE INSERT (completion_code) ON public.jobs FROM anon;
REVOKE UPDATE (completion_code) ON public.jobs FROM authenticated;
REVOKE UPDATE (completion_code) ON public.jobs FROM anon;