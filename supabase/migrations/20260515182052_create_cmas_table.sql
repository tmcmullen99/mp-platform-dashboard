-- CMAs table: holds the self-contained HTML CMA pages migrated from Webflow.
-- Each row stores a complete rendered CMA (the cma_html column is ~20KB of inline HTML+CSS+JS).
-- The /cmas/{slug} route on Cloudflare Pages renders this raw.

CREATE TABLE public.cmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webflow_id text UNIQUE,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  property_address text,
  list_price text,
  cma_html text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cmas IS 'Comparative Market Analysis pages. Each row is a self-contained HTML CMA rendered at /cmas/{slug}. Migrated from Webflow CMAs collection 69cc1b12a425cc35627c2d88.';
COMMENT ON COLUMN public.cmas.cma_html IS 'Complete HTML+CSS+JS string. Rendered as raw HTML on the public CMA route.';

CREATE INDEX cmas_slug_idx ON public.cmas (slug);
CREATE INDEX cmas_published_at_idx ON public.cmas (published_at DESC NULLS LAST);

ALTER TABLE public.cmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmas_public_read" ON public.cmas
  FOR SELECT
  USING (true);

CREATE POLICY "cmas_service_write" ON public.cmas
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');