-- P8.3: Documents storage, client listing edits with approval, CMA multi-tenant.

-- ============================================================================
-- 1. listing_edits table — client-proposed listing changes with agent approval
-- ============================================================================
CREATE TABLE public.listing_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.coming_soon_listings(id) ON DELETE CASCADE,
  proposed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  proposed_by_type text NOT NULL CHECK (proposed_by_type IN ('agent', 'client')),
  field_changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  agent_response text,
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX listing_edits_tenant_idx ON public.listing_edits (tenant_id);
CREATE INDEX listing_edits_deal_idx ON public.listing_edits (deal_id);
CREATE INDEX listing_edits_status_idx ON public.listing_edits (status) WHERE status = 'pending';
CREATE INDEX listing_edits_created_idx ON public.listing_edits (created_at DESC);

ALTER TABLE public.listing_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_or_client_access ON public.listing_edits
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR deal_id IN (
      SELECT id FROM public.deals WHERE client_id = public.current_user_client_id()
    )
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR deal_id IN (
      SELECT id FROM public.deals WHERE client_id = public.current_user_client_id()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_edits TO authenticated;

-- ============================================================================
-- 2. Multi-tenant-ify cmas (pre-multi-tenant table from Webflow era)
-- ============================================================================
ALTER TABLE public.cmas ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cmas ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.cmas ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cmas_tenant_idx ON public.cmas (tenant_id);
CREATE INDEX IF NOT EXISTS cmas_client_idx ON public.cmas (client_id) WHERE client_id IS NOT NULL;

-- Drop existing legacy policy if any, replace
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cmas'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.cmas', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY tenant_or_client_access ON public.cmas
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
    OR tenant_id IS NULL  -- legacy Webflow CMAs visible to all authenticated for now
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmas TO authenticated;

-- ============================================================================
-- 3. Storage bucket: client-documents (private)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies — path convention: <client_id>/<filename>
DROP POLICY IF EXISTS "client_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "client_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "client_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "client_docs_delete" ON storage.objects;

CREATE POLICY "client_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (
      -- Client viewing own folder
      (storage.foldername(name))[1] = (
        SELECT id::text FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
      )
      -- OR agent viewing a client in their tenant
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.tenant_id IN (SELECT public.current_user_tenant_ids())
      )
    )
  );

CREATE POLICY "client_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (
      (storage.foldername(name))[1] = (
        SELECT id::text FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
      )
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.tenant_id IN (SELECT public.current_user_tenant_ids())
      )
    )
  );

CREATE POLICY "client_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND owner_id::text = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'client-documents'
    AND owner_id::text = auth.uid()::text
  );

CREATE POLICY "client_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (
      owner_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND c.tenant_id IN (SELECT public.current_user_tenant_ids())
      )
    )
  );

-- ============================================================================
-- 4. Realtime on notifications so the bell badges update live
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ============================================================================
-- 5. Audit
-- ============================================================================
INSERT INTO public.audit_log (tenant_id, actor_kind, action, entity_kind, metadata)
VALUES (
  'e0c8abe7-cc29-45c0-99c1-7c20b920262a',
  'ai',
  'p8_3_documents_listing_edits_cmas',
  'platform',
  jsonb_build_object(
    'phase', 'P8.3',
    'features', ARRAY['listing_edits_approval', 'document_storage', 'cma_multi_tenant', 'notification_bell'],
    'storage_bucket', 'client-documents',
    'realtime_tables', ARRAY['notifications']
  )
);