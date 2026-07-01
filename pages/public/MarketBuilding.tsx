// Internal McMullen building page — /market/:region/:slug
//
// This is the SEO/AIO anchor: a real page ON mcmullenresidential.com for every
// building in every Condo Market market. It surfaces the building's NAME and
// full ADDRESS (the most-searched terms) as first-party content we can rank
// for, plus live stats — then links OUT to the full Condo Market building page
// for ten years of sales history. That outbound link is the backlink; this
// page's URL is what goes in our sitemap.
//
// Building data comes from the isolated read-only Condo Market client via
// home_page_payload(dataSlug).index, matched by slug.

import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import { MotionStyles, Reveal, PillButton, NAVY, NAVY_DEEP, INK } from '@/components/public/motion'
import {
  marketByRegionSlug, fetchHomePayload, condoMarketBuildingUrl, marketBuildingPath,
  type HomeIndexBuilding, type MarketConfig,
} from '@/lib/condoMarket'
import { Building2, MapPin, ArrowRight, ArrowLeft, Video, Phone, ExternalLink } from 'lucide-react'

const BLUE = '#4f82b9'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

function num(n: number | null | undefined): string {
  return n == null || !isFinite(n) ? '—' : n.toLocaleString()
}

export default function MarketBuilding() {
  const { region, slug } = useParams<{ region: string; slug: string }>()
  const cfg: MarketConfig | undefined = region ? marketByRegionSlug(region) : undefined

  const [buildings, setBuildings] = useState<HomeIndexBuilding[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!cfg) return
    let cancelled = false
    setLoaded(false)
    ;(async () => {
      const h = await fetchHomePayload(cfg.dataSlug)
      if (cancelled) return
      setBuildings(h.index)
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [cfg])

  const building = useMemo(
    () => buildings.find((b) => b.slug === slug) ?? null,
    [buildings, slug]
  )

  // Unknown region → not a real page; send to the market hub.
  if (region && !cfg) return <Navigate to="/blog" replace />

  const cmUrl = cfg && slug ? condoMarketBuildingUrl(cfg.cmDomain, slug) : '#'

  // A few nearby buildings in the same neighborhood, for internal linking.
  const nearby = useMemo(() => {
    if (!building) return []
    return buildings
      .filter((b) => b.slug !== building.slug && b.neighborhood && b.neighborhood === building.neighborhood)
      .slice(0, 6)
  }, [buildings, building])

  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="insight" />

      {/* hero */}
      <section style={{ background: NAVY_DEEP }}>
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-14 md:pt-20 md:pb-16">
          <Reveal>
            <Link to={cfg ? `/blog?m=${cfg.key}` : '/blog'} className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: '#91a1ba' }}>
              <ArrowLeft className="w-4 h-4" /> {cfg ? `${cfg.shortName} market` : 'Market'}
            </Link>
          </Reveal>

          {building ? (
            <>
              <Reveal>
                <div className="mp-mono text-[11px] uppercase tracking-[0.24em] mb-4" style={{ color: '#91a1ba' }}>
                  {building.neighborhood || cfg?.shortName}{building.year_built ? ` · Built ${building.year_built}` : ''}
                </div>
                <h1 className="mp-serif text-white text-[34px] md:text-[54px] leading-[1.04] font-semibold">{building.name}</h1>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="flex items-center gap-2 mt-5" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
                  <span className="text-lg">{building.address}</span>
                </div>
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

      {building ? (
        <>
          {/* stats + CTA */}
          <section className="max-w-5xl mx-auto px-6 py-12 md:py-16">
            <div className="grid md:grid-cols-3 gap-6">
              <Reveal>
                <div className="rounded-[22px] border border-black/[0.07] bg-[#f4f7fb] p-7 h-full">
                  <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BLUE }}>Median $/sf</div>
                  <div className="mp-serif text-[40px] font-semibold leading-none mt-4" style={{ color: NAVY }}>
                    {building.psf != null ? `$${num(building.psf)}` : '—'}
                  </div>
                  <div className="text-sm mt-3" style={{ color: INK }}>recent closed-sale basis</div>
                </div>
              </Reveal>
              <Reveal delay={0.06}>
                <div className="rounded-[22px] border border-black/[0.07] bg-[#f4f7fb] p-7 h-full">
                  <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BLUE }}>Units</div>
                  <div className="mp-serif text-[40px] font-semibold leading-none mt-4" style={{ color: NAVY }}>{num(building.units)}</div>
                  <div className="text-sm mt-3" style={{ color: INK }}>condos in the building</div>
                </div>
              </Reveal>
              <Reveal delay={0.12}>
                <div className="rounded-[22px] border border-black/[0.07] bg-[#f4f7fb] p-7 h-full">
                  <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BLUE }}>Active now</div>
                  <div className="mp-serif text-[40px] font-semibold leading-none mt-4" style={{ color: NAVY }}>{num(building.active_count)}</div>
                  <div className="text-sm mt-3" style={{ color: INK }}>listings on the market</div>
                </div>
              </Reveal>
            </div>

            {/* outbound backlink to Condo Market — the full history lives there */}
            <Reveal delay={0.1}>
              <div className="mt-8 rounded-[24px] border border-black/[0.08] p-7 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5" style={{ background: '#fff' }}>
                <div>
                  <h2 className="mp-serif text-2xl font-semibold" style={{ color: NAVY }}>See ten years of sales at {building.name}</h2>
                  <p className="mt-2 leading-relaxed" style={{ color: INK }}>
                    Every recorded closing, price-per-square-foot history, owner tenure, and live activity —
                    on {cfg?.shortName} Condo Market.
                  </p>
                </div>
                <a href={cmUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
                  style={{ background: NAVY, color: '#fff' }}>
                  View full history <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </Reveal>
          </section>

          {/* nearby buildings — internal links */}
          {nearby.length ? (
            <section className="max-w-5xl mx-auto px-6 pb-14 md:pb-20">
              <Reveal>
                <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-6" style={{ color: BLUE }}>
                  More in {building.neighborhood}
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

          {/* CTA */}
          <section style={{ background: NAVY }}>
            <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
              <Reveal>
                <h2 className="mp-serif text-white text-[30px] md:text-[44px] leading-[1.05] font-semibold">
                  Buying or selling at {building.name}?
                </h2>
                <p className="mt-5 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  I know this building and this market. Let’s talk through your options on a quick call.
                </p>
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <PillButton href={CAL} onDark><Video className="w-4 h-4" /> Schedule a video call with Tim</PillButton>
                  <PillButton href="tel:+14156919272" variant="secondary" onDark><Phone className="w-4 h-4" /> (415) 691-9272</PillButton>
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
