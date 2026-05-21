-- P8.2: Open the 8 client-portal tables to authenticated clients (not just tenant agents).
-- Adds a helper to resolve "current client", an auto-link trigger on auth.users,
-- and replaces each tenant_access policy with one that also allows the owning client.

-- 1. Helper: resolve current auth user → their client row
CREATE OR REPLACE FUNCTION public.current_user_client_id() RETURNS uuid AS $$
  SELECT id FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.current_user_client_id() TO authenticated;

-- 2. Auto-link trigger: when a new auth.users row is created with an email
-- that matches an unclaimed clients.email (case-insensitive), set auth_user_id.
-- Safe because magic-link auth proves email control, and we only fire when
-- the client's auth_user_id is still NULL (no hijack risk after first link).
CREATE OR REPLACE FUNCTION public.auto_link_client_to_auth() RETURNS trigger AS $$
BEGIN
  UPDATE public.clients
  SET auth_user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND auth_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_link_client_after_auth_insert ON auth.users;
CREATE TRIGGER auto_link_client_after_auth_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_client_to_auth();

-- Same trigger on UPDATE in case email is added later
DROP TRIGGER IF EXISTS auto_link_client_after_auth_update ON auth.users;
CREATE TRIGGER auto_link_client_after_auth_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.auto_link_client_to_auth();

-- 3. Replace policies on the 8 tables — agents OR the owning client can access

-- clients
DROP POLICY IF EXISTS tenant_access ON public.clients;
CREATE POLICY tenant_or_self_access ON public.clients
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR auth_user_id = auth.uid()
  );

-- deals
DROP POLICY IF EXISTS tenant_access ON public.deals;
CREATE POLICY tenant_or_client_access ON public.deals
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );

-- war_rooms
DROP POLICY IF EXISTS tenant_access ON public.war_rooms;
CREATE POLICY tenant_or_client_access ON public.war_rooms
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );

-- war_room_messages — match via war_room → client
DROP POLICY IF EXISTS tenant_access ON public.war_room_messages;
CREATE POLICY tenant_or_client_access ON public.war_room_messages
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR war_room_id IN (
      SELECT id FROM public.war_rooms WHERE client_id = public.current_user_client_id()
    )
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR war_room_id IN (
      SELECT id FROM public.war_rooms WHERE client_id = public.current_user_client_id()
    )
  );

-- activities — agents only for now (client doesn't need to see internal timeline)
DROP POLICY IF EXISTS tenant_access ON public.activities;
CREATE POLICY tenant_access ON public.activities
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
  );

-- documents — both sides
DROP POLICY IF EXISTS tenant_access ON public.documents;
CREATE POLICY tenant_or_client_access ON public.documents
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );

-- notifications — recipient sees own
DROP POLICY IF EXISTS tenant_access ON public.notifications;
CREATE POLICY tenant_or_recipient_access ON public.notifications
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR (recipient_type = 'client' AND recipient_id = public.current_user_client_id())
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR (recipient_type = 'client' AND recipient_id = public.current_user_client_id())
  );

-- saved_listings — client sees own
DROP POLICY IF EXISTS tenant_access ON public.saved_listings;
CREATE POLICY tenant_or_client_access ON public.saved_listings
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  )
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );

-- 4. coming_soon_listings: clients can read THEIR listing (one referenced by their deal).
-- Current policies on this table allow public read (it's a marketing surface). Confirm.
-- (No change needed if it's already public-readable; we just ensure client can SELECT.)
GRANT SELECT ON public.coming_soon_listings TO authenticated;

-- 5. Realtime: enable INSERT/UPDATE/DELETE replication on war_room_messages
-- so both sides see new messages live without polling.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'war_room_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.war_room_messages;
  END IF;
END $$;

-- 6. Audit
INSERT INTO public.audit_log (tenant_id, actor_kind, action, entity_kind, metadata)
VALUES (
  'e0c8abe7-cc29-45c0-99c1-7c20b920262a',
  'ai',
  'p8_2_client_portal_access_enabled',
  'clients',
  jsonb_build_object(
    'phase', 'P8.2',
    'features', ARRAY['client_login', 'war_room_messaging', 'realtime', 'auto_link_trigger'],
    'helper_fn', 'current_user_client_id',
    'realtime_tables', ARRAY['war_room_messages']
  )
);