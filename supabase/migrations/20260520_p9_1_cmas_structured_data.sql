-- P9.1 CMA Builder: structured data + agent ownership
-- Move CMAs from opaque HTML blobs to structured JSON we can render in React,
-- edit later, and re-theme. cma_html stays for backward-compat with legacy rows.
--
-- Applied: 2026-05-20 via Supabase MCP.

ALTER TABLE public.cmas
  ADD COLUMN IF NOT EXISTS subject_data jsonb,
  ADD COLUMN IF NOT EXISTS comps_data jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  ADD COLUMN IF NOT EXISTS agent_notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cmas_status_idx ON public.cmas (status) WHERE status != 'archived';
CREATE INDEX IF NOT EXISTS cmas_tenant_status_idx ON public.cmas (tenant_id, status) WHERE tenant_id IS NOT NULL;

-- updated_at trigger (the table doesn't have one yet despite the column)
CREATE OR REPLACE FUNCTION public.cmas_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cmas_updated_at ON public.cmas;
CREATE TRIGGER cmas_updated_at
  BEFORE UPDATE ON public.cmas
  FOR EACH ROW EXECUTE FUNCTION public.cmas_set_updated_at();
