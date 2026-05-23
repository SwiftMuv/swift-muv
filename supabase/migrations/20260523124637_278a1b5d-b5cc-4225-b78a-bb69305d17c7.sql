ALTER TABLE public.bookings
  ALTER COLUMN base_price SET DEFAULT 0,
  ALTER COLUMN service_fee SET DEFAULT 0,
  ALTER COLUMN total_price SET DEFAULT 0;