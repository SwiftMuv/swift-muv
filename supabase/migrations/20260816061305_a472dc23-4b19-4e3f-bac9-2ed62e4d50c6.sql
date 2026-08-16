CREATE OR REPLACE FUNCTION public.notify_booking_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.customer_id, 'booking_receipt', 'Booking confirmed',
            'Your move from ' || NEW.pickup_address || ' to ' || NEW.dropoff_address || ' has been booked. Total: $' || NEW.total_price::text,
            jsonb_build_object('booking_id', NEW.id, 'total', NEW.total_price));

    -- Broadcast to online, verified drivers whose registered vehicle matches
    IF NEW.status = 'pending' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      SELECT dp.user_id, 'new_job', 'New move request',
             'Pickup: ' || NEW.pickup_address || ' -> ' || NEW.dropoff_address,
             jsonb_build_object('booking_id', NEW.id, 'total', NEW.total_price,
                                'vehicle_category', NEW.vehicle_category)
      FROM public.driver_profiles dp
      WHERE dp.is_online IS TRUE
        AND dp.is_verified IS TRUE
        AND (NEW.vehicle_category IS NULL OR dp.vehicle_category = NEW.vehicle_category);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.customer_id, 'booking_status', 'Booking ' || NEW.status,
            'Your move status changed to ' || NEW.status,
            jsonb_build_object('booking_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;