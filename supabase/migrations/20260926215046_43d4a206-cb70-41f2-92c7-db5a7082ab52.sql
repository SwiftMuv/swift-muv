ALTER TABLE public.bookings DISABLE TRIGGER USER;
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY stripe_payment_intent_id ORDER BY created_at) rn
  FROM public.bookings WHERE stripe_payment_intent_id IS NOT NULL
)
UPDATE public.bookings b
SET status = CASE WHEN b.status = 'pending' THEN 'cancelled'::booking_status ELSE b.status END,
    stripe_payment_intent_id = b.stripe_payment_intent_id || '_dup_' || b.id
FROM ranked r WHERE r.id = b.id AND r.rn > 1;
ALTER TABLE public.bookings ENABLE TRIGGER USER;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_pi_unique
  ON public.bookings (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;