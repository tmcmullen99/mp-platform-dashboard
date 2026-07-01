// The Market hub — one page, multiple market data feeds.
//
// Replaces the old /blog "Market Insight" index. A selector at the top lets the
// visitor choose which market's live data to explore (SF condos first; SV,
// Eichler, Campbell and more to follow). The chosen market drives a live data
// experience — stat band, $/sf trend, recent closings, active buildings —
// with market-tagged (and general) blog posts scattered through the data, which
// the visitor can toggle on/off. Selection lives in the URL (?m=sf) so it's one
// route and every market is shareable/linkable.

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles, Reveal, ParallaxHero, Marquee, PillButton, NAVY, NAVY_DEEP, INK,
} from '@/components/public/motion'
import { supabase } from '@/lib/supabase'
import {
  MARKETS, marketByKey, GENERAL_TAGS,
  fetchCityMonthly, fetchRecentSales, fetchPsfQuarterly, fetchBuildingStats,
  type CityMonthly, type RecentSale, type PsfQuarter, type BuildingStat, type MarketConfig,
} from '@/lib/condoMarket'
import { Building2, Video, Phone, Newspaper, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'

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

// ---- $/sf quarterly line chart (inline SVG) ---------------------------------
function PsfChart({ data }: { data: PsfQuarter[] }) {
  if (!data.length) return null
  const W = 900, H = 300, PAD = 44
  const pts = data.filter((d) => d.median_psf > 0)
  if (pts.length < 2) return null
  const ys = pts.map((d) => d.median_psf)
  const minY = Math.min(...ys) * 0.92
  const maxY = Math.max(...ys) * 1.05
  const x = (i: number) => PAD + (i / (pts.length - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - minY) / (maxY - minY)) * (H - PAD * 2)
  const path = pts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.median_psf).toFixed(1)}`).join(' ')
  const area = `${path} L ${x(pts.length - 1).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`
  const tickVals = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4)
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
      <text x={PAD} y={H - 12} fontSize="12" fill={INK} fontFamily="monospace">{new Date(pts[0].quarter_start).getFullYear()}</text>
      <text x={W - PAD} y={H - 12} textAnchor="end" fontSize="12" fill={INK} fontFamily="monospace">{new Date(pts[pts.length - 1].quarter_start).getFullYear()}</text>
    </svg>
  )
}

function BlogTile({ p }: { p: BlogCard }) {
  return (
    <Link to={`/blog/${p.slug}`} className="group block rounded-[22px] overflow-hidden border border-black/[0.07] bg-white mp-lift">
      <div className="h-40 overflow-hidden bg-[#f4f7fb]">
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

  const [monthly, setMonthly] = useState<CityMonthly[]>([])
  const [sales, setSales] = useState<RecentSale[]>([])
  const [psf, setPsf] = useState<PsfQuarter[]>([])
  const [buildings, setBuildings] = useState<BuildingStat[]>([])
  const [posts, setPosts] = useState<BlogCard[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showArticles, setShowArticles] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    ;(async () => {
      // Always load this market's blog posts (market tags + general insight tags).
      const tagSet = Array.from(new Set([...cfg.blogTags, ...GENERAL_TAGS]))
      const blogQ = supabase
        .from('blog_posts')
        .select('slug, name, card_description, image, publish_date, tags_array')
        .eq('is_published', true).neq('is_archived', true)
        .overlaps('tags_array', tagSet)
        .order('publish_date', { ascending: false, nullsFirst: false })
        .limit(9)

      if (cfg.available) {
        const [m, s, q, b, blog] = await Promise.all([
          fetchCityMonthly(36),
          fetchRecentSales(cfg.dataSlug, 8),
          fetchPsfQuarterly(cfg.dataSlug),
          fetchBuildingStats(cfg.dataSlug, 12),
          blogQ,
        ])
        if (cancelled) return
        setMonthly(m); setSales(s); setPsf(q); setBuildings(b.slice(0, 6))
        setPosts(((blog.data as BlogCard[]) ?? []))
      } else {
        const blog = await blogQ
        if (cancelled) return
        setMonthly([]); setSales([]); setPsf([]); setBuildings([])
        setPosts(((blog.data as BlogCard[]) ?? []))
      }
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [cfg])

  const latest = monthly.length ? monthly[monthly.length - 1] : null
  const tenYrSales = useMemo(() => monthly.reduce((a, m) => a + (m.sales || 0), 0), [monthly])
  const stats = [
    { label: 'Median $/sf', value: latest ? `$${latest.median_psf.toLocaleString()}` : '—' },
    { label: 'Sales · latest mo.', value: latest ? String(latest.sales) : '—' },
    { label: 'Median price', value: latest ? money(latest.median_price) : '—' },
    { label: 'Buildings tracked', value: buildings.length ? String(buildings.length) : '—' },
  ]

  // split posts into three groups to scatter through the page
  const g1 = posts.slice(0, 3), g2 = posts.slice(3, 6), g3 = posts.slice(6, 9)

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

          {/* stat band */}
          <section className="max-w-6xl mx-auto px-6 py-14 md:py-16">
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
                  Data through {new Date(latest.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · {tenYrSales.toLocaleString()} sales indexed
                </div>
              ) : null}
            </Reveal>
          </section>

          {/* interleaved articles #1 */}
          <BlogStrip posts={g1} show={showArticles} />

          {/* $/sf chart */}
          <section style={{ background: '#f4f7fb' }}>
            <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
              <Reveal>
                <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>Price movement</div>
                <h2 className="mp-serif text-[28px] md:text-[40px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Median price per square foot.</h2>
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
              <div className="grid sm:grid-cols-2 gap-4 mt-8">
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

          {/* interleaved articles #2 */}
          <BlogStrip posts={g2} show={showArticles} />

          {/* buildings */}
          <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
            <Reveal>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUE }}>Most active buildings</div>
              <h2 className="mp-serif text-[28px] md:text-[40px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Where the market is moving.</h2>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-5 mt-8">
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

          {/* interleaved articles #3 */}
          <BlogStrip posts={g3} show={showArticles} />
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
