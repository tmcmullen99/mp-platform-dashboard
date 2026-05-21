-- Coming Soon listings: pre-market property pages for buyer-list building.
-- Distinct from `properties` because (a) these may not have full MLS data yet,
-- (b) lifecycle is different (eventually graduate to `properties` on go-live),
-- (c) admin workflow is different (lighter editor, faster publish).

CREATE TABLE public.coming_soon_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,                    -- e.g. "1515 Union Street" or "Union House"
  subtitle TEXT,                         -- e.g. "Two-unit Victorian in Russian Hill"
  neighborhood TEXT,                     -- denormalized text (not FK) for flexibility
  property_type TEXT,                    -- "Single Family", "Condo", "Multi-Family", etc.
  bedrooms NUMERIC,
  bathrooms NUMERIC,
  area_sqft NUMERIC,
  price_estimate TEXT,                   -- "$2.8M - $3.1M" or "Inquire" — free-form
  expected_list_date DATE,               -- approximate go-live date
  description_html TEXT,                 -- rich text from admin
  features_html TEXT,                    -- optional features list HTML
  hero_image_url TEXT,                   -- required: main hero image
  hero_image_alt TEXT,
  gallery_urls JSONB DEFAULT '[]'::jsonb, -- array of {url, alt}
  is_published BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,     -- archived after go-live (page kept for referrer history)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csl_slug ON public.coming_soon_listings(slug);
CREATE INDEX idx_csl_pub ON public.coming_soon_listings(is_published, is_archived)
  WHERE is_published = true AND is_archived = false;

-- RLS: anyone can read published/non-archived; authenticated has full CRUD.
ALTER TABLE public.coming_soon_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_coming_soon"
  ON public.coming_soon_listings
  FOR SELECT
  TO public
  USING (is_published = true AND is_archived = false);

CREATE POLICY "authenticated_all_coming_soon"
  ON public.coming_soon_listings
  FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coming_soon_listings TO authenticated;
GRANT SELECT ON public.coming_soon_listings TO anon;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.csl_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_csl_updated
  BEFORE UPDATE ON public.coming_soon_listings
  FOR EACH ROW EXECUTE FUNCTION public.csl_set_updated_at();