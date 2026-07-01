// The bridge page — /market/:region/:slug
//
// A McMullen-branded editorial page that sits BETWEEN the MR market hub and the
// Condo Market marketplace building page. Its job is a deliberate three-act
// hand-off:
//
//   Act 1 — Agency frame. Navy, Playfair, agent voice. This is Tim's site, and
//           he knows this building.
//   Act 2 — A taste of the live data. Real stats from building_page_payload
//           (12mo sales, median $/sf, how it compares to the city) so the
//           visitor FEELS the marketplace's value before leaving.
//   Act 3 — Attributed hand-off. A branded module that states plainly that
//           McMullen Properties BUILT the marketplace, sells the depth of the
//           live feed, then sends the visitor across with intent.
//
// Also sets a per-page <title> + meta description containing the address, so we
// rank on our own domain for the building's address and name (the SEO goal).
// Follows the document.title pattern already used in BlogPost.tsx.

import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import { MotionStyles, Reveal, PillButton, NAVY, NAVY_DEEP, INK } from '@/components/public/motion'
import {
  marketByRegionSlug, fetchBuildingDetail, fetchHomePayload,
  condoMarketBuildingUrl, marketBuildingPath,
  type BuildingDetail, type HomeIndexBuilding, type MarketConfig,
} from '@/lib/condoMarket'
import {
  Building2, MapPin, ArrowLeft, ArrowRight, Video, Phone, ExternalLink,
  TrendingDown, TrendingUp, Activity, Database, BadgeCheck,
} from 'lucide-react'

const BLUE = '#4f82b9'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

function num(n: number | null | undefined): string {
  return n == null || !isFinite(n) ? '—' : n.toLocaleString()
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

export default function MarketBuilding() {
  const { region, slug } = useParams<{ region: string; slug: string }>()
  const cfg: MarketConfig | undefined = region ? marketByRegionSlug(region) : undefined

  const [detail, setDetail] = useState<BuildingDetail | null>(null)
  const [nearby, setNearby] = useState<HomeIndexBuilding[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!cfg || !slug) return
    let cancelled = false
    setLoaded(false)
    setDetail(null)
    setNearby([])
    // Land at the top of the new building page — without this, React Router keeps
    // the previous scroll position and the short (pre-fetch) page can leave the
    // viewport parked near the footer.
    window.scrollTo(0, 0)
    ;(async () => {
      const [d, home] = await Promise.all([
        fetchBuildingDetail(slug),
        fetchHomePayload(cfg.dataSlug),
      ])
      if (cancelled) return
      setDetail(d)
      if (d) {
        setNearby(
          home.index
            .filter((b) => b.slug !== d.slug && b.neighborhood && b.neighborhood === d.neighborhood)
            .slice(0, 6)
        )
      }
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [cfg, slug])

  // Per-page title + meta for SEO — address + name on our own domain.
  useEffect(() => {
    const prevTitle = document.title
    const metaEl = document.querySelector('meta[name="description"]')
    const prevDesc = metaEl?.getAttribute('content') ?? null

    if (detail) {
      document.title = `${detail.name} — ${detail.address} | McMullen Properties`
      const desc = `${detail.name} at ${detail.address}${detail.neighborhood ? ` in ${detail.neighborhood}` : ''}. Live sales data, median price per square foot, and building activity — indexed by McMullen Properties.`
      metaEl?.setAttribute('content', desc)
    }
    return () => {
      document.title = prevTitle
      if (metaEl && prevDesc != null) metaEl.setAttribute('content', prevDesc)
    }
  }, [detail])

  // Unknown region → not a real page.
  if (region && !cfg) return <Navigate to="/blog" replace />

  const cmUrl = cfg && slug ? condoMarketBuildingUrl(cfg.cmDomain, slug) : '#'
  const marketName = detail?.market_name || cfg?.shortName || 'Condo Market'
  const st = detail?.stats ?? null

  // Comparative insight — the single most compelling live number.
  const vsCity = st?.psf_vs_city_pct ?? null
  const cheaper = vsCity != null && vsCity < 0

  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="insight" />

      {/* ===== ACT 1 — AGENCY FRAME ===== */}
      <section className="relative overflow-hidden" style={{ background: NAVY_DEEP }}>
        {/* building hero photo — sits behind, dimmed by a navy gradient so the
            agency-branded white text stays crisp. Falls back to solid navy. */}
        {detail?.hero_url ? (
          <>
            <img
              src={detail.hero_url}
              alt={detail.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.55 }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, rgba(8,15,24,0.55) 0%, rgba(8,15,24,0.72) 55%, ${NAVY_DEEP} 100%), linear-gradient(90deg, rgba(8,15,24,0.85) 0%, rgba(8,15,24,0.35) 60%, rgba(8,15,24,0.15) 100%)`,
              }}
            />
          </>
        ) : null}

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20">
          <Reveal>
            <Link to={cfg ? `/blog?m=${cfg.key}` : '/blog'} className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: '#c3cfe0' }}>
              <ArrowLeft className="w-4 h-4" /> {cfg ? `${cfg.shortName} market` : 'Market'}
            </Link>
          </Reveal>

          {detail ? (
            <>
              <Reveal>
                <div className="mp-mono text-[11px] uppercase tracking-[0.24em] mb-4" style={{ color: '#c3cfe0' }}>
                  {detail.neighborhood || cfg?.shortName}{detail.year_built ? ` · Built ${detail.year_built}` : ''}
                </div>
                <h1 className="mp-serif text-white text-[34px] md:text-[58px] leading-[1.04] font-semibold" style={{ textShadow: detail.hero_url ? '0 2px 20px rgba(0,0,0,0.35)' : 'none' }}>{detail.name}</h1>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="flex items-center gap-2 mt-5" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
                  <span className="text-lg">{detail.address}</span>
                </div>
                <p className="mt-6 max-w-2xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  {detail.description
                    ? detail.description
                    : `A ${marketName} building I track closely${detail.unit_count ? ` — ${num(detail.unit_count)} condos` : ''}${detail.neighborhood ? ` in ${detail.neighborhood}` : ''}. Here's a live snapshot of how it's trading, and where to go for the full picture.`}
                </p>
              </Reveal>
            </>
          ) : (
            <Reveal>
              <h1 className="mp-serif text-white text-[32px] md:text-[46px] leading-[1.05] font-semibold">
                {loaded ? 'Building not found' : 'Loading building…'}
              </h1>
              {loaded ? (
                <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  We couldn’t find that building in the {cfg?.shortName} market. It may have been renamed or removed.
                </p>
              ) : null}
            </Reveal>
          )}
        </div>
      </section>

      {detail ? (
        <>
          {/* ===== ACT 2 — A TASTE OF THE LIVE DATA ===== */}
          <section className="max-w-5xl mx-auto px-6 py-14 md:py-16">
            <Reveal>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4" style={{ color: BLUE }} />
                <span className="mp-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: BLUE }}>Live snapshot</span>
              </div>
              <h2 className="mp-serif text-[26px] md:text-[36px] leading-[1.08] font-semibold" style={{ color: NAVY }}>
                What the data shows right now.
              </h2>
            </Reveal>

            {st ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                  <Reveal>
                    <div>
                      <div className="mp-serif text-[34px] md:text-[42px] font-semibold leading-none" style={{ color: NAVY }}>
                        {st.median_psf_12mo != null ? `$${num(st.median_psf_12mo)}` : '—'}
                      </div>
                      <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-3" style={{ color: INK }}>Median $/sf · 12mo</div>
                    </div>
                  </Reveal>
                  <Reveal delay={0.05}>
                    <div>
                      <div className="mp-serif text-[34px] md:text-[42px] font-semibold leading-none" style={{ color: NAVY }}>{num(st.sold_12mo)}</div>
                      <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-3" style={{ color: INK }}>Sold · last 12mo</div>
                    </div>
                  </Reveal>
                  <Reveal delay={0.1}>
                    <div>
                      <div className="mp-serif text-[34px] md:text-[42px] font-semibold leading-none" style={{ color: NAVY }}>
                        {st.median_price_12mo != null ? money(st.median_price_12mo) : '—'}
                      </div>
                      <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-3" style={{ color: INK }}>Median price · 12mo</div>
                    </div>
                  </Reveal>
                  <Reveal delay={0.15}>
                    <div>
                      <div className="mp-serif text-[34px] md:text-[42px] font-semibold leading-none" style={{ color: NAVY }}>{num(detail.active_count)}</div>
                      <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-3" style={{ color: INK }}>Active now</div>
                    </div>
                  </Reveal>
                </div>

                {/* the standout comparative insight */}
                {vsCity != null && vsCity !== 0 ? (
                  <Reveal delay={0.1}>
                    <div className="mt-8 rounded-[22px] border border-black/[0.07] bg-[#f4f7fb] p-6 md:p-7 flex items-start gap-4">
                      {cheaper
                        ? <TrendingDown className="w-6 h-6 mt-0.5 shrink-0" style={{ color: '#3f7d5a' }} />
                        : <TrendingUp className="w-6 h-6 mt-0.5 shrink-0" style={{ color: '#b0654a' }} />}
                      <div>
                        <div className="mp-serif text-xl font-semibold" style={{ color: NAVY }}>
                          {cheaper ? 'Trades below' : 'Trades above'} the {marketName} median
                        </div>
                        <p className="mt-1.5 leading-relaxed" style={{ color: INK }}>
                          At ${num(st.median_psf_12mo)}/sf, {detail.name} is about{' '}
                          <strong style={{ color: NAVY }}>{Math.abs(vsCity)}% {cheaper ? 'below' : 'above'}</strong>{' '}
                          the citywide median of ${num(st.median_psf_city)}/sf over the last year.
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ) : null}

                {st.last_sale && st.last_sale.price ? (
                  <Reveal delay={0.12}>
                    <div className="mt-4 text-sm" style={{ color: INK }}>
                      Most recent recorded sale: unit {st.last_sale.unit} closed at{' '}
                      <strong style={{ color: NAVY }}>{money(st.last_sale.price)}</strong> on {fmtDate(st.last_sale.date)}.
                    </div>
                  </Reveal>
                ) : null}
              </>
            ) : (
              <p className="mt-6 leading-relaxed" style={{ color: INK }}>
                Live sales data for this building is being indexed. The full record is on the marketplace.
              </p>
            )}
          </section>

          {/* ===== ACT 3 — ATTRIBUTED HAND-OFF ===== */}
          <section style={{ background: NAVY }}>
            <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: 'rgba(145,161,186,0.14)', border: '1px solid rgba(145,161,186,0.25)' }}>
                  <BadgeCheck className="w-4 h-4" style={{ color: '#91a1ba' }} />
                  <span className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: '#91a1ba' }}>
                    Built by McMullen Properties
                  </span>
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mp-serif text-white text-[30px] md:text-[44px] leading-[1.06] font-semibold max-w-3xl">
                  We built {marketName} to track every building like this one.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 text-lg leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {marketName} is our own live marketplace — ten years of closed sales for every unit,
                  median price-per-square-foot history, owner tenure, and real-time activity. The snapshot
                  above is a fraction of what’s on {detail.name}’s full page.
                </p>
              </Reveal>

              <div className="grid sm:grid-cols-3 gap-5 mt-10">
                <Reveal delay={0.12}>
                  <div className="rounded-[18px] p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Database className="w-5 h-5 mb-3" style={{ color: '#91a1ba' }} />
                    <div className="text-white font-medium">Every unit, ten years</div>
                    <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Every recorded closing, not just averages.</div>
                  </div>
                </Reveal>
                <Reveal delay={0.16}>
                  <div className="rounded-[18px] p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Activity className="w-5 h-5 mb-3" style={{ color: '#91a1ba' }} />
                    <div className="text-white font-medium">Updated continuously</div>
                    <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>New sales flow in as they record.</div>
                  </div>
                </Reveal>
                <Reveal delay={0.2}>
                  <div className="rounded-[18px] p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Building2 className="w-5 h-5 mb-3" style={{ color: '#91a1ba' }} />
                    <div className="text-white font-medium">Owner tenure & activity</div>
                    <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Who’s held, who’s selling, what’s live.</div>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={0.15}>
                <div className="mt-10">
                  <a href={cmUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium"
                    style={{ background: '#fff', color: NAVY }}>
                    Open {detail.name} on {marketName} <ExternalLink className="w-4 h-4" />
                  </a>
                  <div className="mt-3 mp-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Opens {marketName.toLowerCase().includes('condo') ? marketName : `${marketName} Condo Market`} in a new tab
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* nearby buildings — internal links keep the visitor on MR */}
          {nearby.length ? (
            <section className="max-w-5xl mx-auto px-6 py-14 md:py-20">
              <Reveal>
                <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-6" style={{ color: BLUE }}>
                  More in {detail.neighborhood}
                </div>
              </Reveal>
              <div className="grid md:grid-cols-3 gap-5">
                {nearby.map((b, i) => (
                  <Reveal key={b.slug} delay={0.05 * i}>
                    <Link to={marketBuildingPath(cfg!.regionSlug, b.slug)}
                      className="mp-lift block rounded-[22px] border border-black/[0.07] bg-white p-6 h-full">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4" style={{ color: BLUE }} />
                        <span className="mp-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: INK }}>{b.neighborhood}</span>
                      </div>
                      <h3 className="mp-serif text-lg font-semibold" style={{ color: NAVY }}>{b.name}</h3>
                      <div className="text-sm mt-1.5" style={{ color: INK }}>{b.address}</div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </section>
          ) : null}

          {/* agent CTA */}
          <section style={{ background: '#f4f7fb' }}>
            <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
              <Reveal>
                <h2 className="mp-serif text-[28px] md:text-[42px] leading-[1.06] font-semibold" style={{ color: NAVY }}>
                  Buying or selling at {detail.name}?
                </h2>
                <p className="mt-5 text-lg leading-relaxed" style={{ color: INK }}>
                  I know this building and this market. Let’s talk through your options on a quick call.
                </p>
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <PillButton href={CAL}><Video className="w-4 h-4" /> Schedule a video call with Tim</PillButton>
                  <PillButton href="tel:+14156919272" variant="secondary"><Phone className="w-4 h-4" /> (415) 691-9272</PillButton>
                </div>
              </Reveal>
            </div>
          </section>
        </>
      ) : (
        <section className="max-w-5xl mx-auto px-6 py-16">
          {loaded ? (
            <Link to={cfg ? `/blog?m=${cfg.key}` : '/blog'} className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: BLUE }}>
              Back to the {cfg?.shortName} market <ArrowRight className="w-4 h-4" />
            </Link>
          ) : null}
        </section>
      )}

      <PublicFooter />
    </div>
  )
}
