CREATE OR REPLACE VIEW public.profiles AS
SELECT
  ur.user_id AS id,
  COALESCE(cp.full_name, dp.full_name) AS full_name,
  u.email::text AS email,
  COALESCE(cp.phone, dp.phone) AS phone,
  ur.role::text AS role,
  COALESCE(cp.avatar_url, dp.avatar_url) AS avatar_url,
  COALESCE(cp.created_at, dp.created_at, ur.created_at) AS created_at
FROM public.user_roles ur
LEFT JOIN public.customer_profiles cp ON cp.user_id = ur.user_id
LEFT JOIN public.driver_profiles  dp ON dp.user_id = ur.user_id
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE public.has_role(auth.uid(), 'admin') OR ur.user_id = auth.uid();

GRANT SELECT ON public.profiles TO authenticated;