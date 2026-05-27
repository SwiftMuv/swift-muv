
-- Allow any authenticated user to read ratings written about a driver
-- so reviews can be displayed publicly on driver profiles.
CREATE POLICY "Anyone can view ratings about drivers"
ON public.ratings
FOR SELECT
TO authenticated
USING (public.has_role(ratee_id, 'driver'::app_role));
