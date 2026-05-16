
-- background check status enum
DO $$ BEGIN
  CREATE TYPE public.background_check_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS background_check_status public.background_check_status NOT NULL DEFAULT 'pending';

-- driver documents
DO $$ BEGIN
  CREATE TYPE public.driver_document_type AS ENUM ('police_check','license','insurance','vehicle_registration','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_document_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  document_type public.driver_document_type NOT NULL,
  file_path text NOT NULL,
  status public.driver_document_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver ON public.driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON public.driver_documents(status);

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_driver_documents_updated
BEFORE UPDATE ON public.driver_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Driver RLS
CREATE POLICY "Drivers view own documents" ON public.driver_documents
FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers insert own documents" ON public.driver_documents
FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers update own pending documents" ON public.driver_documents
FOR UPDATE USING (auth.uid() = driver_id AND status = 'pending');

-- Admin RLS across tables
CREATE POLICY "Admins view all documents" ON public.driver_documents
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all documents" ON public.driver_documents
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all driver profiles" ON public.driver_profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update driver profiles" ON public.driver_profiles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all customer profiles" ON public.customer_profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all bookings" ON public.bookings
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all jobs" ON public.jobs
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents','driver-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Drivers upload own docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Drivers read own docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Drivers update own docs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins read all driver docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents'
  AND public.has_role(auth.uid(), 'admin')
);
