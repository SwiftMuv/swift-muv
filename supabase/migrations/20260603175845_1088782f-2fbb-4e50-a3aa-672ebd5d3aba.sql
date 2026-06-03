
DROP VIEW IF EXISTS public.driver_reviews_public;

CREATE OR REPLACE FUNCTION public.get_driver_reviews(_driver_id uuid, _limit integer DEFAULT 5)
RETURNS TABLE(id uuid, stars integer, comment text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.stars, r.comment, r.created_at
  FROM public.ratings r
  WHERE r.ratee_id = _driver_id
  ORDER BY r.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 5), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_reviews(uuid, integer) TO authenticated, anon;
