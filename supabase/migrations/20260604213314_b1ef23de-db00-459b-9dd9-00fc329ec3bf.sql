
-- 1) Tighten driver-documents DELETE: only allow deleting files whose corresponding
--    driver_documents row is still 'pending' (not under review or approved).
DROP POLICY IF EXISTS "Drivers delete own docs" ON storage.objects;

CREATE POLICY "Drivers delete own pending docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.driver_documents dd
    WHERE dd.file_path = storage.objects.name
      AND dd.driver_id = auth.uid()
      AND dd.status = 'pending'
  )
);

-- Admins can always delete driver documents (server-side cleanup)
DROP POLICY IF EXISTS "Admins delete driver docs" ON storage.objects;
CREATE POLICY "Admins delete driver docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Lock down user_roles against any non-admin mutation, defense-in-depth
--    against privilege-escalation paths.
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger-level guard: even if a future policy or code path allows an insert,
-- block non-admin / non-service-role inserts and any role mutation on existing rows.
CREATE OR REPLACE FUNCTION public.guard_user_roles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions / admin scripts) and the signup trigger
  -- (handle_new_user runs as definer; auth.uid() is NULL in that context but
  -- it's invoked from an auth trigger on auth.users, not from user code).
  IF auth.role() = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Allow admins
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Allow the signup-time insert (no auth.uid present, single 'customer' or 'driver' role,
  -- and the row being inserted is for the same user that the auth trigger just created).
  IF TG_OP = 'INSERT' AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to modify user_roles';
END;
$$;

DROP TRIGGER IF EXISTS guard_user_roles_changes ON public.user_roles;
CREATE TRIGGER guard_user_roles_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles_changes();
