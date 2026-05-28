
-- 1. Restrict drivers from modifying financial / payment fields on bookings
CREATE OR REPLACE FUNCTION public.prevent_driver_booking_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Customer who owns the booking is allowed to update normally (RLS handles).
  IF auth.uid() = NEW.customer_id THEN
    RETURN NEW;
  END IF;
  -- Otherwise this is a driver update (allowed by RLS via is_driver_for_booking).
  -- Drivers must not touch financial / payment fields.
  IF NEW.total_price       IS DISTINCT FROM OLD.total_price
  OR NEW.base_price        IS DISTINCT FROM OLD.base_price
  OR NEW.service_fee       IS DISTINCT FROM OLD.service_fee
  OR NEW.distance_fee      IS DISTINCT FROM OLD.distance_fee
  OR NEW.tip_amount        IS DISTINCT FROM OLD.tip_amount
  OR NEW.cancellation_fee  IS DISTINCT FROM OLD.cancellation_fee
  OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
  OR NEW.customer_id       IS DISTINCT FROM OLD.customer_id
  OR NEW.pickup_address    IS DISTINCT FROM OLD.pickup_address
  OR NEW.dropoff_address   IS DISTINCT FROM OLD.dropoff_address
  OR NEW.pickup_lat        IS DISTINCT FROM OLD.pickup_lat
  OR NEW.pickup_lng        IS DISTINCT FROM OLD.pickup_lng
  OR NEW.dropoff_lat       IS DISTINCT FROM OLD.dropoff_lat
  OR NEW.dropoff_lng       IS DISTINCT FROM OLD.dropoff_lng
  OR NEW.items             IS DISTINCT FROM OLD.items
  OR NEW.move_type         IS DISTINCT FROM OLD.move_type
  OR NEW.move_size         IS DISTINCT FROM OLD.move_size
  OR NEW.vehicle_category  IS DISTINCT FROM OLD.vehicle_category THEN
    RAISE EXCEPTION 'Drivers cannot modify financial, payment, or booking detail fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_driver_booking_sensitive_updates ON public.bookings;
CREATE TRIGGER trg_prevent_driver_booking_sensitive_updates
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_booking_sensitive_updates();

-- 2. Prevent drivers from self-approving bank verification
CREATE OR REPLACE FUNCTION public.prevent_driver_bank_self_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Drivers cannot modify bank verification status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_driver_bank_self_verify ON public.driver_bank_details;
CREATE TRIGGER trg_prevent_driver_bank_self_verify
BEFORE UPDATE ON public.driver_bank_details
FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_bank_self_verify();
