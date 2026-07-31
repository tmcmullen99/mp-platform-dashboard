// Eichler Market intelligence — the architectural market.
//
// Eichler is deliberately NOT a fourth toggle inside SouthBayIntel: it is a
// category that spans cities (Palo Alto, Sunnyvale, San Mateo, San Jose, Los
// Altos), not a South Bay city, and folding it in would break that section's
// "three cities, one method" framing. It gets its own section, reusing the same
// chart component so the visual language stays identical.
//
// DATA SHAPE NOTE: Eichler sale dates are month-granularity ("Apr 2026"), and
// roughly 120 sales a year spread across 54 tracts. That is far too thin for a
// per-tract quarterly trend, so the chart is citywide-quarterly while tracts get
// medians over 1/3/5/10-year windows with their sale counts shown. Windows with
// fewer than five sales are labelled rather than presented as confident medians.

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { PsfCompareChart, type Series } from '@/components/public/SouthBayIntel'
import { RANGES, fmtMoney, fmtNum, sliceQuarters, pctChange, type RangeKey, type SbQuarter } from '@/lib/southBay'

const NAVY = '#1a1f2e'
const INK = '#5b6675'
const EICHLER = '#1f7a4d'
const EICHLER_URL = 'https://eichlermarket.com'

type TractWindow = { ppsf: number | null; price: number | null; n: number }
type Tract = {
  ts: string
  name: string
  city: string
  total: number
  h1: TractWindow
  h3: TractWindow
  h5: TractWindow
  h10: TractWindow
}
type EichlerPayload = {
  generated: string
  method: string
  totals: {
    homes_indexed: number
    sales_on_record: number
    tracts: number
    sales_12mo: number
    median_ppsf_12mo: number | null
    median_price_12mo: number | null
    latest_sale: string | null
  }
  quarters: SbQuarter[]
  tracts: Tract[]
  feed: {
    a: string; c: string; t: string; ts: string
    p: number; sf: number; ppsf: number; d: string
    bd?: number | null; ba?: number | null
  }[]
}

// range key -> the matching tract window key in the payload
const WINDOW_FOR: Record<RangeKey, keyof Pick<Tract, 'h1' | 'h3' | 'h5' | 'h10'>> = {
  '1y': 'h1', '3y': 'h3', '5y': 'h5', '10y': 'h10',
}

let cache: Promise<EichlerPayload | null> | null = null
function loadEichler(): Promise<EichlerPayload | null> {
  if (!cache) {
    cache = fetch('/market/eichler-intel.json')
      .then((r) => (r.ok ? (r.json() as Promise<EichlerPayload>) : null))
      .catch(() => null)
  }
  return cache
}

export default function EichlerIntel() {
  const [data, setData] = useState<EichlerPayload | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [range, setRange] = useState<RangeKey>('10y')

  useEffect(() => {
    let cancelled = false
    loadEichler().then((d) => {
      if (cancelled) return
      setData(d)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  const rangeQuarters = RANGES.find((r) => r.key === range)?.quarters ?? 40

  const series: Series[] = useMemo(() => {
    if (!data) return []
    return [{
      key: 'eichler',
      name: 'Eichler',
      color: EICHLER,
      pts: sliceQuarters(data.quarters, rangeQuarters),
    }]
  }, [data, rangeQuarters])

  const change = series.length ? pctChange(series[0].pts) : null
  const wkey = WINDOW_FOR[range]

  // Tracts ranked by $/sf within the selected window; tracts with no sales in
  // that window drop out rather than rendering as blanks.
  const tracts = useMemo(() => {
    if (!data) return []
    return data.tracts
      .filter((t) => t[wkey].ppsf != null && t[wkey].n > 0)
      .sort((a, b) => (b[wkey].ppsf ?? 0) - (a[wkey].ppsf ?? 0))
      .slice(0, 8)
  }, [data, wkey])

  if (loaded && !data) return null
  const t = data?.totals

  return (
    <section id="eichler" className="max-w-6xl mx-auto px-6 py-14 md:py-20 scroll-mt-24">
      <div className="mp-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: INK }}>
        Eichler · an architectural market
      </div>
      <h2 className="mp-serif text-3xl md:text-[42px] font-semibold mt-3" style={{ color: NAVY }}>
        A market organised around a house, not a zip code.
      </h2>
      <p className="text-[15px] md:text-base mt-4 max-w-2xl leading-relaxed" style={{ color: INK }}>
        Every recorded Eichler sale across Palo Alto, Sunnyvale, San Mateo, Los Altos and San Jose —
        tracked as one market, because that is how Eichler buyers actually shop.
      </p>

      {/* chart card */}
      <div className="mt-8 rounded-[24px] bg-white border border-black/[0.07] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mp-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: INK }}>
              Median price per square foot
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="mp-serif text-2xl md:text-3xl font-semibold" style={{ color: NAVY }}>
                {t?.median_ppsf_12mo ? `$${fmtNum(t.median_ppsf_12mo)}` : '—'}
              </span>
              <span className="mp-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: INK }}>
                trailing 12 months
              </span>
              {change != null && (
                <span
                  className="mp-mono text-[11px] uppercase tracking-[0.14em]"
                  style={{ color: change >= 0 ? EICHLER : '#b3322c' }}
                >
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}% over range
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-black/[0.12] p-1">
            {RANGES.map((r) => {
              const on = range === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className="mp-mono rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors"
                  style={{ background: on ? NAVY : 'transparent', color: on ? '#fff' : INK }}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6">
          {loaded ? <PsfCompareChart series={series} /> : (
            <div className="py-24 text-center mp-mono text-xs uppercase tracking-[0.16em]" style={{ color: INK }}>
              Loading Eichler data…
            </div>
          )}
        </div>
      </div>

      {/* coverage band */}
      {t && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Eichlers indexed', value: fmtNum(t.homes_indexed) },
            { label: 'Sales on record', value: fmtNum(t.sales_on_record) },
            { label: 'Tracts tracked', value: fmtNum(t.tracts) },
            { label: 'Median price · 12mo', value: fmtMoney(t.median_price_12mo) },
          ].map((s) => (
            <div key={s.label}>
              <div className="mp-serif text-2xl md:text-3xl font-semibold" style={{ color: NAVY }}>{s.value}</div>
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-1" style={{ color: INK }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* tract leaderboard — respects the range toggle above */}
      {tracts.length > 0 && (
        <div className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mp-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: INK }}>
                Tract leaderboard · {RANGES.find((r) => r.key === range)?.label.toLowerCase()}
              </div>
              <h3 className="mp-serif text-2xl md:text-3xl font-semibold mt-2" style={{ color: NAVY }}>
                Where Eichlers trade highest.
              </h3>
            </div>
            <a
              href={`${EICHLER_URL}/communities/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mp-mono text-[11px] uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
              style={{ color: NAVY }}
            >
              Browse all tracts <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="mt-6 rounded-[22px] border border-black/[0.07] bg-white overflow-hidden">
            {tracts.map((tr, i) => {
              const w = tr[wkey]
              return (
                <a
                  key={tr.ts}
                  href={`${EICHLER_URL}/community/${tr.ts}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.06)' }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium" style={{ color: NAVY }}>{tr.name}</div>
                    <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: INK }}>
                      {tr.city} · {w.n} sale{w.n === 1 ? '' : 's'}
                      {w.n < 5 ? ' · thin' : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>
                      ${fmtNum(w.ppsf)}<span className="text-[11px] font-normal" style={{ color: INK }}>/sf</span>
                    </div>
                    <div className="mp-mono text-[10px]" style={{ color: INK }}>{fmtMoney(w.price)} median</div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* recent sales */}
      {data && data.feed.length > 0 && (
        <div className="mt-12">
          <div className="mp-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: INK }}>
            Recent Eichler sales
          </div>
          <h3 className="mp-serif text-2xl md:text-3xl font-semibold mt-2" style={{ color: NAVY }}>
            The latest closings.
          </h3>
          <div className="mt-6 grid md:grid-cols-2 gap-3">
            {data.feed.slice(0, 10).map((s) => (
              <a
                key={`${s.a}-${s.d}`}
                href={`${EICHLER_URL}/community/${s.ts}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mp-lift rounded-[18px] border border-black/[0.07] bg-white px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-medium" style={{ color: NAVY }}>{s.a}</div>
                  <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: INK }}>
                    {s.c} · {s.d} · {fmtNum(s.sf)} sqft
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>{fmtMoney(s.p)}</div>
                  <div className="mp-mono text-[10px]" style={{ color: INK }}>${fmtNum(s.ppsf)}/sf</div>
                </div>
              </a>
            ))}
          </div>
          <p className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-6" style={{ color: INK }}>
            Recorded sales · data as of {data.generated}
          </p>
        </div>
      )}
    </section>
  )
}
