-- Add publish/archive flags so RLS can filter
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Backfill: every existing row stays published, none archived
UPDATE public.blog_posts SET is_published = true WHERE is_published IS NULL;
UPDATE public.blog_posts SET is_archived = false WHERE is_archived IS NULL;

-- Public read policy: anyone can SELECT published + non-archived rows
DROP POLICY IF EXISTS "public_read_blog_posts" ON public.blog_posts;
CREATE POLICY "public_read_blog_posts"
  ON public.blog_posts
  FOR SELECT
  TO public
  USING (is_published = true AND is_archived = false);

-- Authenticated full CRUD
DROP POLICY IF EXISTS "authenticated_all_blog_posts" ON public.blog_posts;
CREATE POLICY "authenticated_all_blog_posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT SELECT ON public.blog_posts TO anon;

-- Performance indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_blog_posts_publish_date
  ON public.blog_posts(publish_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_blog_posts_visible
  ON public.blog_posts(is_published, is_archived, publish_date DESC NULLS LAST)
  WHERE is_published = true AND is_archived = false;
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags_gin
  ON public.blog_posts USING gin (tags_array);