// STAGE 2: the full Market Insight page for a single market.
//
// Driven entirely by a market key, so adding Silicon Valley in Stage 3 is just
// a new registry entry — no new page code. Pulls LIVE data from the Condo Market
// project (stat band, $/sf-over-time chart, recent closed sales, top buildings)
// and interleaves it with the McMullen blog posts tagged to this market, so a
// visitor can move between hard numbers and editorial context in one scroll.

import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles, Reveal, CountUp, ParallaxHero, Marquee, PillButton, NAVY, NAVY_DEEP, INK,
} from '@/components/public/motion'
import { supabase } from '@/lib/supabase'
import {
  marketByKey, fetchCityMonthly, fetchRecentSales, fetchPsfQuarterly, fetchBuildingStats,
  type CityMonthly, type RecentSale, type PsfQuarter, type BuildingStat, type MarketConfig,
} from '@/lib/condoMarket'
import { TrendingUp, MapPin, Building2, ArrowUpRight, Video, Phone, Newspaper } from 'lucide-react'

const BLUE = '#4f82b9'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

type BlogCard = {
  slug: string
  name: string
  card_description: string | null
  image: string | null
  publish_date: string | null
  tags_array: string[] | null
}

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}
function fmtDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---- $/sf quarterly line chart (inline SVG, no chart lib) --------------------
function PsfChart({ data }: { data: PsfQuarter[] }) {
  if (!data.length) return null
  const W = 900, H = 300, PAD = 44
  const pts = data.filter((d) => d.median_psf > 0)
  const xs = pts.map((_, i) => i)
  const ys = pts.map((d) => d.median_psf)
  const minY = Math.min(...ys) * 0.92
  const maxY = Math.max(...ys) * 1.05
  const x = (i: number) => PAD + (i / (pts.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - minY) / (maxY - minY)) * (H - PAD * 2)
  const path = pts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.median_psf).toFixed(1)}`).join(' ')
  const area = `${path} L ${x(pts.length - 1).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`
  const yTicks = 4
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => minY + ((maxY - minY) * i) / yTicks)
  const firstYear = new Date(pts[0].quarter_start).getFullYear()
  const lastYear = new Date(pts[pts.length - 1].quarter_start).getFullYear()
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Median price per square foot over time">
      <defs>
        <linearGradient id="psffill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.18" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} stroke="rgba(13,27,42,0.07)" strokeWidth="1" />
          <text x={PAD - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill={INK} fontFamily="monospace">${Math.round(v)}</text>
        </g>
      ))}
      <path d={area} fill="url(#psffill)" />
      <path d={path} fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <text x={PAD} y={H - 12} fontSize="12" fill={INK} fontFamily="monospace">{firstYear}</text>
      <text x={W - PAD} y={H - 12} textAnchor="end" fontSize="12" fill={INK} fontFamily="monospace">{lastYear}</text>
    </svg>
  )
}

// ---- a blog card (matches the site's /blog styling) -------------------------
function BlogTile({ p }: { p: BlogCard }) {
  return (
    <Link to={`/blog/${p.slug}`} className="group block rounded-[22px] overflow-hidden border border-black/[0.07] bg-white mp-lift">
      <div className="h-44 overflow-hidden bg-[#f4f7fb]">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Newspaper className="w-8 h-8" style={{ color: 'rgba(79,130,185,0.4)' }} /></div>
        )}
      </div>
      <div className="p-6">
        <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: BLUE }}>
          {fmtDate(p.publish_date)}{(p.tags_array ?? []).length ? ` · ${(p.tags_array ?? [])[0]}` : ''}
        </div>
        <h3 className="mp-serif text-xl font-semibold leading-snug" style={{ color: NAVY }}>{p.name}</h3>
        {p.card_description ? <p className="text-sm mt-2 leading-relaxed line-clamp-2" style={{ color: INK }}>{p.card_description}</p> : null}
      </div>
    </Link>
  )
}

export default function MarketPage() {
  const { market } = useParams()
  const cfg: MarketConfig | undefined = marketByKey(market ?? 'sf')

  const [monthly, setMonthly] = useState<CityMonthly[]>([])
  const [sales, setSales] = useState<RecentSale[]>([])
  const [psf, setPsf] = useState<PsfQuarter[]>([])
  const [buildings, setBuildings] = useState<BuildingStat[]>([])
  const [posts, setPosts] = useState<BlogCard[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!cfg) return
    let cancelled = false
    ;(async () => {
      const [m, s, q, b] = await Promise.all([
        fetchCityMonthly(36),
        fetchRecentSales(cfg.dataSlug, 8),
        fetchPsfQuarterly(cfg.dataSlug),
        fetchBuildingStats(cfg.dataSlug, 12),
      ])
      // SF-/SV-tagged blog posts from the McMullen DB
      const { data: blog } = await supabase
        .from('blog_posts')
        .select('slug, name, card_description, image, publish_date, tags_array')
        .eq('is_published', true)
        .neq('is_archived', true)
        .overlaps('tags_array', cfg.blogTags)
        .order('publish_date', { ascending: false, nullsFirst: false })
        .limit(6)
      if (cancelled) return
      setMonthly(m); setSales(s); setPsf(q); setBuildings(b.slice(0, 6))
      setPosts((blog as BlogCard[]) ?? [])
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [cfg])

  if (!cfg) return <Navigate to="/market-insight" replace />

  const latest = monthly.length ? monthly[monthly.length - 1] : null
  const tenYrSales = useMemo(() => monthly.reduce((a, m) => a + (m.sales || 0), 0), [monthly])

  const stats = [
    { label: 'Median $/sf', value: latest ? `$${latest.median_psf.toLocaleString()}` : '—' },
    { label: 'Sales · latest mo.', value: latest ? String(latest.sales) : '—' },
    { label: 'Median price', value: latest ? money(latest.median_price) : '—' },
    { label: 'Buildings tracked', value: buildings.length ? String(buildings.length) : '—' },
  ]

  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="insight" />

      <ParallaxHero minH="60vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: '#91a1ba', animationDelay: '0.1s' }}>
              Market Insight · {cfg.shortName}
            </div>
            <h1 className="mp-anim mp-serif text-white text-[42px] md:text-[60px] leading-[1.04] font-semibold" style={{ animationDelay: '0.2s' }}>
              {cfg.name}
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '620px' }}>
              {cfg.blurb}
            </p>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={['Live closed sales', 'Median $/sf trend', 'Building-level detail', '10 years of history', 'Updated continuously']} />
      </div>

      {/* LIVE stat band */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <Reveal>
          <div className="mp-mono text-[11px] uppercase tracking-[0.2em] mb-6" style={{ color: BLUE }}>
            {loaded ? 'Live market snapshot' : 'Loading live data…'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="mp-serif text-[38px] md:text-[52px] font-semibold leading-none" style={{ color: NAVY }}>{s.value}</div>
                <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>{s.label}</div>
              </div>
            ))}
          </div>
          {latest ? (
            <div className="mt-5 text-xs" style={{ color: INK }}>
              Data through {new Date(latest.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · {tenYrSales.toLocaleString()} sales indexed over the tracked window
            </div>
          ) : null}
        </Reveal>
      </section>

      {/* $/sf chart */}
      <section style={{ background: '#f4f7fb' }}>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>Price movement</div>
            <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Median price per square foot.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: INK }}>Quarterly median $/sf across closed sales — the clearest read on where this market is heading.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 rounded-[24px] bg-white border border-black/[0.07] p-6 md:p-8">
              <PsfChart data={psf} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* interleave block 1: first 3 blog posts */}
      {posts.length ? (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>From the journal</div>
            <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Context behind the numbers.</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {posts.slice(0, 3).map((p) => <Reveal key={p.slug}><BlogTile p={p} /></Reveal>)}
          </div>
        </section>
      ) : null}

      {/* live recent sales */}
      <section style={{ background: NAVY_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: '#91a1ba' }}>Live · recent sales</div>
            <h2 className="mp-serif text-white text-[30px] md:text-[44px] leading-[1.05] font-semibold">The latest closings.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {sales.map((s, i) => (
              <Reveal key={`${s.building_slug}-${i}`} delay={0.04 * i}>
                <div className="rounded-[18px] p-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div className="text-white font-medium">{s.unit_address}</div>
                    <div className="mp-mono text-[11px] uppercase tracking-[0.14em] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {fmtDate(s.sale_date)}{s.sqft ? ` · ${s.sqft.toLocaleString()} sqft` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mp-serif text-xl font-semibold text-white">{money(s.sale_price)}</div>
                    {s.sqft ? <div className="mp-mono text-[11px]" style={{ color: '#91a1ba' }}>${Math.round(s.sale_price / s.sqft).toLocaleString()}/sf</div> : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* top buildings */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>Most active buildings</div>
          <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Where the market is moving.</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {buildings.map((b, i) => (
            <Reveal key={b.slug} delay={0.05 * i}>
              <div className="mp-lift rounded-[22px] border border-black/[0.07] bg-white p-6 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4" style={{ color: BLUE }} />
                  <span className="mp-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: INK }}>{b.neighborhood}</span>
                </div>
                <h3 className="mp-serif text-xl font-semibold" style={{ color: NAVY }}>{b.display_name}</h3>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div><div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>{b.sales}</div><div className="mp-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: INK }}>Sales</div></div>
                  <div><div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>${b.median_psf.toLocaleString()}</div><div className="mp-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: INK }}>$/sf</div></div>
                  <div><div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>{money(b.median_price)}</div><div className="mp-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: INK }}>Median</div></div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* interleave block 2: remaining posts */}
      {posts.length > 3 ? (
        <section style={{ background: '#f4f7fb' }}>
          <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
            <Reveal>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>More reading</div>
              <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Deeper on {cfg.shortName}.</h2>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-6 mt-10">
              {posts.slice(3, 6).map((p) => <Reveal key={p.slug}><BlogTile p={p} /></Reveal>)}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <Reveal>
            <h2 className="mp-serif text-white text-[32px] md:text-[48px] leading-[1.05] font-semibold">
              Thinking about {cfg.shortName}?
            </h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Let’s talk through what the data means for your buy or sell — on a quick video call.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <PillButton href={CAL} onDark><Video className="w-4 h-4" /> Schedule a video call with Tim</PillButton>
              <PillButton href="tel:+14156919272" variant="secondary" onDark><Phone className="w-4 h-4" /> (415) 691-9272</PillButton>
            </div>
          </Reveal>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
