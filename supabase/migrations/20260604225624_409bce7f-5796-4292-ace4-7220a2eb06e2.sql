
CREATE POLICY "Drivers delete own pending documents"
ON public.driver_documents
FOR DELETE
TO authenticated
USING (auth.uid() = driver_id AND status = 'pending'::driver_document_status);

CREATE POLICY "Admins delete any document"
ON public.driver_documents
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
