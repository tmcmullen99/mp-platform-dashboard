-- P9.2 — Client external listings (Zillow links + future MLS / Redfin sources)
-- Separate from saved_listings (which only handles internal properties catalog records)
-- so external URLs can stand on their own without forcing a join through properties.
-- Applied: 2026-05-20 via Supabase MCP.

CREATE TABLE IF NOT EXISTS public.client_external_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,

  added_by_type text NOT NULL DEFAULT 'agent' CHECK (added_by_type IN ('agent','client')),
  added_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  source_kind text NOT NULL DEFAULT 'zillow' CHECK (source_kind IN ('zillow','redfin','realtor','mls','other')),
  source_url text NOT NULL,

  address text,
  city text,
  state text,
  zip text,
  price numeric,
  bedrooms numeric,
  bathrooms numeric,
  sqft numeric,
  lot_sqft numeric,
  year_built integer,
  property_type text,
  hoa_monthly numeric,
  parking_type text,
  parking_spaces integer,
  outdoor_features text[] DEFAULT '{}',
  photo_url text,
  raw_extracted_data jsonb DEFAULT '{}'::jsonb,

  is_favorite boolean DEFAULT false,
  notes text,
  client_status text DEFAULT 'interested'
    CHECK (client_status IN ('interested','shortlist','toured','offered','rejected')),

  fetch_status text DEFAULT 'pending'
    CHECK (fetch_status IN ('pending','success','failed','manual')),
  fetch_error text,
  fetched_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_external_listings TO authenticated;

CREATE INDEX IF NOT EXISTS cel_client_idx ON public.client_external_listings (client_id);
CREATE INDEX IF NOT EXISTS cel_tenant_idx ON public.client_external_listings (tenant_id);
CREATE INDEX IF NOT EXISTS cel_client_favorite_idx ON public.client_external_listings (client_id, is_favorite) WHERE is_favorite = true;

CREATE OR REPLACE FUNCTION public.cel_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cel_updated_at ON public.client_external_listings;
CREATE TRIGGER cel_updated_at
  BEFORE UPDATE ON public.client_external_listings
  FOR EACH ROW EXECUTE FUNCTION public.cel_set_updated_at();

ALTER TABLE public.client_external_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cel_select ON public.client_external_listings;
CREATE POLICY cel_select ON public.client_external_listings
  FOR SELECT TO authenticated
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );

DROP POLICY IF EXISTS cel_insert ON public.client_external_listings;
CREATE POLICY cel_insert ON public.client_external_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );

DROP POLICY IF EXISTS cel_update ON public.client_external_listings;
CREATE POLICY cel_update ON public.client_external_listings
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS cel_delete ON public.client_external_listings;
CREATE POLICY cel_delete ON public.client_external_listings
  FOR DELETE TO authenticated
  USING (
    public.is_brokerage_admin()
    OR tenant_id IN (SELECT public.current_user_tenant_ids())
    OR client_id = public.current_user_client_id()
  );
