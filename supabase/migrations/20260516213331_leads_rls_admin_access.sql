-- Drop the open anon insert; the webhook EF will own the trusted ingress path
-- using the service role (bypasses RLS).
DROP POLICY IF EXISTS anon_insert_leads ON public.leads;

-- Admin (authenticated users) needs full CRUD on leads.
DROP POLICY IF EXISTS auth_select_leads ON public.leads;
CREATE POLICY auth_select_leads ON public.leads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS auth_update_leads ON public.leads;
CREATE POLICY auth_update_leads ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS auth_delete_leads ON public.leads;
CREATE POLICY auth_delete_leads ON public.leads FOR DELETE TO authenticated USING (true);

-- Column-level grants for the authenticated role (per the standing rule).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;