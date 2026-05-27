
-- 1) Allow drivers to DELETE their own bank details
CREATE POLICY "Drivers delete own bank details"
ON public.driver_bank_details
FOR DELETE
TO authenticated
USING (auth.uid() = driver_id);

-- 2) Remove client-side INSERT on driver_payouts; payouts must come from edge functions (service_role)
DROP POLICY IF EXISTS "Drivers create own pending payouts" ON public.driver_payouts;

-- 3) Limit customer exposure of sensitive driver_profiles fields.
-- No customer-facing client code reads driver_profiles directly; the customer SELECT policy
-- exposed columns like stripe_connect_id, date_of_birth, license/background URLs. Drop it.
-- Customers can still see their assigned driver's public info via admin/edge-managed surfaces.
DROP POLICY IF EXISTS "Customers view assigned driver profiles" ON public.driver_profiles;

-- 4) Restrict driver UPDATE on jobs to non-financial operational columns.
-- RLS doesn't support column restrictions, so use column-level GRANTs.
REVOKE UPDATE ON public.jobs FROM authenticated;
GRANT UPDATE (status, started_at, completed_at, customer_rating) ON public.jobs TO authenticated;
-- service_role keeps full access for edge functions (release-earnings, etc.)
GRANT ALL ON public.jobs TO service_role;
