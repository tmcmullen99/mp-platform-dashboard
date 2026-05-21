
-- =========================================================================
-- McMullen Properties: CRM + Client Portal + War Room foundation
-- =========================================================================

-- ===== clients =====
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  client_type text CHECK (client_type IN ('buyer','seller','both','investor','referral_partner','other')) DEFAULT 'buyer',
  stage text CHECK (stage IN ('lead','qualified','active','under_contract','closed','dormant')) DEFAULT 'lead',
  source_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  auth_user_id uuid UNIQUE,
  agent_id uuid,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX clients_email_idx ON public.clients(email);
CREATE INDEX clients_stage_idx ON public.clients(stage);
CREATE INDEX clients_auth_user_idx ON public.clients(auth_user_id);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
CREATE POLICY clients_authenticated_all ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== deals =====
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  deal_type text CHECK (deal_type IN ('buy','sell','rental','1031','investor','referral')) NOT NULL,
  stage text CHECK (stage IN ('exploring','active','offer','accepted','escrow','closed','lost')) DEFAULT 'exploring',
  estimated_value numeric,
  actual_value numeric,
  estimated_commission numeric,
  actual_commission numeric,
  close_date date,
  title text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX deals_client_idx ON public.deals(client_id);
CREATE INDEX deals_stage_idx ON public.deals(stage);
CREATE INDEX deals_property_idx ON public.deals(property_id);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
CREATE POLICY deals_authenticated_all ON public.deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== saved_listings =====
CREATE TABLE public.saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  notes text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  status text CHECK (status IN ('interested','shortlist','offered','rejected')) DEFAULT 'interested',
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, property_id)
);
CREATE INDEX saved_listings_client_idx ON public.saved_listings(client_id);
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_listings TO authenticated;
CREATE POLICY saved_listings_authenticated_all ON public.saved_listings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== war_rooms =====
CREATE TABLE public.war_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text CHECK (status IN ('active','archived')) DEFAULT 'active',
  last_message_at timestamptz,
  unread_agent integer DEFAULT 0,
  unread_client integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX war_rooms_deal_idx ON public.war_rooms(deal_id);
CREATE INDEX war_rooms_client_idx ON public.war_rooms(client_id);
CREATE INDEX war_rooms_status_idx ON public.war_rooms(status);
ALTER TABLE public.war_rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_rooms TO authenticated;
CREATE POLICY war_rooms_authenticated_all ON public.war_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== war_room_messages =====
CREATE TABLE public.war_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  war_room_id uuid REFERENCES public.war_rooms(id) ON DELETE CASCADE,
  sender_type text CHECK (sender_type IN ('agent','client','system')) NOT NULL,
  sender_id uuid,
  body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  read_by_agent boolean DEFAULT false,
  read_by_client boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX war_room_messages_room_idx ON public.war_room_messages(war_room_id, created_at DESC);
ALTER TABLE public.war_room_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_room_messages TO authenticated;
CREATE POLICY war_room_messages_authenticated_all ON public.war_room_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== activities =====
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  activity_type text CHECK (activity_type IN ('call','email','meeting','sms','note','showing','offer','contract','closing','task')) NOT NULL,
  subject text,
  body text,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX activities_client_idx ON public.activities(client_id, occurred_at DESC);
CREATE INDEX activities_deal_idx ON public.activities(deal_id);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
CREATE POLICY activities_authenticated_all ON public.activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== documents =====
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  category text CHECK (category IN ('disclosure','contract','offer','inspection','appraisal','closing','marketing','cma','other')) DEFAULT 'other',
  uploaded_by_type text CHECK (uploaded_by_type IN ('agent','client','system')) DEFAULT 'agent',
  uploaded_by_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX documents_client_idx ON public.documents(client_id);
CREATE INDEX documents_deal_idx ON public.documents(deal_id);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
CREATE POLICY documents_authenticated_all ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== notifications =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text CHECK (recipient_type IN ('agent','client')) NOT NULL,
  recipient_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX notifications_recipient_idx ON public.notifications(recipient_type, recipient_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications(recipient_type, recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
CREATE POLICY notifications_authenticated_all ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger to keep updated_at fresh on the major tables
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
