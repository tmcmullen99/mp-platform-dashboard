-- Tracking infrastructure for email blasts (Resend) and admin dashboard
-- Powers the admin dashboard at mcmullen-admin.tim-d10.workers.dev
-- Eventually moves to /admin route on the CF Pages site post-migration.

CREATE TABLE IF NOT EXISTS public.email_blasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_slug text,
  template text NOT NULL CHECK (template IN ('A', 'B')),
  subject text NOT NULL,
  recipient_count integer NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.email_blasts IS 'Log of outgoing email campaigns. Each row = one production blast. Powers the admin dashboard.';

CREATE INDEX IF NOT EXISTS idx_email_blasts_created_at
  ON public.email_blasts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_blasts_listing
  ON public.email_blasts (listing_slug);

-- RLS: admin-only via service role key (worker uses service key)
ALTER TABLE public.email_blasts ENABLE ROW LEVEL SECURITY;

-- Lead tracking: index on source for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_leads_source_created
  ON public.leads (source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON public.leads (created_at DESC);