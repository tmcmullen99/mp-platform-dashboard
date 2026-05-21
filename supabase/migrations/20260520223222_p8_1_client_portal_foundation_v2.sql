-- P8.1: Multi-tenant-ify the 8 legacy client portal tables.

-- 1. Add tenant_id columns
ALTER TABLE public.clients ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.deals ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.war_rooms ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.war_room_messages ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.activities ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.saved_listings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Drop global UNIQUE on clients.email, replace with tenant-scoped
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_email_unique_idx 
  ON public.clients (tenant_id, lower(email)) WHERE email IS NOT NULL;

-- 3. Add contact_id FK linking clients ↔ contacts
ALTER TABLE public.clients ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_contact_unique_idx 
  ON public.clients (tenant_id, contact_id) WHERE contact_id IS NOT NULL;

-- 4. service_package + listing link on deals
ALTER TABLE public.deals ADD COLUMN service_package text 
  CHECK (service_package IN ('make_me_move', 'coming_soon', 'active_listing', 'pre_market', 'buyer_representation', 'tbd'));
ALTER TABLE public.deals ADD COLUMN coming_soon_listing_id uuid REFERENCES public.coming_soon_listings(id) ON DELETE SET NULL;

-- 5. Tenant indexes
CREATE INDEX IF NOT EXISTS clients_tenant_idx ON public.clients (tenant_id);
CREATE INDEX IF NOT EXISTS deals_tenant_idx ON public.deals (tenant_id);
CREATE INDEX IF NOT EXISTS war_rooms_tenant_idx ON public.war_rooms (tenant_id);
CREATE INDEX IF NOT EXISTS war_room_messages_tenant_idx ON public.war_room_messages (tenant_id);
CREATE INDEX IF NOT EXISTS activities_tenant_idx ON public.activities (tenant_id);
CREATE INDEX IF NOT EXISTS documents_tenant_idx ON public.documents (tenant_id);
CREATE INDEX IF NOT EXISTS notifications_tenant_idx ON public.notifications (tenant_id);
CREATE INDEX IF NOT EXISTS saved_listings_tenant_idx ON public.saved_listings (tenant_id);
CREATE INDEX IF NOT EXISTS activities_occurred_idx ON public.activities (occurred_at DESC);

-- 6. Replace legacy "all authenticated" policies with tenant-scoped
DROP POLICY IF EXISTS clients_authenticated_all ON public.clients;
DROP POLICY IF EXISTS deals_authenticated_all ON public.deals;
DROP POLICY IF EXISTS war_rooms_authenticated_all ON public.war_rooms;
DROP POLICY IF EXISTS war_room_messages_authenticated_all ON public.war_room_messages;
DROP POLICY IF EXISTS activities_authenticated_all ON public.activities;
DROP POLICY IF EXISTS documents_authenticated_all ON public.documents;
DROP POLICY IF EXISTS notifications_authenticated_all ON public.notifications;
DROP POLICY IF EXISTS saved_listings_authenticated_all ON public.saved_listings;

CREATE POLICY tenant_access ON public.clients
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_access ON public.deals
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_access ON public.war_rooms
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_access ON public.war_room_messages
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_access ON public.activities
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_access ON public.documents
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_access ON public.notifications
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));
CREATE POLICY tenant_access ON public.saved_listings
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));

-- 7. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_room_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_listings TO authenticated;

-- 8. Audit
INSERT INTO public.audit_log (tenant_id, actor_kind, action, entity_kind, metadata)
VALUES (
  'e0c8abe7-cc29-45c0-99c1-7c20b920262a',
  'ai',
  'p8_1_client_portal_schema_bootstrapped',
  'clients',
  jsonb_build_object(
    'tables_migrated', ARRAY['clients','deals','war_rooms','war_room_messages','activities','documents','notifications','saved_listings'],
    'phase', 'P8.1'
  )
);