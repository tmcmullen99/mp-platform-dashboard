-- P3.1 Email Campaigns foundation
-- Two new tenant-scoped tables: campaigns (one row per blast) and campaign_recipients (one row per recipient).
-- RLS policies use the IN (SELECT ...) pattern required for SETOF helper functions.

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  from_name text NOT NULL,
  from_email text NOT NULL,
  reply_to text,
  html_body text NOT NULL DEFAULT '',
  plain_body text NOT NULL DEFAULT '',
  list_id uuid REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','sending','sent','failed','canceled')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  unsubscribed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_tenant_created_idx ON public.campaigns (tenant_id, created_at DESC);
CREATE INDEX campaigns_tenant_status_idx ON public.campaigns (tenant_id, status);
CREATE INDEX campaigns_list_idx ON public.campaigns (list_id) WHERE list_id IS NOT NULL;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_access ON public.campaigns
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();


CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  email_at_send text NOT NULL,
  tracking_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','bounced','failed','skipped','complained')),
  resend_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  unsubscribed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaign_recipients_tenant_campaign_idx ON public.campaign_recipients (tenant_id, campaign_id);
CREATE INDEX campaign_recipients_contact_idx ON public.campaign_recipients (contact_id);
CREATE INDEX campaign_recipients_campaign_status_idx ON public.campaign_recipients (campaign_id, status);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_access ON public.campaign_recipients
  USING (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_brokerage_admin() OR tenant_id IN (SELECT public.current_user_tenant_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;


-- Audit log bootstrap
INSERT INTO public.audit_log (tenant_id, actor_kind, action, entity_kind, metadata)
SELECT id, 'system', 'p3_email_schema_bootstrapped', 'campaigns',
       jsonb_build_object('tables', ARRAY['campaigns','campaign_recipients'], 'phase', 'P3.1')
FROM public.tenants;
