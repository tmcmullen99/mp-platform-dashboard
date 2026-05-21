
-- ============================================================================
-- Platform foundation: multi-tenant primitives
-- Net-new tables, no conflicts with existing single-tenant CRM/email schema.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.platform_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- ----------------------------------------------------------------------------
-- TENANTS — each agent/brokerage with their own branded site
-- ----------------------------------------------------------------------------
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  tier text NOT NULL DEFAULT 'affiliated_agent' CHECK (tier IN ('brokerage_admin', 'affiliated_agent', 'paid_external')),
  default_subdomain text,
  custom_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_status ON public.tenants(status);

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- TENANT BRANDING — 1:1, all visual + copy config per tenant
-- ----------------------------------------------------------------------------
CREATE TABLE public.tenant_branding (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#1a1f2e',
  secondary_color text NOT NULL DEFAULT '#91a1ba',
  accent_color text NOT NULL DEFAULT '#353535',
  background_color text NOT NULL DEFAULT '#ffffff',
  heading_font text NOT NULL DEFAULT 'Playfair Display',
  body_font text NOT NULL DEFAULT 'DM Sans',
  agent_name text,
  agent_title text,
  agent_bio text,
  agent_photo_url text,
  agent_email text,
  agent_phone text,
  dre_license text,
  brokerage_affiliation text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  hero_title text,
  hero_subtitle text,
  hero_image_url text,
  service_areas text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tenant_branding_updated_at BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- USER PROFILES — extends Supabase auth.users with platform-specific fields
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  is_brokerage_admin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- TENANT USERS — M:N with per-tenant roles
-- ----------------------------------------------------------------------------
CREATE TABLE public.tenant_users (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOG — append-only record of every meaningful action
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_kind text NOT NULL DEFAULT 'user' CHECK (actor_kind IN ('user', 'ai', 'system')),
  action text NOT NULL,
  entity_kind text,
  entity_id uuid,
  chat_session_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  happened_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_time ON public.audit_log(tenant_id, happened_at DESC);
CREATE INDEX idx_audit_user_time ON public.audit_log(user_id, happened_at DESC);

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_brokerage_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_brokerage_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_tenant_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- TENANTS
CREATE POLICY tenants_select ON public.tenants FOR SELECT
  USING (public.is_brokerage_admin() OR id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenants_insert ON public.tenants FOR INSERT
  WITH CHECK (public.is_brokerage_admin());
CREATE POLICY tenants_update ON public.tenants FOR UPDATE
  USING (public.is_brokerage_admin() OR id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenants_delete ON public.tenants FOR DELETE
  USING (public.is_brokerage_admin());

-- TENANT BRANDING
CREATE POLICY tenant_branding_select ON public.tenant_branding FOR SELECT
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_branding_insert ON public.tenant_branding FOR INSERT
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_branding_update ON public.tenant_branding FOR UPDATE
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_branding_delete ON public.tenant_branding FOR DELETE
  USING (public.is_brokerage_admin());

-- USER PROFILES
CREATE POLICY user_profiles_self_select ON public.user_profiles FOR SELECT
  USING (id = auth.uid() OR public.is_brokerage_admin());
CREATE POLICY user_profiles_self_update ON public.user_profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_brokerage_admin());
CREATE POLICY user_profiles_insert ON public.user_profiles FOR INSERT
  WITH CHECK (public.is_brokerage_admin() OR id = auth.uid());

-- TENANT USERS
CREATE POLICY tenant_users_select ON public.tenant_users FOR SELECT
  USING (public.is_brokerage_admin() OR user_id = auth.uid() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_users_insert ON public.tenant_users FOR INSERT
  WITH CHECK (public.is_brokerage_admin());
CREATE POLICY tenant_users_update ON public.tenant_users FOR UPDATE
  USING (public.is_brokerage_admin());
CREATE POLICY tenant_users_delete ON public.tenant_users FOR DELETE
  USING (public.is_brokerage_admin());

-- AUDIT LOG — append-only (no update/delete policies)
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY audit_log_insert ON public.audit_log FOR INSERT
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));

-- ============================================================================
-- GRANTS (RLS alone doesn't grant access — per standing rule)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_branding TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_users TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
