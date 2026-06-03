ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS vehicle_photo_url text;