ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'CAD';

ALTER TABLE public.driver_profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'CAD';