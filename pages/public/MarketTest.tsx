// STAGE 1 PROOF PAGE (temporary). Route: /market-test
// Proves the McMullen site can read live Condo Market data. Removed in Stage 3
// once the real Market Insight hub is live.

import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import { MotionStyles, Reveal, NAVY, INK } from '@/components/public/motion'
import LiveMarketStatBand from '@/components/public/LiveMarketStatBand'

export default function MarketTest() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav />
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-6">
        <Reveal>
          <h1 className="mp-serif text-[36px] font-semibold" style={{ color: NAVY }}>
            Live data proof
          </h1>
          <p className="mt-3" style={{ color: INK }}>
            The numbers below are pulled live from the Condo Market database via the read-only
            client. If they show real values, the integration works.
          </p>
        </Reveal>
      </div>
      <LiveMarketStatBand dataSlug="san-francisco-condo-market" />
      <div className="py-20" />
      <PublicFooter />
    </div>
  )
}
