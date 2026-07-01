// Human-facing + AIO sitemap hub. A clean, crawlable index of every public
// section of the site — strong internal-linking signal for SEO and a tidy map
// for AI assistants. The machine-readable sitemap.xml is served separately by
// the Supabase edge function (routed at /sitemap.xml).

import { PublicNav, PublicFooter, FOOTER_COLUMNS } from '@/components/public/PublicNav'
import { MotionStyles, Reveal, ParallaxHero, PillButton, NAVY, INK } from '@/components/public/motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Map } from 'lucide-react'

const SECTIONS: { heading: string; links: { to: string; label: string }[] }[] = [
  {
    heading: 'Main',
    links: [
      { to: '/home', label: 'Home' },
      { to: '/listings', label: 'Portfolio' },
      { to: '/luxury-listings', label: 'Luxury Listings' },
      { to: '/buy', label: 'Buy' },
      { to: '/sell', label: 'Sell' },
      { to: '/services', label: 'Services' },
      { to: '/meet-tim', label: 'Meet Tim' },
      { to: '/blog', label: 'Market Insight' },
      { to: '/join', label: 'Create Account' },
    ],
  },
  ...FOOTER_COLUMNS.filter((c) => c.heading !== 'Explore'),
]

export default function Sitemap() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav />

      <ParallaxHero minH="46vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6 flex items-center gap-2" style={{ color: '#91a1ba', animationDelay: '0.1s' }}>
              <Map className="w-4 h-4" /> Sitemap
            </div>
            <h1 className="mp-anim mp-serif text-white text-[40px] md:text-[56px] leading-[1.05] font-semibold" style={{ animationDelay: '0.2s' }}>
              Every corner of the site.
            </h1>
            <p className="mp-anim text-lg mt-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', animationDelay: '0.35s', maxWidth: '600px' }}>
              A complete map of McMullen Properties — services, tools, listings, and market insight.
              Looking for the machine-readable version? It lives at
              {' '}<a href="/sitemap.xml" className="underline hover:opacity-80">sitemap.xml</a>.
            </p>
          </div>
        </div>
      </ParallaxHero>

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((sec, i) => (
            <Reveal key={sec.heading} delay={0.05 * i}>
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-5" style={{ color: NAVY }}>
                  {sec.heading}
                </h2>
                <ul className="flex flex-col gap-3 text-[15px]">
                  {sec.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="hover:opacity-60 transition-opacity" style={{ color: INK }}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-16 pt-10 border-t border-black/[0.08]">
            <p className="text-[15px] leading-relaxed max-w-2xl" style={{ color: INK }}>
              Every property listing and every article in Market Insight has its own page, all
              included in the <a href="/sitemap.xml" className="underline hover:opacity-70" style={{ color: NAVY }}>XML sitemap</a> for
              search engines. Browse the <Link to="/listings" className="underline hover:opacity-70" style={{ color: NAVY }}>full portfolio</Link> or
              the <Link to="/blog" className="underline hover:opacity-70" style={{ color: NAVY }}>latest market insight</Link>.
            </p>
            <div className="mt-8">
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36">
                Schedule a video call with Tim <ArrowUpRight className="w-4 h-4" />
              </PillButton>
            </div>
          </div>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  )
}
