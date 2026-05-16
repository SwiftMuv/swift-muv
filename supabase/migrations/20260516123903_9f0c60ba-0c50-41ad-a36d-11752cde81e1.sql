CREATE POLICY "Drivers can view pending bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (status = 'pending'::booking_status AND public.has_role(auth.uid(), 'driver'::app_role));