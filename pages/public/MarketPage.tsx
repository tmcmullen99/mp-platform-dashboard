// The Market hub — one page, multiple market data feeds.
//
// Replaces the old /blog "Market Insight" index. A selector at the top lets the
// visitor choose which market's live data to explore (SF condos first; SV,
// Eichler, Campbell and more to follow). The chosen market drives a live data
// experience — market-scoped snapshot, coverage/value/volume cards, an
// interactive $/sf trend chart, recent closings, and hero-imaged buildings —
// with market-tagged (and general) blog posts scattered through the data, which
// the visitor can toggle on/off. Selection lives in the URL (?m=sf) so it's one
// route and every market is shareable/linkable.
//
// All live market data comes from the isolated read-only Condo Market client
// (lib/condoMarket.ts); blog posts come from the main McMullen client.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles, Reveal, ParallaxHero, Marquee, PillButton, NAVY, NAVY_DEEP, INK,
} from '@/components/public/motion'
import { supabase } from '@/lib/supabase'
import {
  MARKETS, marketByKey,
  fetchHomePayload, fetchRecentSales, fetchPsfQuarterly, fetchBuildingStats,
  type HomePayload, type RecentSale, type PsfQuarter, type BuildingStat, type MarketConfig,
} from '@/lib/condoMarket'
import { Building2, Video, Phone, Newspaper, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'

const BLUE = '#4f82b9'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

type BlogCard = {
  slug: string
  name: string
  card_description: string | null
  // blog_posts.image is a JSONB column shaped { alt, url } (occasionally null,
  // and tolerant of a legacy plain-string form).
  image: { url?: string | null; alt?: string | null } | string | null
  publish_date: string | null
  tags_array: string[] | null
}

// Normalize the JSONB image field to a plain URL string for <img src>.
function imgUrl(image: BlogCard['image']): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  return image.url ?? null
}

// A merged building card model: hero imagery from home_page_payload.index,
// sales/median stats from intelligence_building_stats, joined by slug.
type ActiveBuilding = {
  slug: string
  name: string
  neighborhood: string
  psf: number
  hero: string | null
  sales: number | null
  median_price: number | null
}

function money(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}
function fmtDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function num(n: number | null | undefined): string {
  return n == null || !isFinite(n) ? '—' : n.toLocaleString()
}

// ---- Interactive $/sf quarterly chart (inline SVG + hover crosshair) --------
// Matches the Condo Market intelligence chart: hover anywhere to snap a
// crosshair to the nearest quarter and show a tooltip with the quarter and
// median $/sf. Pointer-driven; degrades to a clean static line with no pointer.
function PsfChart({ data }: { data: PsfQuarter[] }) {
  const pts = useMemo(() => data.filter((d) => d.median_psf > 0), [data])
  const [hoverI, setHoverI] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  if (pts.length < 2) {
    return (
      <div className="py-16 text-center mp-mono text-xs uppercase tracking-[0.16em]" style={{ color: INK }}>
        Not enough quarterly history yet for this market.
      </div>
    )
  }

  const W = 900, H = 320, PADL = 52, PADR = 24, PADT = 24, PADB = 40
  const ys = pts.map((d) => d.median_psf)
  const minY = Math.min(...ys) * 0.92
  const maxY = Math.max(...ys) * 1.06
  const x = (i: number) => PADL + (i / (pts.length - 1)) * (W - PADL - PADR)
  const y = (v: number) => PADT + (1 - (v - minY) / (maxY - minY)) * (H - PADT - PADB)
  const path = pts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.median_psf).toFixed(1)}`).join(' ')
  const area = `${path} L ${x(pts.length - 1).toFixed(1)} ${(H - PADB).toFixed(1)} L ${x(0).toFixed(1)} ${(H - PADB).toFixed(1)} Z`
  const tickVals = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4)

  function quarterLabel(iso: string): string {
    const dt = new Date(iso)
    return `Q${Math.floor(dt.getMonth() / 3) + 1} ${dt.getFullYear()}`
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * W
    // nearest index to the pointer's x in viewBox space
    let best = 0, bestD = Infinity
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(x(i) - relX)
      if (d < bestD) { bestD = d; best = i }
    }
    setHoverI(best)
  }

  const hp = hoverI == null ? null : pts[hoverI]

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto touch-none"
      role="img"
      aria-label="Median price per square foot by quarter. Hover to inspect values."
      onPointerMove={onMove}
      onPointerLeave={() => setHoverI(null)}
    >
      <defs>
        <linearGradient id="psffill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.18" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal gridlines + $ ticks */}
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={PADL} x2={W - PADR} y1={y(v)} y2={y(v)} stroke="rgba(13,27,42,0.07)" strokeWidth="1" />
          <text x={PADL - 10} y={y(v) + 4} textAnchor="end" fontSize="12" fill={INK} fontFamily="monospace">${Math.round(v)}</text>
        </g>
      ))}

      <path d={area} fill="url(#psffill)" />
      <path d={path} fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* year endpoints */}
      <text x={PADL} y={H - 12} fontSize="12" fill={INK} fontFamily="monospace">{quarterLabel(pts[0].quarter_start)}</text>
      <text x={W - PADR} y={H - 12} textAnchor="end" fontSize="12" fill={INK} fontFamily="monospace">{quarterLabel(pts[pts.length - 1].quarter_start)}</text>

      {/* crosshair + tooltip */}
      {hp ? (
        <g pointerEvents="none">
          <line x1={x(hoverI!)} x2={x(hoverI!)} y1={PADT} y2={H - PADB} stroke="rgba(13,27,42,0.22)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={x(hoverI!)} cy={y(hp.median_psf)} r="5" fill={BLUE} stroke="#fff" strokeWidth="2" />
          {(() => {
            const bx = Math.min(Math.max(x(hoverI!) - 66, PADL), W - PADR - 132)
            const by = Math.max(y(hp.median_psf) - 62, PADT)
            return (
              <g transform={`translate(${bx}, ${by})`}>
                <rect width="132" height="46" rx="8" fill={NAVY} />
                <text x="12" y="19" fontSize="11" fill="rgba(255,255,255,0.7)" fontFamily="monospace" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{quarterLabel(hp.quarter_start)}</text>
                <text x="12" y="36" fontSize="15" fill="#fff" fontWeight="600">${hp.median_psf.toLocaleString()}/sf</text>
              </g>
            )
          })()}
        </g>
      ) : null}
    </svg>
  )
}

function BlogTile({ p }: { p: BlogCard }) {
  const src = imgUrl(p.image)
  return (
    <Link to={`/blog/${p.slug}`} className="group block rounded-[22px] overflow-hidden border border-black/[0.07] bg-white mp-lift">
      <div className="h-40 overflow-hidden bg-[#f4f7fb]">
        {src ? (
          <img src={src} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Newspaper className="w-8 h-8" style={{ color: 'rgba(79,130,185,0.4)' }} /></div>
        )}
      </div>
      <div className="p-6">
        <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: BLUE }}>
          {fmtDate(p.publish_date)}{(p.tags_array ?? []).length ? ` · ${(p.tags_array ?? [])[0]}` : ''}
        </div>
        <h3 className="mp-serif text-lg font-semibold leading-snug" style={{ color: NAVY }}>{p.name}</h3>
        {p.card_description ? <p className="text-sm mt-2 leading-relaxed line-clamp-2" style={{ color: INK }}>{p.card_description}</p> : null}
      </div>
    </Link>
  )
}

// A small strip of interleaved blog posts, shown between data sections when the
// "show articles" toggle is on.
function BlogStrip({ posts, show }: { posts: BlogCard[]; show: boolean }) {
  if (!show || !posts.length) return null
  return (
    <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((p) => <Reveal key={p.slug}><BlogTile p={p} /></Reveal>)}
      </div>
    </section>
  )
}

export default function MarketPage() {
  const [params, setParams] = useSearchParams()
  const activeKey = params.get('m') || 'sf'
  const cfg: MarketConfig = marketByKey(activeKey) ?? MARKETS[0]

  const [home, setHome] = useState<HomePayload>({ stats: null, index: [], market: null })
  const [sales, setSales] = useState<RecentSale[]>([])
  const [psf, setPsf] = useState<PsfQuarter[]>([])
  const [bstats, setBstats] = useState<BuildingStat[]>([])
  const [posts, setPosts] = useState<BlogCard[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showArticles, setShowArticles] = useState(true)
  // How many articles beyond the 9 interleaved ones are revealed in the
  // "More articles" grid. Grows in batches of 6 via "Load more".
  const [visibleExtra, setVisibleExtra] = useState(6)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setVisibleExtra(6)
    ;(async () => {
      // Load only THIS market's articles — matched on the market's own tags,
      // never the shared general tags (which pulled other cities' local posts,
      // e.g. Austin, into every feed). Newest first. Higher limit so the
      // "Load more" reveal has articles to show for deep markets like SF.
      const blogQ = supabase
        .from('blog_posts')
        .select('slug, name, card_description, image, publish_date, tags_array')
        .eq('is_published', true).neq('is_archived', true)
        .overlaps('tags_array', cfg.blogTags)
        .order('publish_date', { ascending: false, nullsFirst: false })
        .limit(24)

      if (cfg.available) {
        const [h, s, q, b, blog] = await Promise.all([
          fetchHomePayload(cfg.dataSlug),
          fetchRecentSales(cfg.dataSlug, 8),
          fetchPsfQuarterly(cfg.dataSlug),
          fetchBuildingStats(cfg.dataSlug, 12),
          blogQ,
        ])
        if (cancelled) return
        setHome(h); setSales(s); setPsf(q); setBstats(b)
        setPosts(((blog.data as BlogCard[]) ?? []))
      } else {
        const blog = await blogQ
        if (cancelled) return
        setHome({ stats: null, index: [], market: null })
        setSales([]); setPsf([]); setBstats([])
        setPosts(((blog.data as BlogCard[]) ?? []))
      }
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [cfg])

  const s = home.stats

  // Live snapshot band — four market-scoped headline figures.
  const snapshot = [
    { label: 'Median $/sf · trailing 3yr', value: s ? `$${num(s.median_psf_36mo)}` : '—' },
    { label: 'Closed sales · 10yr', value: s ? num(s.sales_10y) : '—' },
    { label: 'Buildings tracked', value: s ? num(s.buildings) : '—' },
    { label: 'Neighborhoods', value: s ? num(s.neighborhoods) : '—' },
  ]

  // Coverage / value / volume cards — the deeper stat row (Intelligence-style).
  const cards = [
    { eyebrow: 'Coverage', big: s ? num(s.units) : '—', sub: s ? `condos indexed across ${num(s.buildings)} buildings` : 'condos indexed' },
    { eyebrow: 'Median value', big: s ? `$${num(s.median_psf_36mo)}` : '—', sub: 'median $/sf, trailing 36 months' },
    { eyebrow: 'Transaction volume', big: s ? money(s.volume_10y) : '—', sub: s ? `across ${num(s.sales_10y)} closed sales (10yr)` : 'closed-sale volume' },
  ]

  // Most active buildings — merge hero imagery (home.index) with sales/median
  // stats (bstats) by slug. Only surface buildings that actually have a $/sf
  // figure, so the grid never shows blanks (and never crashes on null psf).
  const activeBuildings: ActiveBuilding[] = useMemo(() => {
    const statBySlug = new Map(bstats.map((b) => [b.slug, b]))
    return home.index
      .filter((b) => b.psf != null && b.psf > 0)
      .slice(0, 6)
      .map((b) => {
        const st = statBySlug.get(b.slug)
        return {
          slug: b.slug,
          name: b.name,
          neighborhood: b.neighborhood ?? '',
          psf: b.psf as number,
          hero: b.hero_image_url,
          sales: st?.sales ?? null,
          median_price: st?.median_price ?? null,
        }
      })
  }, [home.index, bstats])

  const latestSale = s?.latest_sale_date ?? null

  // First 9 posts scatter through the data sections (three groups of 3).
  const g1 = posts.slice(0, 3), g2 = posts.slice(3, 6), g3 = posts.slice(6, 9)
  // Everything past the first 9 is available in the "More articles" grid,
  // newest-first, revealed in batches via "Load more".
  const extraPosts = posts.slice(9)
  const shownExtra = extraPosts.slice(0, visibleExtra)
  const hasMore = extraPosts.length > visibleExtra

  function pick(key: string) {
    setParams(key === 'sf' ? {} : { m: key }, { replace: false })
  }

  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="insight" />

      <ParallaxHero minH="52vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: '#91a1ba', animationDelay: '0.1s' }}>
              Market Intelligence
            </div>
            <h1 className="mp-anim mp-serif text-white text-[40px] md:text-[58px] leading-[1.04] font-semibold" style={{ animationDelay: '0.2s' }}>
              The markets we cover, in <span className="mp-accent">live data</span>.
            </h1>
            <p className="mp-anim text-lg mt-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '600px' }}>
              Choose a market to explore closed-sale trends, price per square foot, and building
              activity — with the stories behind the numbers woven throughout.
            </p>
          </div>
        </div>
      </ParallaxHero>

      {/* MARKET SELECTOR */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-black/[0.07]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center gap-2">
          <span className="mp-mono text-[10px] uppercase tracking-[0.16em] mr-1" style={{ color: INK }}>Market:</span>
          {MARKETS.map((m) => {
            const on = m.key === cfg.key
            return (
              <button key={m.key} onClick={() => pick(m.key)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-all border flex items-center gap-1.5"
                style={{
                  background: on ? NAVY : '#fff',
                  color: on ? '#fff' : (m.available ? NAVY : INK),
                  borderColor: on ? NAVY : 'rgba(0,0,0,0.1)',
                  opacity: m.available ? 1 : 0.6,
                }}>
                {!m.available ? <Lock className="w-3 h-3" /> : null}
                {m.shortName}
                {!m.available ? <span className="mp-mono text-[9px] uppercase tracking-[0.1em] opacity-70">soon</span> : null}
              </button>
            )
          })}
          <div className="ml-auto">
            <button onClick={() => setShowArticles((v) => !v)}
              className="rounded-full px-3.5 py-2 text-xs font-medium transition-all border flex items-center gap-1.5"
              style={{ background: showArticles ? 'rgba(79,130,185,0.1)' : '#fff', color: BLUE, borderColor: 'rgba(79,130,185,0.3)' }}>
              {showArticles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showArticles ? 'Articles on' : 'Articles off'}
            </button>
          </div>
        </div>
      </div>

      {/* market intro */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-2">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>{cfg.shortName}</div>
          <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.05] font-semibold" style={{ color: NAVY }}>{cfg.name}</h2>
          <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: INK }}>{cfg.blurb}</p>
        </Reveal>
      </section>

      {cfg.available ? (
        <>
          <div style={{ background: NAVY_DEEP }} className="mt-8">
            <Marquee items={['Live closed sales', 'Median $/sf trend', 'Building-level detail', '10 years of history', 'Updated continuously']} />
          </div>

          {/* snapshot band */}
          <section className="max-w-6xl mx-auto px-6 py-14 md:py-16">
            <Reveal>
              <div className="mp-mono text-[11px] uppercase tracking-[0.2em] mb-6" style={{ color: BLUE }}>
                {loaded ? 'Live market snapshot' : 'Loading live data…'}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {snapshot.map((st) => (
                  <div key={st.label}>
                    <div className="mp-serif text-[38px] md:text-[52px] font-semibold leading-none" style={{ color: NAVY }}>{st.value}</div>
                    <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>{st.label}</div>
                  </div>
                ))}
              </div>
              {latestSale ? (
                <div className="mt-5 text-xs" style={{ color: INK }}>
                  Data through {new Date(latestSale).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {s ? ` · ${num(s.total_sales)} sales indexed all-time` : ''}
                </div>
              ) : null}
            </Reveal>
          </section>

          {/* coverage / value / volume cards */}
          <section className="max-w-6xl mx-auto px-6 pb-4">
            <div className="grid md:grid-cols-3 gap-5">
              {cards.map((c, i) => (
                <Reveal key={c.eyebrow} delay={0.06 * i}>
                  <div className="rounded-[22px] border border-black/[0.07] bg-[#f4f7fb] p-7 h-full">
                    <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BLUE }}>{c.eyebrow}</div>
                    <div className="mp-serif text-[40px] font-semibold leading-none mt-4" style={{ color: NAVY }}>{c.big}</div>
                    <div className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{c.sub}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* interleaved articles #1 */}
          <BlogStrip posts={g1} show={showArticles} />

          {/* $/sf chart */}
          <section style={{ background: '#f4f7fb' }}>
            <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
              <Reveal>
                <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>Price movement</div>
                <h2 className="mp-serif text-[28px] md:text-[40px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Median price per square foot.</h2>
                <p className="mt-3 text-sm" style={{ color: INK }}>Median by quarter. Hover the line to inspect any point.</p>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="mt-8 rounded-[24px] bg-white border border-black/[0.07] p-6 md:p-8"><PsfChart data={psf} /></div>
              </Reveal>
            </div>
          </section>

          {/* recent sales */}
          <section style={{ background: NAVY_DEEP }}>
            <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
              <Reveal>
                <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: '#91a1ba' }}>Live · recent sales</div>
                <h2 className="mp-serif text-white text-[28px] md:text-[40px] leading-[1.05] font-semibold">The latest closings.</h2>
              </Reveal>
              {sales.length ? (
                <div className="grid sm:grid-cols-2 gap-4 mt-8">
                  {sales.map((sale, i) => (
                    <Reveal key={`${sale.building_slug}-${i}`} delay={0.04 * i}>
                      <div className="rounded-[18px] p-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div>
                          <div className="text-white font-medium">{sale.unit_address}</div>
                          <div className="mp-mono text-[11px] uppercase tracking-[0.14em] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            {fmtDate(sale.sale_date)}{sale.sqft ? ` · ${sale.sqft.toLocaleString()} sqft` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="mp-serif text-xl font-semibold text-white">{money(sale.sale_price)}</div>
                          {sale.sqft ? <div className="mp-mono text-[11px]" style={{ color: '#91a1ba' }}>${Math.round(sale.sale_price / sale.sqft).toLocaleString()}/sf</div> : null}
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              ) : (
                <div className="mt-8 mp-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Recent closings will appear here as they record.
                </div>
              )}
            </div>
          </section>

          {/* interleaved articles #2 */}
          <BlogStrip posts={g2} show={showArticles} />

          {/* buildings */}
          <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
            <Reveal>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>Most active buildings</div>
              <h2 className="mp-serif text-[28px] md:text-[40px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Where the market is moving.</h2>
            </Reveal>
            {activeBuildings.length ? (
              <div className="grid md:grid-cols-3 gap-5 mt-8">
                {activeBuildings.map((b, i) => (
                  <Reveal key={b.slug} delay={0.05 * i}>
                    <div className="mp-lift rounded-[22px] border border-black/[0.07] bg-white overflow-hidden h-full">
                      <div className="h-40 overflow-hidden bg-[#f4f7fb]">
                        {b.hero ? (
                          <img src={b.hero} alt={b.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Building2 className="w-8 h-8" style={{ color: 'rgba(79,130,185,0.4)' }} /></div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4" style={{ color: BLUE }} />
                          <span className="mp-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: INK }}>{b.neighborhood}</span>
                        </div>
                        <h3 className="mp-serif text-xl font-semibold" style={{ color: NAVY }}>{b.name}</h3>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div><div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>{b.sales != null ? b.sales : '—'}</div><div className="mp-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: INK }}>Sales</div></div>
                          <div><div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>${b.psf.toLocaleString()}</div><div className="mp-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: INK }}>$/sf</div></div>
                          <div><div className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>{money(b.median_price)}</div><div className="mp-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: INK }}>Median</div></div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="mt-8 mp-mono text-xs uppercase tracking-[0.16em]" style={{ color: INK }}>
                Building-level detail is being indexed for this market.
              </div>
            )}
          </section>

          {/* interleaved articles #3 */}
          <BlogStrip posts={g3} show={showArticles} />

          {/* more articles — newest first, revealed in batches */}
          {showArticles && extraPosts.length ? (
            <section className="max-w-6xl mx-auto px-6 pb-8">
              <Reveal>
                <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-6" style={{ color: BLUE }}>
                  More on {cfg.shortName}
                </div>
              </Reveal>
              <div className="grid md:grid-cols-3 gap-6">
                {shownExtra.map((p) => <Reveal key={p.slug}><BlogTile p={p} /></Reveal>)}
              </div>
              {hasMore ? (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setVisibleExtra((n) => n + 6)}
                    className="rounded-full px-6 py-3 text-sm font-medium border transition-all inline-flex items-center gap-2"
                    style={{ background: '#fff', color: NAVY, borderColor: 'rgba(0,0,0,0.12)' }}>
                    Load more articles <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
        /* coming-soon market: no live feed yet, but show its articles */
        <section className="max-w-6xl mx-auto px-6 py-12">
          <Reveal>
            <div className="rounded-[24px] border border-black/[0.08] bg-[#f4f7fb] p-8 md:p-10 flex items-start gap-4">
              <Lock className="w-6 h-6 mt-1 shrink-0" style={{ color: BLUE }} />
              <div>
                <h3 className="mp-serif text-2xl font-semibold" style={{ color: NAVY }}>Live {cfg.shortName} data is coming soon.</h3>
                <p className="mt-2 leading-relaxed" style={{ color: INK }}>
                  We’re wiring up an automated {cfg.shortName} feed with the same depth as our condo
                  markets. In the meantime, here’s our latest writing on it.
                </p>
              </div>
            </div>
          </Reveal>
          {showArticles ? <div className="mt-10"><BlogStrip posts={posts.slice(0, 9)} show={true} /></div> : null}
        </section>
      )}

      {/* full archive link */}
      <section className="max-w-6xl mx-auto px-6 pb-4">
        <Reveal>
          <Link to="/insights" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: BLUE }}>
            Browse the full article archive <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY }} className="mt-8">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <Reveal>
            <h2 className="mp-serif text-white text-[32px] md:text-[48px] leading-[1.05] font-semibold">Thinking about {cfg.shortName}?</h2>
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
