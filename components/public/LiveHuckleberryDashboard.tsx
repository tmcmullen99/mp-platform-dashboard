// Live, interactive analytics dashboard for the 175 Huckleberry Drive campaign.
// Reads real aggregates from the public.huckleberry_public_analytics() RPC
// (safe rollups only — the raw sessions table stays locked). Renders count-up
// stats and an interactive US bubble map: hover or tap a metro to see its share.
//
// Used inline on the Luxury Listing service page as live proof of the marketing
// machine. Falls back to the last known real snapshot if the fetch fails so the
// section never renders empty.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CountUp } from '@/components/public/motion'

const GOLD = '#b8965a'
const DASH_BG = '#0f1621'
const DASH_PANEL = '#161f2c'

type Metro = { name: string; views: number; pct: number; lat: number | null; lng: number | null }
type Analytics = {
  total_visits: number
  unique_visitors: number
  countries: number
  avg_minutes: number
  median_seconds: number
  metros: Metro[]
  devices: Record<string, number>
  daily: { day: string; visits: number }[]
}

// Real snapshot fallback (matches the live data at build time).
const FALLBACK: Analytics = {
  total_visits: 53,
  unique_visitors: 53,
  countries: 4,
  avg_minutes: 38,
  median_seconds: 15,
  metros: [
    { name: 'Bay Area', views: 23, pct: 43, lat: 37.26, lng: -121.99 },
    { name: 'Washington DC', views: 8, pct: 15, lat: 39.03, lng: -77.47 },
    { name: 'Dallas–Fort Worth', views: 7, pct: 13, lat: 32.78, lng: -96.81 },
    { name: 'Council Bluffs, Iowa', views: 3, pct: 6, lat: 41.26, lng: -95.86 },
    { name: 'Rexburg, Idaho', views: 2, pct: 4, lat: 43.83, lng: -111.79 },
    { name: 'New York Metro', views: 2, pct: 4, lat: 40.72, lng: -74.09 },
    { name: 'Boardman, Oregon', views: 2, pct: 4, lat: 45.84, lng: -119.7 },
    { name: 'Wilmington, Delaware', views: 1, pct: 2, lat: 39.74, lng: -75.58 },
  ],
  devices: { desktop: 43, mobile: 8, tablet: 1, unknown: 1 },
  daily: [
    { day: '2026-06-29', visits: 9 },
    { day: '2026-06-30', visits: 32 },
    { day: '2026-07-01', visits: 12 },
  ],
}

// Project lon/lat → SVG coords for a simple US-ish equirectangular frame.
// viewBox 0 0 640 380. Tuned so continental US + a little slack fits nicely.
function project(lng: number, lat: number): { x: number; y: number } {
  // US bounds roughly lng[-125,-66], lat[24,49]
  const x = ((lng + 125) / (125 - 66)) * 560 + 40
  const y = ((49 - lat) / (49 - 24)) * 300 + 30
  return { x, y }
}

export default function LiveHuckleberryDashboard() {
  const [data, setData] = useState<Analytics>(FALLBACK)
  const [live, setLive] = useState(false)
  const [active, setActive] = useState<number>(0) // index of focused metro
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    ;(async () => {
      const { data: rpc, error } = await supabase.rpc('huckleberry_public_analytics')
      if (!mounted.current) return
      if (!error && rpc) {
        setData(rpc as Analytics)
        setLive(true)
      }
    })()
    return () => {
      mounted.current = false
    }
  }, [])

  const metros = data.metros || []
  const maxViews = Math.max(1, ...metros.map((m) => m.views))
  const focused = metros[active] || metros[0]

  return (
    <div
      className="rounded-[22px] overflow-hidden"
      style={{ background: DASH_BG, border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 40px 110px -50px rgba(0,0,0,0.7)' }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mp-serif text-sm font-bold"
            style={{ background: GOLD, color: '#1a1205' }}
          >
            P
          </div>
          <div>
            <div className="mp-mono text-[9px] tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              PRUGH REAL ESTATE
            </div>
            <div className="mp-serif text-white text-lg leading-tight">175 Huckleberry Drive</div>
          </div>
        </div>
        <div
          className="mp-mono text-[9px] tracking-[0.16em] px-2.5 py-1 rounded inline-flex items-center gap-1.5"
          style={{ background: 'rgba(184,150,90,0.15)', color: GOLD }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: live ? '#4ade80' : GOLD }}
          />
          {live ? 'LIVE DATA' : 'SNAPSHOT'} · CAMPAIGN TO DATE
        </div>
      </div>

      {/* stat row — live count-ups */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px px-6">
        {[
          { k: 'TOTAL VISITS', v: data.total_visits, s: `${data.unique_visitors} unique` },
          { k: 'AVG. TIME ON SITE', v: data.avg_minutes, suffix: 'm', s: `median ${data.median_seconds}s` },
          { k: 'BUYER METROS', v: metros.length, s: `${data.countries} countries` },
          { k: 'TOP MARKET', raw: `${focused?.pct ?? 0}%`, s: focused?.name ?? '—' },
        ].map((s) => (
          <div key={s.k} className="rounded-lg p-4" style={{ background: DASH_PANEL }}>
            <div className="mp-mono text-[8.5px] tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {s.k}
            </div>
            <div className="mp-serif text-2xl mt-1 text-white">
              {s.raw ? s.raw : <CountUp value={s.v as number} suffix={s.suffix || ''} />}
            </div>
            <div className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {s.s}
            </div>
          </div>
        ))}
      </div>

      {/* interactive map + metro list */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 p-6">
        {/* MAP */}
        <div className="rounded-xl p-4" style={{ background: DASH_PANEL }}>
          <div className="flex items-center justify-between">
            <div className="text-white text-sm font-semibold">Where buyers are watching from</div>
            <div className="mp-mono text-[9px] tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              HOVER OR TAP A BUBBLE
            </div>
          </div>

          <svg viewBox="0 0 640 380" className="w-full mt-2" style={{ maxHeight: 320 }}>
            {/* stylized continental US frame */}
            <path
              d="M70 120 L180 92 L320 96 L470 88 L560 116 L568 168 L505 188 L490 232 L410 274 L280 288 L170 276 L120 232 L92 184 L70 150 Z"
              fill="rgba(255,255,255,0.035)"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="1.2"
            />
            {/* connective lines from focused metro to others (subtle network feel) */}
            {focused?.lat != null &&
              focused?.lng != null &&
              metros.map((m, i) => {
                if (i === active || m.lat == null || m.lng == null) return null
                const a = project(focused.lng!, focused.lat!)
                const b = project(m.lng!, m.lat!)
                return (
                  <line
                    key={`l-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={GOLD}
                    strokeWidth="0.6"
                    opacity={0.14}
                  />
                )
              })}
            {/* bubbles */}
            {metros.map((m, i) => {
              if (m.lat == null || m.lng == null) return null
              const { x, y } = project(m.lng, m.lat)
              const r = 6 + (m.views / maxViews) * 26
              const isActive = i === active
              return (
                <g
                  key={m.name}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <circle cx={x} cy={y} r={r} fill={GOLD} opacity={isActive ? 0.5 : 0.28} />
                  <circle cx={x} cy={y} r={Math.max(3, r * 0.34)} fill={GOLD} opacity={0.95} />
                  {isActive && (
                    <circle cx={x} cy={y} r={r + 4} fill="none" stroke={GOLD} strokeWidth="1.2" opacity={0.8} />
                  )}
                </g>
              )
            })}
          </svg>

          {/* focused metro readout */}
          {focused && (
            <div className="mt-1 flex items-baseline justify-between px-1">
              <div className="text-white text-sm font-semibold">{focused.name}</div>
              <div className="mp-mono text-xs" style={{ color: GOLD }}>
                {focused.views} visits · {focused.pct}% of all traffic
              </div>
            </div>
          )}
        </div>

        {/* METRO LIST */}
        <div className="rounded-xl p-4" style={{ background: DASH_PANEL }}>
          <div className="text-white text-sm font-semibold">Top metros</div>
          <div className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            By share of total site visits
          </div>
          <div className="flex flex-col gap-1.5">
            {metros.map((m, i) => (
              <button
                key={m.name}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors"
                style={{ background: i === active ? 'rgba(184,150,90,0.12)' : 'transparent' }}
              >
                <span className="mp-mono text-[10px] w-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {i + 1}
                </span>
                <span className="text-white text-[12.5px] flex-1 truncate">{m.name}</span>
                <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: GOLD }} />
                </div>
                <span className="mp-mono text-[11px] w-8 text-right" style={{ color: GOLD }}>
                  {m.pct}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
