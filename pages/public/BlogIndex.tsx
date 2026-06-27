// McMullen Properties — public blog index.
// Route: "/blog" (no auth). Reads published posts from public.blog_posts
// (anon-readable). Matches the portfolio/homepage aesthetic.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LogoWordmark } from '@/components/BrandLogo'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'

type ImageJson = { url: string; alt: string | null } | null

type PostRow = {
  slug: string
  name: string
  card_description: string | null
  image: ImageJson
  publish_date: string | null
  tags_array: string[] | null
  author_name: string | null
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const [rows, setRows] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tag, setTag] = useState<string>('All')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, name, card_description, image, publish_date, tags_array, author_name')
        .eq('is_published', true)
        .eq('is_archived', false)
        .order('publish_date', { ascending: false, nullsFirst: false })
      if (cancelled) return
      setRows((data as PostRow[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) for (const t of r.tags_array ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
    // most-used tags first, cap to keep the filter row tidy
    const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 8)
    return ['All', ...ordered]
  }, [rows])

  const visible = useMemo(
    () => (tag === 'All' ? rows : rows.filter((r) => (r.tags_array ?? []).includes(tag))),
    [rows, tag]
  )

  const [featured, ...rest] = visible

  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
      `}</style>

      {/* header */}
      <PublicNav active="insight" />

      {/* intro */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-20 pb-8">
        <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">Market Insight</div>
        <h1 className="text-[40px] md:text-[56px] leading-[1.05] font-semibold tracking-tight">
          Notes from the <span className="mp-serif font-normal">market.</span>
        </h1>
        <p className="text-[#273C46] text-lg mt-4 max-w-xl leading-relaxed">
          Columns, market reads, and strategy — how high-end homes actually get sold, and what
          it means for buyers and sellers across the Bay Area and beyond.
        </p>

        {/* tag filter */}
        {tags.length > 1 ? (
          <div className="flex flex-wrap gap-2 mt-8">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={
                  'px-3 py-1.5 text-2xs uppercase tracking-widest border rounded-full transition-colors ' +
                  (t === tag
                    ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                    : 'bg-white text-[#273C46] border-black/[0.12] hover:border-[#0D1B2A]/40')
                }
              >
                {t}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {/* content */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="py-24 text-center mp-mono text-xs uppercase tracking-[0.25em] text-[#273C46]">
            Loading…
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center text-[#273C46]">No posts yet.</div>
        ) : (
          <>
            {/* featured (newest) */}
            {featured ? (
              <Link
                to={`/blog/${featured.slug}`}
                className="group grid md:grid-cols-2 gap-8 mb-14 rounded-[24px] overflow-hidden border border-black/[0.07] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(13,27,42,0.4)]"
              >
                <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden bg-[#FAFAF7]">
                  {featured.image?.url ? (
                    <img
                      src={featured.image.url}
                      alt={featured.image.alt ?? featured.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="mp-mono text-[11px] uppercase tracking-[0.16em] text-[#273C46] mb-3">
                    {fmtDate(featured.publish_date)}
                    {(featured.tags_array ?? []).length ? ' · ' + (featured.tags_array ?? [])[0] : ''}
                  </div>
                  <h2 className="mp-serif not-italic text-3xl md:text-4xl font-semibold leading-tight text-[#0D1B2A]">
                    {featured.name}
                  </h2>
                  {featured.card_description ? (
                    <p className="text-[#273C46] mt-4 leading-relaxed line-clamp-3">
                      {featured.card_description}
                    </p>
                  ) : null}
                  <span className="mp-mono text-[11px] uppercase tracking-[0.16em] text-[#0D1B2A] mt-5 inline-flex items-center gap-1">
                    Read →
                  </span>
                </div>
              </Link>
            ) : null}

            {/* the rest */}
            {rest.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="group block rounded-[20px] overflow-hidden border border-black/[0.07] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(13,27,42,0.35)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#FAFAF7]">
                      {p.image?.url ? (
                        <img
                          src={p.image.url}
                          alt={p.image.alt ?? p.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </div>
                    <div className="p-6">
                      <div className="mp-mono text-[10px] uppercase tracking-[0.14em] text-[#273C46] mb-2">
                        {fmtDate(p.publish_date)}
                        {(p.tags_array ?? []).length ? ' · ' + (p.tags_array ?? [])[0] : ''}
                      </div>
                      <div className="mp-serif not-italic text-xl font-semibold leading-snug text-[#0D1B2A]">
                        {p.name}
                      </div>
                      {p.card_description ? (
                        <p className="text-sm text-[#273C46] mt-2 leading-relaxed line-clamp-2">
                          {p.card_description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* footer */}
      <PublicFooter />
    </div>
  )
}
