DROP POLICY IF EXISTS "Anyone authenticated can read app config" ON public.app_config;
CREATE POLICY "Signed-in users read public pricing config" ON public.app_config FOR SELECT TO authenticated
USING (key = ANY (ARRAY['suv_flat_local_cad','suv_included_km','per_km_rate_cad','base_fee_cad','crew_member_rate_cad','tax_rate','flat_included_km','excess_per_km_cad','cancellation_fee_cad']) OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Anyone authenticated can read vehicle categories" ON public.vehicle_categories;
CREATE POLICY "Signed-in users read active vehicle categories" ON public.vehicle_categories FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read moving items" ON public.moving_items;
CREATE POLICY "App users read moving items" ON public.moving_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS "Driver avatars are publicly readable" ON storage.objects;
CREATE POLICY "Drivers read own avatar objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'driver-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);