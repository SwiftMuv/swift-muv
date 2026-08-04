CREATE TABLE public.job_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_messages_job_id_created_at_idx ON public.job_messages(job_id, created_at);

GRANT SELECT, INSERT ON public.job_messages TO authenticated;
GRANT ALL ON public.job_messages TO service_role;

ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_job_thread(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.bookings b ON b.id = j.booking_id
    WHERE j.id = _job_id
      AND (j.driver_id = _user_id OR b.customer_id = _user_id)
  );
$$;

CREATE POLICY "Participants can read job messages"
ON public.job_messages FOR SELECT TO authenticated
USING (public.can_access_job_thread(job_id, auth.uid()));

CREATE POLICY "Participants can send job messages"
ON public.job_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.can_access_job_thread(job_id, auth.uid()));

ALTER TABLE public.job_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_messages;