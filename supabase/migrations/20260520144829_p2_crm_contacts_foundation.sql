
-- ============================================================
-- P2 CRM foundation: tenant-scoped contacts model
-- 7 new tables: contacts, contact_lists, contact_list_memberships,
-- contact_tags, contact_tag_assignments, contact_sources, contact_events
-- ============================================================

-- ------------------------------------------------------------
-- 1. contacts
-- ------------------------------------------------------------
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  phone text,
  lifecycle_stage text NOT NULL DEFAULT 'new'
    CHECK (lifecycle_stage IN ('new','engaged','qualified','customer','former_customer')),
  email_subscription_status text NOT NULL DEFAULT 'subscribed'
    CHECK (email_subscription_status IN ('subscribed','unsubscribed','bounced','complained')),
  notes text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contacts_tenant_email_unique
  ON public.contacts (tenant_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX contacts_tenant_lifecycle_idx
  ON public.contacts (tenant_id, lifecycle_stage);
CREATE INDEX contacts_tenant_subscription_idx
  ON public.contacts (tenant_id, email_subscription_status);
CREATE INDEX contacts_tenant_created_at_idx
  ON public.contacts (tenant_id, created_at DESC);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_tenant_scoped" ON public.contacts FOR ALL
  USING (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;

-- ------------------------------------------------------------
-- 2. contact_lists
-- ------------------------------------------------------------
CREATE TABLE public.contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX contact_lists_tenant_idx ON public.contact_lists (tenant_id);
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_lists_tenant_scoped" ON public.contact_lists FOR ALL
  USING (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_lists TO authenticated;

-- ------------------------------------------------------------
-- 3. contact_list_memberships
-- ------------------------------------------------------------
CREATE TABLE public.contact_list_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);
CREATE UNIQUE INDEX contact_list_memberships_active_unique
  ON public.contact_list_memberships (list_id, contact_id) WHERE removed_at IS NULL;
CREATE INDEX contact_list_memberships_list_active_idx
  ON public.contact_list_memberships (list_id) WHERE removed_at IS NULL;
CREATE INDEX contact_list_memberships_contact_idx
  ON public.contact_list_memberships (contact_id);
ALTER TABLE public.contact_list_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_list_memberships_tenant_scoped" ON public.contact_list_memberships FOR ALL
  USING (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_list_memberships TO authenticated;

-- ------------------------------------------------------------
-- 4. contact_tags
-- ------------------------------------------------------------
CREATE TABLE public.contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX contact_tags_tenant_idx ON public.contact_tags (tenant_id);
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_tags_tenant_scoped" ON public.contact_tags FOR ALL
  USING (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_tags TO authenticated;

-- ------------------------------------------------------------
-- 5. contact_tag_assignments
-- ------------------------------------------------------------
CREATE TABLE public.contact_tag_assignments (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);
CREATE INDEX contact_tag_assignments_tag_idx ON public.contact_tag_assignments (tag_id);
CREATE INDEX contact_tag_assignments_tenant_idx ON public.contact_tag_assignments (tenant_id);
ALTER TABLE public.contact_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_tag_assignments_tenant_scoped" ON public.contact_tag_assignments FOR ALL
  USING (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_tag_assignments TO authenticated;

-- ------------------------------------------------------------
-- 6. contact_sources
-- ------------------------------------------------------------
CREATE TABLE public.contact_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  source_kind text NOT NULL
    CHECK (source_kind IN ('manual','inbound_form','csv_import','prospecting','referral','api','legacy_lead')),
  source_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_sources_contact_idx ON public.contact_sources (contact_id);
CREATE INDEX contact_sources_tenant_kind_idx ON public.contact_sources (tenant_id, source_kind);
ALTER TABLE public.contact_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_sources_tenant_scoped" ON public.contact_sources FOR ALL
  USING (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_sources TO authenticated;

-- ------------------------------------------------------------
-- 7. contact_events (P3 stub)
-- ------------------------------------------------------------
CREATE TABLE public.contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_kind text NOT NULL,
  event_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_events_contact_occurred_idx
  ON public.contact_events (contact_id, occurred_at DESC);
CREATE INDEX contact_events_tenant_kind_idx
  ON public.contact_events (tenant_id, event_kind);
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_events_tenant_scoped" ON public.contact_events FOR ALL
  USING (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (is_brokerage_admin() OR tenant_id IN (SELECT current_user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_events TO authenticated;

-- ------------------------------------------------------------
-- 8. updated_at triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER contact_lists_set_updated_at
  BEFORE UPDATE ON public.contact_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ------------------------------------------------------------
-- 9. Audit log bootstrap
-- ------------------------------------------------------------
INSERT INTO public.audit_log (tenant_id, actor_kind, action, entity_kind, metadata)
SELECT
  id, 'system', 'p2_schema_bootstrapped', 'tenant',
  jsonb_build_object(
    'tables', ARRAY[
      'contacts','contact_lists','contact_list_memberships',
      'contact_tags','contact_tag_assignments','contact_sources','contact_events'
    ]
  )
FROM public.tenants;
