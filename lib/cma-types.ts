// P9.4 Sprint J — Extended CMA row type. The base CMA type in supabase.ts
// does not yet include the listing_type column (added in P9.4) or the
// cma_type column (added in P9.4 Sprint G). This module extends it with
// both, providing a single import for any module that needs full row access.
//
// Import CMARow from here instead of CMA from supabase.ts whenever you need
// to read these two columns.

import type { CMA as BaseCMA } from '@/lib/supabase'

export type CMAListingType = 'regular' | 'mmm'
export type CMAType = 'sell' | 'buy'

export type CMARow = BaseCMA & {
  listing_type: CMAListingType
  cma_type: CMAType
}
