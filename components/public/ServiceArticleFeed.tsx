// ServiceArticleFeed — a reusable block for service pages.
//
// Given a service slug, it fetches that service's feature articles from
// blog_posts (matched on the namespaced `service:<slug>` tag), newest-first,
// and renders them as linked cards to /blog/<slug>. Renders NOTHING when a
// service has no articles yet, so it's safe to drop into all six service pages
// immediately — the feed simply appears once the first article is published.

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { serviceBySlug } from '@/lib/condoMarket'
import { Reveal, NAVY, INK, LOGO_BLUE } from '@/components/public/motion'
import { ArrowRight, Newspaper } from 'lucide-react'

type ArticleCard = {
  slug: string
  name: string
  card_description: string | null
  image: { alt?: string; url?: string } | null
  publish_date: string | null
}

function imgUrl(image: ArticleCard['image']): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  return image.url ?? null
}

export default function ServiceArticleFeed({
  serviceSlug,
  heading = 'Related reading',
  limit = 6,
}: {
  // Optional — if omitted, the feed resolves the service from the current route
  // (/services/<slug>), so a service page can drop in <ServiceArticleFeed />
  // with no props and it self-locates.
  serviceSlug?: string
  heading?: string
  limit?: number
}) {
  const location = useLocation()
  const routeSlug = location.pathname.split('/').filter(Boolean).pop() ?? ''
  const svc = serviceBySlug(serviceSlug ?? routeSlug)
  const [posts, setPosts] = useState<ArticleCard[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!svc) { setLoaded(true); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, name, card_description, image, publish_date')
        .eq('is_published', true)
        .neq('is_archived', true)
        .contains('tags_array', [svc.tag])
        .order('publish_date', { ascending: false, nullsFirst: false })
        .limit(limit)
      if (cancelled) return
      setPosts((data as ArticleCard[]) ?? [])
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [svc, limit])

  // Nothing to show yet — render nothing so the page stays clean pre-content.
  if (!loaded || !svc || posts.length === 0) return null

  return (
    <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
      <Reveal>
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="w-4 h-4" style={{ color: LOGO_BLUE }} />
          <span className="mp-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: LOGO_BLUE }}>{heading}</span>
        </div>
        <h2 className="mp-serif text-[26px] md:text-[36px] leading-[1.08] font-semibold" style={{ color: NAVY }}>
          More on {svc.name.toLowerCase()}.
        </h2>
      </Reveal>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {posts.map((p, i) => {
          const url = imgUrl(p.image)
          return (
            <Reveal key={p.slug} delay={0.05 * i}>
              <Link to={`/blog/${p.slug}`} className="mp-lift block rounded-[22px] border border-black/[0.07] bg-white overflow-hidden h-full">
                <div className="h-44 overflow-hidden bg-[#f4f7fb]">
                  {url ? (
                    <img src={url} alt={p.image?.alt || p.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-8 h-8" style={{ color: 'rgba(79,130,185,0.35)' }} />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  {p.publish_date ? (
                    <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: LOGO_BLUE }}>
                      {new Date(p.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  ) : null}
                  <h3 className="mp-serif text-xl font-semibold leading-snug" style={{ color: NAVY }}>{p.name}</h3>
                  {p.card_description ? (
                    <p className="text-sm mt-2 leading-relaxed line-clamp-3" style={{ color: INK }}>{p.card_description}</p>
                  ) : null}
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium mt-4" style={{ color: LOGO_BLUE }}>
                    Read article <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
