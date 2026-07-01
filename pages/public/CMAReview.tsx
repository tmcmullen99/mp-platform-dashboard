// /cma-review — the public "Buyer Analysis" showcase.
//
// Two galleries, one page:
//   1. CMA showcase (PUBLIC)      — reads cmas where visibility='public_showcase'.
//      Each card links to /cma-review/:slug, a full public CMA viewer.
//   2. Disclosure showcase (GATED)— reads the disclosure_showcase_teasers view
//      (safe teaser columns only). Signed-out visitors see the teaser + an
//      account gate; signed-in visitors get a "Read the review" button that
//      opens the gated PDF via a signed URL (handled in DisclosureReview.tsx).
//
// The gate is the lead magnet: teaser is bait, account unlocks the asset.
// Brand + motion inherited from the service pages (motion.tsx).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles,
  Reveal,
  CountUp,
  ParallaxHero,
  PillButton,
  NAVY,
  NAVY_DEEP,
  INK,
  BLUEGRAY,
} from '@/components/public/motion'
import {
  FileSearch,
  ShieldCheck,
  MapPin,
  Lock,
  ArrowUpRight,
  FileText,
  Quote,
} from 'lucide-react'

const ROYAL = '#1d4ed8' // the CMA-deliverable royal-blue accent

type CMACard = {
  slug: string
  name: string
  property_address: string | null
  showcase_neighborhood: string | null
  showcase_catch: string | null
  showcase_blurb: string | null
  showcase_image: string | null
}

type DiscTeaser = {
  slug: string
  name: string
  property_address: string | null
  showcase_neighborhood: string | null
  showcase_catch: string | null
  showcase_blurb: string | null
  showcase_image: string | null
}

// Short display name from a full CMA row name ("273 Edinburgh Street — CMA" → "273 Edinburgh Street").
function shortName(name: string) {
  return name.replace(/\s*[—-]\s*(CMA|Listing Review|Disclosure Review).*$/i, '').trim()
}

export default function CMAReview() {
  const { session } = useAuth()
  const signedIn = !!session
  const [cmas, setCmas] = useState<CMACard[]>([])
  const [teasers, setTeasers] = useState<DiscTeaser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [cmaRes, discRes] = await Promise.all([
        supabase
          .from('cmas')
          .select(
            'slug,name,property_address,showcase_neighborhood,showcase_catch,showcase_blurb,showcase_image',
          )
          .eq('visibility', 'public_showcase')
          .eq('status', 'published')
          .order('published_at', { ascending: false }),
        supabase
          .from('disclosure_showcase_teasers')
          .select('*')
          .order('published_at', { ascending: false }),
      ])
      if (cancelled) return
      setCmas((cmaRes.data as CMACard[]) || [])
      setTeasers((discRes.data as DiscTeaser[]) || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mp-scope" style={{ background: '#fff', color: INK }}>
      <MotionStyles />
      <PublicNav active="services" />

      {/* HERO */}
      <ParallaxHero accent="blue" minH="62vh">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <div
              className="mp-mono mb-5 text-xs tracking-[0.34em]"
              style={{ color: BLUEGRAY }}
            >
              BUYER ANALYSIS
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="mp-serif text-white"
              style={{ fontSize: 'clamp(38px,6vw,72px)', lineHeight: 1.04, letterSpacing: '-0.02em' }}
            >
              We tell you what it&rsquo;s <em style={{ color: BLUEGRAY }}>worth</em>
              <br />— and what&rsquo;s <em style={{ color: BLUEGRAY }}>wrong</em> with it.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-xl text-base" style={{ color: '#cfd6e2' }}>
              Every buyer we represent gets two documents most agents never produce: a
              comparative market analysis that shows what to offer, and a disclosure review
              that shows what they&rsquo;re actually buying. Here&rsquo;s the real work.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <PillButton href="#cmas" onDark>
                See a sample CMA
              </PillButton>
              <PillButton href="https://wa.me/14156919272" variant="secondary" onDark>
                Talk to Tim
              </PillButton>
            </div>
          </Reveal>
        </div>
      </ParallaxHero>

      {/* THE TWO DELIVERABLES */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div
              className="mp-lift h-full rounded-2xl p-9"
              style={{ background: '#faf7f1', boxShadow: '0 1px 0 rgba(0,0,0,.04)' }}
            >
              <FileSearch size={30} style={{ color: ROYAL }} />
              <h3 className="mp-serif mt-5 text-2xl" style={{ color: NAVY }}>
                The CMA
              </h3>
              <p className="mp-mono mt-1 text-xs tracking-[0.2em]" style={{ color: BLUEGRAY }}>
                WHAT SHOULD I OFFER?
              </p>
              <p className="mt-4 text-[15px] leading-relaxed">
                Real closed comps, an interactive map, the value-justification math, a
                buyer-cost calculator, and a recommended range framed as strategy — not a
                sales pitch.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div
              className="mp-lift h-full rounded-2xl p-9"
              style={{ background: NAVY, color: '#dfe5ee' }}
            >
              <ShieldCheck size={30} style={{ color: BLUEGRAY }} />
              <h3 className="mp-serif mt-5 text-2xl text-white">The Disclosure Review</h3>
              <p className="mp-mono mt-1 text-xs tracking-[0.2em]" style={{ color: BLUEGRAY }}>
                WHAT AM I ACTUALLY BUYING?
              </p>
              <p className="mt-4 text-[15px] leading-relaxed">
                Every disclosure document read — often 70 to 400 pages — distilled to a
                plain-English briefing where every claim is anchored to a named source. We
                read all 400 pages so you don&rsquo;t have to.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CMA SHOWCASE */}
      <section id="cmas" className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal>
          <div className="mb-3 text-xs tracking-[0.28em]" style={{ color: ROYAL }}>
            THE CMA SHOWCASE
          </div>
          <h2 className="mp-serif text-3xl md:text-4xl" style={{ color: NAVY }}>
            How we read the comps.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">
            Real analyses for real properties. Open any one — the interactive map, the
            sortable comp grid, the value math, and the recommended range are all live.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl"
                  style={{ background: '#f1ece3' }}
                />
              ))
            : cmas.map((c, i) => (
                <Reveal key={c.slug} delay={i * 0.05}>
                  <Link
                    to={`/cma-review/${c.slug}`}
                    className="mp-lift group flex h-full flex-col rounded-2xl p-7"
                    style={{ background: '#faf7f1', boxShadow: '0 1px 0 rgba(0,0,0,.04)' }}
                  >
                    <div
                      className="flex items-center gap-1.5 text-xs tracking-[0.14em]"
                      style={{ color: BLUEGRAY }}
                    >
                      <MapPin size={13} />
                      {c.showcase_neighborhood || 'San Francisco'}
                    </div>
                    <div className="mp-serif mt-2 text-xl" style={{ color: NAVY }}>
                      {shortName(c.name)}
                    </div>
                    {c.showcase_catch && (
                      <p
                        className="mp-serif mt-4 text-[15px] italic leading-snug"
                        style={{ color: INK }}
                      >
                        &ldquo;{c.showcase_catch}&rdquo;
                      </p>
                    )}
                    {c.showcase_blurb && (
                      <p className="mt-3 flex-1 text-[13.5px] leading-relaxed" style={{ color: '#5c6470' }}>
                        {c.showcase_blurb}
                      </p>
                    )}
                    <div
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: ROYAL }}
                    >
                      View the CMA <ArrowUpRight size={16} />
                    </div>
                  </Link>
                </Reveal>
              ))}
        </div>
      </section>

      {/* DISCLOSURE SHOWCASE (GATED) */}
      <section className="mx-auto mt-16 max-w-6xl px-6 pb-8">
        <Reveal>
          <div className="mb-3 text-xs tracking-[0.28em]" style={{ color: BLUEGRAY }}>
            THE DISCLOSURE REVIEW SHOWCASE
          </div>
          <h2 className="mp-serif text-3xl md:text-4xl" style={{ color: NAVY }}>
            Every claim, a source.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">
            These reviews turn hundreds of pages of disclosures into a plain-English decision.
            {!signedIn && ' Create a free account to read the full reviews — no cost, no obligation.'}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl"
                  style={{ background: '#eceef2' }}
                />
              ))
            : teasers.map((t, i) => (
                <Reveal key={t.slug} delay={i * 0.05}>
                  <div
                    className="mp-lift flex h-full flex-col rounded-2xl p-7"
                    style={{ background: '#fff', boxShadow: '0 0 0 1px rgba(13,27,42,.08)' }}
                  >
                    <div
                      className="flex items-center gap-1.5 text-xs tracking-[0.14em]"
                      style={{ color: BLUEGRAY }}
                    >
                      <MapPin size={13} />
                      {t.showcase_neighborhood || 'San Francisco'}
                    </div>
                    <div className="mp-serif mt-2 text-xl" style={{ color: NAVY }}>
                      {shortName(t.name)}
                    </div>
                    {t.showcase_catch && (
                      <p
                        className="mp-serif mt-4 text-[15px] italic leading-snug"
                        style={{ color: INK }}
                      >
                        &ldquo;{t.showcase_catch}&rdquo;
                      </p>
                    )}
                    {t.showcase_blurb && (
                      <p className="mt-3 flex-1 text-[13.5px] leading-relaxed" style={{ color: '#5c6470' }}>
                        {t.showcase_blurb}
                      </p>
                    )}
                    {signedIn ? (
                      <Link
                        to={`/cma-review/disclosure/${t.slug}`}
                        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium"
                        style={{ color: ROYAL }}
                      >
                        <FileText size={16} /> Read the review
                      </Link>
                    ) : (
                      <Link
                        to={`/join?next=/cma-review/disclosure/${t.slug}`}
                        className="mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium tracking-[0.08em]"
                        style={{ background: NAVY, color: '#fff' }}
                      >
                        <Lock size={13} /> Create a free account to read
                      </Link>
                    )}
                  </div>
                </Reveal>
              ))}
        </div>
      </section>

      {/* CANDOR BAND */}
      <section className="mt-20" style={{ background: NAVY_DEEP }}>
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Reveal>
            <Quote size={30} style={{ color: BLUEGRAY }} className="mx-auto" />
            <p
              className="mp-serif mt-5 text-white"
              style={{ fontSize: 'clamp(24px,3.4vw,38px)', lineHeight: 1.25 }}
            >
              We name the negatives plainly. That&rsquo;s the point.
            </p>
            <p className="mx-auto mt-5 max-w-xl text-[15px]" style={{ color: '#aeb8c8' }}>
              A CMA that only flatters is useless; a disclosure summary that buries the bad
              news is dangerous. Our buyers move fast <em>because</em> they trust nothing&rsquo;s
              hidden. Green is reserved for genuine positives; flags are called what they are.
            </p>
          </Reveal>
        </div>
      </section>

      {/* PROOF BAND */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { n: cmas.length + teasers.length, suffix: '+', label: 'Analyses published' },
            { raw: '400', label: 'Pages read per package' },
            { n: 6, label: 'Micro-markets covered' },
            { raw: '$0', label: 'Cost to our buyers' },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.06} className="text-center">
              <div className="mp-serif text-4xl md:text-5xl" style={{ color: NAVY }}>
                {s.raw ? (
                  <CountUp raw={s.raw} />
                ) : (
                  <CountUp value={s.n} suffix={s.suffix || ''} />
                )}
              </div>
              <div className="mp-mono mt-2 text-[11px] tracking-[0.16em]" style={{ color: BLUEGRAY }}>
                {s.label.toUpperCase()}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div
            className="rounded-3xl px-8 py-16 text-center"
            style={{ background: NAVY }}
          >
            <h2
              className="mp-serif text-white"
              style={{ fontSize: 'clamp(26px,3.6vw,42px)', lineHeight: 1.12 }}
            >
              Thinking about buying? Get this for your next offer.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px]" style={{ color: '#cfd6e2' }}>
              Every buyer we represent gets a full CMA and disclosure review at no cost.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <PillButton href="https://wa.me/14156919272" onDark>
                Message Tim on WhatsApp
              </PillButton>
              <PillButton href="/services/disclosure-review" variant="secondary" onDark>
                How the review works
              </PillButton>
            </div>
          </div>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  )
}
