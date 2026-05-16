
-- 1. Add address to driver_profiles
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS address text;

-- 2. Update signup handler to capture driver telephone/address/avatar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'customer'::app_role
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'customer' THEN
    INSERT INTO public.customer_profiles (user_id, full_name, phone)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  ELSIF _role = 'driver' THEN
    INSERT INTO public.driver_profiles (user_id, full_name, phone, address, profile_picture_url, avatar_url)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'profile_picture_url',
      NEW.raw_user_meta_data->>'profile_picture_url'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Allow drivers to insert jobs they're accepting
CREATE POLICY "Drivers can accept jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- 4. Allow drivers to update assigned bookings status
CREATE POLICY "Drivers can update assigned bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_driver_for_booking(auth.uid(), id));

-- 5. Public storage bucket for driver avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-avatars', 'driver-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Driver avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-avatars');

CREATE POLICY "Anyone can upload driver avatars during signup"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'driver-avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'driver-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
