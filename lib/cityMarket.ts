// Read-only Supabase client pointed at the City Markets project (Platform A).
//
// A THIRD deliberately isolated client, built to the same rules as
// condoMarket.ts. It exists for exactly one job: rendering a published probate
// valuation from its token, so the QR code printed on letter 2 has a page to
// land on.
//
//   - persistSession: false  (no auth writes)
//   - a distinct storageKey  (never collides with the main or condo sessions)
//   - anon key only
//
// WHAT ANON CAN ACTUALLY REACH HERE IS ONE FUNCTION. probate_valuation_public
// is the only probate RPC granted to `anon`; probate_filings and
// probate_valuations both have RLS on with no anon policy, and a direct table
// read returns zero rows. The function itself returns the property, the range
// and the comparables and deliberately omits the petitioner's name and contact
// details — a token in a letter gets forwarded, photographed and mislaid, and
// the page should show the house, never the family.

import { createClient } from '@supabase/supabase-js'

const CITY_URL = 'https://qinuukntpyulqjzndnho.supabase.co'
const CITY_ANON_KEY = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'

export const cityMarket = createClient(CITY_URL, CITY_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'city-readonly-noauth',
  },
})

export type ValuationComp = {
  address: string
  sold?: string | null
  price?: number | null
  sqft?: number | null
  note?: string | null
}

export type ProbateValuation = {
  ok: true
  property: string | null
  city: string | null
  state: string | null
  zip: string | null
  county: string | null
  as_of: string | null
  low: number | null
  mid: number | null
  high: number | null
  comparables: ValuationComp[]
  narrative: string | null
  method_note: string | null
  condition_note: string | null
  prepared_by: string | null
  published_at: string | null
}

export async function fetchProbateValuation(
  token: string,
): Promise<{ data: ProbateValuation | null; error: string | null }> {
  const clean = String(token ?? '').trim()
  /* The token is 32 hex characters. Rejecting anything else here saves a
     round trip and keeps junk out of the logs. */
  if (!/^[a-f0-9]{32}$/i.test(clean)) {
    return { data: null, error: 'not_found' }
  }
  const { data, error } = await cityMarket.rpc('probate_valuation_public', { p_token: clean })
  if (error) return { data: null, error: error.message }
  if (!data || (data as { ok?: boolean }).ok !== true) return { data: null, error: 'not_found' }
  return { data: data as ProbateValuation, error: null }
}
