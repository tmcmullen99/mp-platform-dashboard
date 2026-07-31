// South Bay market intelligence — Campbell / Los Gatos / Saratoga.
//
// A self-contained section for the Market Intelligence hub. Renders:
//   - a market segmented control (three cities + "Compare all")
//   - a range toggle (1 / 3 / 5 / 10 years)
//   - a quarterly median $/sf chart, single-series or three-series overlay
//   - a live feed of the most recent recorded sales
//   - a coverage stat band per market
//
// Data comes from lib/southBay.ts (bundled snapshot today, live when the
// city-market deployments send CORS headers). No new dependencies: the chart is
// hand-rolled SVG in the same visual language as the existing PsfChart.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  fetchSouthBay, sliceQuarters, pctChange, fmtMoney, fmtNum, fmtDate,
  SOUTH_BAY_KEYS, SOUTH_BAY_META, RANGES,
  type SouthBayPayload, type SouthBayKey, type RangeKey, type SbQuarter,
} from '@/lib/southBay'

const NAVY = '#1a1f2e'
const INK = '#5b6675'

type Selection = SouthBayKey | 'all'

/* ------------------------------- the chart -------------------------------- */

export type Series = { key: string; name: string; color: string; pts: SbQuarter[] }

export function PsfCompareChart({ series }: { series: Series[] }) {
  const [hoverI, setHoverI] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const len = Math.max(...series.map((s) => s.pts.length), 0)
  if (!series.length || len < 2) {
    return (
      <div className="py-16 text-center mp-mono text-xs uppercase tracking-[0.16em]" style={{ color: INK }}>
        Not enough quarterly history for this range.
      </div>
    )
  }

  const W = 900, H = 320, PADL = 56, PADR = 24, PADT = 24, PADB = 40
  const all = series.flatMap((s) => s.pts.map((p) => p.ppsf)).filter((v) => v > 0)
  const minY = Math.min(...all) * 0.92
  const maxY = Math.max(...all) * 1.06
  const x = (i: number) => PADL + (i / (len - 1)) * (W - PADL - PADR)
  const y = (v: number) => PADT + (1 - (v - minY) / (maxY - minY)) * (H - PADT - PADB)
  const ticks = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4)

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, bestD = Infinity
    for (let i = 0; i < len; i++) {
      const d = Math.abs(x(i) - relX)
      if (d < bestD) { bestD = d; best = i }
    }
    setHoverI(best)
  }

  const labelAt = (i: number) => series[0]?.pts[i]?.q ?? ''

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label="Median price per square foot by quarter for the South Bay markets. Hover to inspect values."
        onPointerMove={onMove}
        onPointerLeave={() => setHoverI(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`sb-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={series.length > 1 ? 0.10 : 0.18} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PADL} x2={W - PADR} y1={y(t)} y2={y(t)} stroke="#000" strokeOpacity="0.06" />
            <text x={PADL - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill={INK} className="mp-mono">
              ${Math.round(t)}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const pts = s.pts
          const path = pts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.ppsf).toFixed(1)}`).join(' ')
          const area = `${path} L ${x(pts.length - 1).toFixed(1)} ${(H - PADB).toFixed(1)} L ${x(0).toFixed(1)} ${(H - PADB).toFixed(1)} Z`
          return (
            <g key={s.key}>
              <path d={area} fill={`url(#sb-${s.key})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )
        })}

        {hoverI != null && (
          <g>
            <line x1={x(hoverI)} x2={x(hoverI)} y1={PADT} y2={H - PADB} stroke={NAVY} strokeOpacity="0.25" strokeDasharray="3 3" />
            {series.map((s) => {
              const p = s.pts[hoverI]
              if (!p) return null
              return <circle key={s.key} cx={x(hoverI)} cy={y(p.ppsf)} r="4.5" fill="#fff" stroke={s.color} strokeWidth="2.5" />
            })}
          </g>
        )}

        <text x={PADL} y={H - 12} fontSize="11" fill={INK} className="mp-mono">{labelAt(0)}</text>
        <text x={W - PADR} y={H - 12} textAnchor="end" fontSize="11" fill={INK} className="mp-mono">{labelAt(len - 1)}</text>
      </svg>

      {/* hover readout */}
      <div className="mt-4 min-h-[42px] flex flex-wrap items-center gap-x-6 gap-y-2">
        {hoverI != null ? (
          <>
            <span className="mp-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: INK }}>
              {labelAt(hoverI)}
            </span>
            {series.map((s) => {
              const p = s.pts[hoverI]
              if (!p) return null
              return (
                <span key={s.key} className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm" style={{ color: NAVY }}>
                    <b>${fmtNum(p.ppsf)}</b>/sf
                  </span>
                  <span className="mp-mono text-[11px]" style={{ color: INK }}>
                    {p.n} sale{p.n === 1 ? '' : 's'}{p.thin ? ' · thin' : ''}
                  </span>
                </span>
              )
            })}
          </>
        ) : (
          <span className="mp-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: INK }}>
            Hover the chart to inspect any quarter
          </span>
        )}
      </div>
    </div>
  )
}

/* -------------------------------- section --------------------------------- */

export default function SouthBayIntel() {
  const [data, setData] = useState<SouthBayPayload | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState<Selection>('campbell')
  const [range, setRange] = useState<RangeKey>('10y')

  useEffect(() => {
    let cancelled = false
    fetchSouthBay().then((d) => {
      if (cancelled) return
      setData(d)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  const rangeQuarters = RANGES.find((r) => r.key === range)?.quarters ?? 40

  const series: Series[] = useMemo(() => {
    if (!data) return []
    const keys: SouthBayKey[] = sel === 'all' ? [...SOUTH_BAY_KEYS] : [sel]
    return keys
      .map((k) => {
        const m = data.markets[k]
        if (!m) return null
        return {
          key: k,
          name: SOUTH_BAY_META[k].name,
          color: SOUTH_BAY_META[k].accent,
          pts: sliceQuarters(m.quarters, rangeQuarters),
        }
      })
      .filter(Boolean) as Series[]
  }, [data, sel, rangeQuarters])

  // Feed: one market's sales, or the three interleaved by date when comparing.
  const feed = useMemo(() => {
    if (!data) return []
    const keys: SouthBayKey[] = sel === 'all' ? [...SOUTH_BAY_KEYS] : [sel]
    return keys
      .flatMap((k) => (data.markets[k]?.feed ?? []).map((s) => ({ ...s, market: k })))
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .slice(0, sel === 'all' ? 12 : 10)
  }, [data, sel])

  const single = sel === 'all' ? null : data?.markets[sel] ?? null
  const change = series.length === 1 ? pctChange(series[0].pts) : null

  if (loaded && !data) return null

  return (
    <section id="south-bay" className="max-w-6xl mx-auto px-6 py-14 md:py-20 scroll-mt-24">
      <div className="mp-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: INK }}>
        South Bay · city markets
      </div>
      <h2 className="mp-serif text-3xl md:text-[42px] font-semibold mt-3" style={{ color: NAVY }}>
        Every home. Every street. Every sale.
      </h2>
      <p className="text-[15px] md:text-base mt-4 max-w-2xl leading-relaxed" style={{ color: INK }}>
        The complete recorded-sale history of three South Bay cities, computed the same way in each
        one so the comparison actually means something.
      </p>

      {/* market segmented control */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {SOUTH_BAY_KEYS.map((k) => {
          const on = sel === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSel(k)}
              className="rounded-full px-4 py-2 text-[13px] font-medium transition-colors border"
              style={{
                background: on ? NAVY : '#fff',
                color: on ? '#fff' : NAVY,
                borderColor: on ? NAVY : 'rgba(0,0,0,0.12)',
              }}
            >
              {SOUTH_BAY_META[k].name}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setSel('all')}
          className="rounded-full px-4 py-2 text-[13px] font-medium transition-colors border"
          style={{
            background: sel === 'all' ? NAVY : '#fff',
            color: sel === 'all' ? '#fff' : NAVY,
            borderColor: sel === 'all' ? NAVY : 'rgba(0,0,0,0.12)',
          }}
        >
          Compare all
        </button>
      </div>

      {/* chart card */}
      <div className="mt-6 rounded-[24px] bg-white border border-black/[0.07] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mp-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: INK }}>
              Median price per square foot
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="mp-serif text-2xl md:text-3xl font-semibold" style={{ color: NAVY }}>
                {single ? `$${fmtNum(single.totals.median_ppsf_12mo)}` : 'Three markets'}
              </span>
              {single && (
                <span className="mp-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: INK }}>
                  trailing 12 months
                </span>
              )}
              {change != null && (
                <span
                  className="mp-mono text-[11px] uppercase tracking-[0.14em]"
                  style={{ color: change >= 0 ? '#1f7a4d' : '#b3322c' }}
                >
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}% over range
                </span>
              )}
            </div>
          </div>

          {/* range toggle */}
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
              Loading market data…
            </div>
          )}
        </div>

        {/* legend when comparing */}
        {sel === 'all' && (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-2 text-[13px]" style={{ color: NAVY }}>
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* coverage band for the selected market */}
      {single && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Homes indexed', value: fmtNum(single.totals.homes_indexed) },
            { label: 'Sales on record', value: fmtNum(single.totals.sales_on_record) },
            { label: 'Sales · last 12mo', value: fmtNum(single.totals.sales_12mo) },
            { label: 'Median price · 12mo', value: fmtMoney(single.totals.median_price_12mo) },
          ].map((s) => (
            <div key={s.label}>
              <div className="mp-serif text-2xl md:text-3xl font-semibold" style={{ color: NAVY }}>{s.value}</div>
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-1" style={{ color: INK }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* live sales feed */}
      <div className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mp-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: INK }}>
              Live · recent sales
            </div>
            <h3 className="mp-serif text-2xl md:text-3xl font-semibold mt-2" style={{ color: NAVY }}>
              The latest closings.
            </h3>
          </div>
          {single && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href={`https://${single.domain}/intelligence/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mp-mono text-[11px] uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
                style={{ color: NAVY }}
              >
                {single.name} market intelligence <ArrowUpRight size={14} />
              </a>
              <a
                href={`https://${single.domain}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mp-mono text-[11px] uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
                style={{ color: INK }}
              >
                All {single.name} sales <ArrowUpRight size={14} />
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-3">
          {feed.map((s) => {
            const meta = SOUTH_BAY_META[s.market as SouthBayKey]
            return (
              <a
                key={`${s.market}-${s.s}-${s.d}`}
                href={`https://${meta.domain}/home/${s.s}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mp-lift rounded-[18px] border border-black/[0.07] bg-white px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-medium" style={{ color: NAVY }}>{s.a}</div>
                  <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: INK }}>
                    {sel === 'all' ? `${meta.name} · ` : ''}{fmtDate(s.d)} · {fmtNum(s.sf)} sqft
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>{fmtMoney(s.p)}</div>
                  <div className="mp-mono text-[10px]" style={{ color: INK }}>${fmtNum(s.ppsf)}/sf</div>
                </div>
              </a>
            )
          })}
        </div>

        {sel === 'all' && (
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {SOUTH_BAY_KEYS.map((k) => (
              <a
                key={k}
                href={`https://${SOUTH_BAY_META[k].domain}/intelligence/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mp-mono text-[11px] uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
                style={{ color: NAVY }}
              >
                {SOUTH_BAY_META[k].name} intelligence <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        )}

        {data && (
          <p className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-6" style={{ color: INK }}>
            Recorded sales · data as of {data.generated}
          </p>
        )}
      </div>
    </section>
  )
}
