ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS address text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'customer'::app_role
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'customer' THEN
    INSERT INTO public.customer_profiles (user_id, full_name, phone, address)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address'
    );
  ELSIF _role = 'driver' THEN
    INSERT INTO public.driver_profiles (
      user_id, full_name, phone, address, profile_picture_url, avatar_url, date_of_birth
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'profile_picture_url',
      NEW.raw_user_meta_data->>'profile_picture_url',
      NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::date
    );
  END IF;
  RETURN NEW;
END;
$function$;