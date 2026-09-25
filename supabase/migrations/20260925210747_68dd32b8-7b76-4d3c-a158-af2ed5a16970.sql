CREATE OR REPLACE FUNCTION public.complete_job_by_geofence(_job_id uuid, _lat double precision, _lng double precision)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver uuid;
  _status job_status;
  _booking uuid;
  _dlat double precision;
  _dlng double precision;
BEGIN
  SELECT j.driver_id, j.status, j.booking_id, b.dropoff_lat, b.dropoff_lng
    INTO _driver, _status, _booking, _dlat, _dlng
  FROM public.jobs j JOIN public.bookings b ON b.id = j.booking_id
  WHERE j.id = _job_id;

  IF _driver IS NULL OR _driver <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _status = 'completed' THEN RETURN true; END IF;
  IF _status NOT IN ('in_transit','loading','arrived') THEN RETURN false; END IF;
  IF _dlat IS NULL OR _dlng IS NULL OR _lat IS NULL OR _lng IS NULL THEN RETURN false; END IF;
  IF public.haversine_km(_lat, _lng, _dlat, _dlng) > 0.02 THEN RETURN false; END IF;

  UPDATE public.bookings
     SET driver_lat = _lat, driver_lng = _lng, driver_location_updated_at = now(), status = 'completed'
   WHERE id = _booking;
  UPDATE public.jobs SET status = 'completed', completed_at = now() WHERE id = _job_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_job_by_geofence(uuid, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_job_by_geofence(uuid, double precision, double precision) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_job_with_code(uuid, text) FROM authenticated;