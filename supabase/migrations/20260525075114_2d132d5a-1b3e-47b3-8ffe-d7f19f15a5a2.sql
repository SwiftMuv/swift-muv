
-- 1. Restrict driver_profiles updates: prevent drivers from changing admin-controlled fields
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.driver_profiles;

CREATE OR REPLACE FUNCTION public.prevent_driver_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.background_check_status IS DISTINCT FROM OLD.background_check_status
     OR NEW.background_check_url IS DISTINCT FROM OLD.background_check_url
     OR NEW.stripe_connect_id IS DISTINCT FROM OLD.stripe_connect_id THEN
    RAISE EXCEPTION 'Drivers cannot modify verification or payout fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_driver_sensitive_updates_trg ON public.driver_profiles;
CREATE TRIGGER prevent_driver_sensitive_updates_trg
BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_driver_sensitive_updates();

CREATE POLICY "Drivers can update own profile"
ON public.driver_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Harden jobs INSERT policy
DROP POLICY IF EXISTS "Drivers can accept jobs" ON public.jobs;

CREATE POLICY "Drivers can accept jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = driver_id
  AND public.has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (SELECT 1 FROM public.driver_profiles WHERE user_id = auth.uid() AND is_verified = true)
  AND EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND status = 'pending')
);

-- 3. Scope driver-avatars uploads to own folder + add DELETE policy
DROP POLICY IF EXISTS "Authenticated users upload driver avatars" ON storage.objects;

CREATE POLICY "Drivers upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Drivers delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4. Add DELETE policy for driver-documents
CREATE POLICY "Drivers delete own docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
