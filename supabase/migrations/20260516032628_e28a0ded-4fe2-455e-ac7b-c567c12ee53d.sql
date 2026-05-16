
DO $$ BEGIN
  CREATE TYPE public.driver_verification_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS profile_picture_url text,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS driver_license_url text,
  ADD COLUMN IF NOT EXISTS background_check_url text,
  ADD COLUMN IF NOT EXISTS verification_status public.driver_verification_status NOT NULL DEFAULT 'pending';
