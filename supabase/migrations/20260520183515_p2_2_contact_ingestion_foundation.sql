-- P2.2: Per-tenant ingest tokens for public contact-creation endpoint.
-- Token sits in the URL of the public Edge Function. Validates the request comes from
-- an authorized tenant integration. Rotatable, revocable, labelable.

CREATE TABLE public.tenant_ingest_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'Default',
  default_list_id uuid REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  default_tag text,
  default_source_kind text NOT NULL DEFAULT 'inbound_form'
    CHECK (default_source_kind IN ('inbound_form', 'csv_import', 'api', 'manual', 'prospecting', 'referral', 'legacy_lead')),
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_ingest_keys_tenant_idx ON public.tenant_ingest_keys (tenant_id);
CREATE INDEX tenant_ingest_keys_token_active_idx ON public.tenant_ingest_keys (token) WHERE revoked_at IS NULL;

ALTER TABLE public.tenant_ingest_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_access ON public.tenant_ingest_keys
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_ingest_keys TO authenticated;


-- Default list for McMullen — "Website Inquiries" — for inbound form ingest
INSERT INTO public.contact_lists (tenant_id, name, description, created_by)
SELECT 
  'e0c8abe7-cc29-45c0-99c1-7c20b920262a',
  'Website Inquiries',
  'Auto-populated from inbound forms on mcmullen.properties and other channels.',
  '77c09777-0f62-4e24-8dcf-c862a33d6c01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_lists 
  WHERE tenant_id = 'e0c8abe7-cc29-45c0-99c1-7c20b920262a' 
  AND lower(name) = 'website inquiries'
)
RETURNING id, name;


-- Generate an ingest token for McMullen tenant, defaulting to the new Website Inquiries list
INSERT INTO public.tenant_ingest_keys (tenant_id, token, label, default_list_id, default_source_kind, default_tag, created_by)
SELECT 
  'e0c8abe7-cc29-45c0-99c1-7c20b920262a',
  encode(gen_random_bytes(24), 'base64'),
  'Webflow forms — mcmullen.properties',
  (SELECT id FROM public.contact_lists 
   WHERE tenant_id = 'e0c8abe7-cc29-45c0-99c1-7c20b920262a' 
   AND lower(name) = 'website inquiries' 
   LIMIT 1),
  'inbound_form',
  'source:website',
  '77c09777-0f62-4e24-8dcf-c862a33d6c01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_ingest_keys 
  WHERE tenant_id = 'e0c8abe7-cc29-45c0-99c1-7c20b920262a' 
  AND label = 'Webflow forms — mcmullen.properties'
)
RETURNING id, token, label;


-- Audit log entry
INSERT INTO public.audit_log (tenant_id, actor_kind, action, entity_kind, metadata)
VALUES (
  'e0c8abe7-cc29-45c0-99c1-7c20b920262a',
  'system',
  'p2_2_ingestion_schema_bootstrapped',
  'tenant_ingest_keys',
  jsonb_build_object('tables', ARRAY['tenant_ingest_keys'], 'phase', 'P2.2')
);
