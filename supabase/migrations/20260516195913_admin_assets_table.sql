CREATE TABLE IF NOT EXISTS public.admin_assets (
  key text PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'text/html; charset=utf-8',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_assets ENABLE ROW LEVEL SECURITY;
-- Reads happen via the edge function which uses the service role key, so we
-- intentionally do NOT grant any public/authenticated SELECT. The admin HTML
-- itself is served via the edge function which gates on Supabase Auth at the
-- client level.

-- Seed the v0.3 admin row with empty content; we will populate via UPDATE
-- statements that concat 16KB chunks at a time.
INSERT INTO public.admin_assets (key, content, content_type)
VALUES ('admin/index_v03.html', '', 'text/html; charset=utf-8')
ON CONFLICT (key) DO UPDATE SET content = '', updated_at = now();