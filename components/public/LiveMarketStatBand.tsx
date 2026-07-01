// STAGE 1 PROOF: a live stat band that reads real Condo Market data via the
// read-only second client. If this renders live SF numbers on the deployed
// site, the cross-project data plumbing is proven and Stages 2-3 are UI on top.

import { useEffect, useState } from 'react'
import { fetchCityMonthly, fetchBuildingStats, type CityMonthly } from '@/lib/condoMarket'
import { Reveal, NAVY, INK } from '@/components/public/motion'

const BLUE = '#4f82b9'

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

export default function LiveMarketStatBand({ dataSlug = 'san-francisco-condo-market' }: { dataSlug?: string }) {
  const [monthly, setMonthly] = useState<CityMonthly[]>([])
  const [buildingCount, setBuildingCount] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [m, b] = await Promise.all([fetchCityMonthly(3), fetchBuildingStats(dataSlug, 12)])
      if (cancelled) return
      setMonthly(m)
      setBuildingCount(b.length)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [dataSlug])

  const latest = monthly.length ? monthly[monthly.length - 1] : null

  const stats = [
    { label: 'Median $/sf', value: latest ? `$${latest.median_psf.toLocaleString()}` : '—' },
    { label: 'Sales (latest mo.)', value: latest ? String(latest.sales) : '—' },
    { label: 'Median price', value: latest ? fmtMoney(latest.median_price) : '—' },
    { label: 'Active buildings', value: buildingCount != null ? String(buildingCount) : '—' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Reveal>
        <div className="rounded-[24px] border border-black/[0.08] bg-white p-8">
          <div className="mp-mono text-[11px] uppercase tracking-[0.2em] mb-6" style={{ color: BLUE }}>
            {loaded ? 'Live · Condo Market data' : 'Loading live data…'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="mp-serif text-[38px] md:text-[48px] font-semibold leading-none" style={{ color: NAVY }}>
                  {s.value}
                </div>
                <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {latest ? (
            <div className="mt-6 text-xs" style={{ color: INK }}>
              Latest data month: {new Date(latest.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          ) : null}
        </div>
      </Reveal>
    </div>
  )
}
