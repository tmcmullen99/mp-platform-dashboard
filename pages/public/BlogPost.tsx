// McMullen Properties — public single blog post.
// Route: "/blog/:slug" (no auth). Reads one published post from
// public.blog_posts. Renders body_html (trusted, author-written / imported
// from Tim's own Webflow). Sets document title + meta description for SEO.

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LogoWordmark } from '@/components/BrandLogo'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'

type ImageJson = { url: string; alt: string | null } | null

type Post = {
  slug: string
  name: string
  card_description: string | null
  body_html: string | null
  image: ImageJson
  youtube_url: string | null
  publish_date: string | null
  meta_title: string | null
  meta_description: string | null
  tags_array: string[] | null
  author_name: string | null
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function youTubeId(url: string | null): string | null {
  if (!url) return null
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/) ||
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('blog_posts')
        .select(
          'slug, name, card_description, body_html, image, youtube_url, publish_date, meta_title, meta_description, tags_array, author_name'
        )
        .eq('slug', slug)
        .eq('is_published', true)
        .eq('is_archived', false)
        .maybeSingle()
      if (cancelled) return
      setPost((data as Post) ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // SEO: title + meta description while this post is mounted.
  useEffect(() => {
    if (!post) return
    const prevTitle = document.title
    document.title = post.meta_title || `${post.name} | McMullen Properties`
    setMeta('description', post.meta_description || post.card_description || '')
    return () => {
      document.title = prevTitle
    }
  }, [post])

  const ytId = post ? youTubeId(post.youtube_url) : null

  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
        .mp-prose { color: #273C46; font-size: 1.075rem; line-height: 1.8; }
        .mp-prose p { margin: 0 0 1.25em; }
        .mp-prose h2 { font-family: 'Playfair Display', Georgia, serif; color: #0D1B2A; font-size: 1.9rem; font-weight: 600; line-height: 1.2; margin: 2em 0 0.6em; }
        .mp-prose h3 { color: #0D1B2A; font-size: 1.35rem; font-weight: 600; margin: 1.6em 0 0.5em; }
        .mp-prose a { color: #4f82b9; text-decoration: underline; text-underline-offset: 2px; }
        .mp-prose a:hover { color: #0D1B2A; }
        .mp-prose ul, .mp-prose ol { margin: 0 0 1.25em; padding-left: 1.4em; }
        .mp-prose li { margin: 0.35em 0; }
        .mp-prose blockquote { border-left: 3px solid #91a1ba; padding-left: 1.2em; margin: 1.5em 0; font-style: italic; color: #0D1B2A; }
        .mp-prose img { border-radius: 14px; margin: 1.5em 0; max-width: 100%; height: auto; }
        .mp-prose strong { color: #0D1B2A; }
        .mp-prose hr { border: none; border-top: 1px solid rgba(13,27,42,0.1); margin: 2.5em 0; }
      `}</style>

      {/* header */}
      <PublicNav active="insight" />

      {loading ? (
        <div className="py-32 text-center mp-mono text-xs uppercase tracking-[0.25em] text-[#273C46]">
          Loading…
        </div>
      ) : !post ? (
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="mp-serif not-italic text-4xl font-semibold text-[#0D1B2A]">Post not found</h1>
          <p className="text-[#273C46] mt-4">
            This piece may have moved or been unpublished.
          </p>
          <Link
            to="/blog"
            className="inline-block mt-8 mp-mono text-xs uppercase tracking-[0.16em] text-[#0D1B2A] hover:opacity-70"
          >
            ← All writing
          </Link>
        </div>
      ) : (
        <article>
          {/* title block */}
          <div className="max-w-3xl mx-auto px-6 pt-14 md:pt-20">
            <Link
              to="/blog"
              className="mp-mono text-[11px] uppercase tracking-[0.16em] text-[#273C46] hover:text-[#0D1B2A]"
            >
              ← All writing
            </Link>
            <div className="mp-mono text-[11px] uppercase tracking-[0.16em] text-[#273C46] mt-8 mb-4 flex flex-wrap items-center gap-2">
              <span>{fmtDate(post.publish_date)}</span>
              {(post.tags_array ?? []).slice(0, 3).map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-[#0D1B2A]/[0.06]">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="text-[34px] md:text-[48px] leading-[1.08] font-semibold tracking-tight text-[#0D1B2A]">
              {post.name}
            </h1>
            {post.card_description ? (
              <p className="text-lg md:text-xl text-[#273C46] mt-5 leading-relaxed">
                {post.card_description}
              </p>
            ) : null}
            <div className="text-sm text-[#273C46] mt-6 pb-2">
              By {post.author_name || 'Tim McMullen'}
            </div>
          </div>

          {/* hero image */}
          {post.image?.url ? (
            <div className="max-w-4xl mx-auto px-6 mt-8">
              <div className="rounded-[24px] overflow-hidden bg-[#FAFAF7] aspect-[16/9]">
                <img
                  src={post.image.url}
                  alt={post.image.alt ?? post.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {/* body */}
          <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
            {post.body_html ? (
              <div className="mp-prose" dangerouslySetInnerHTML={{ __html: post.body_html }} />
            ) : (
              <p className="text-[#273C46]">{post.card_description}</p>
            )}

            {/* optional video */}
            {ytId ? (
              <div className="mt-10 rounded-[20px] overflow-hidden aspect-video bg-black">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={post.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null}
          </div>

          {/* CTA */}
          <div className="border-t border-black/[0.07]">
            <div className="max-w-3xl mx-auto px-6 py-14 text-center">
              <div className="mp-serif not-italic text-2xl md:text-3xl font-semibold text-[#0D1B2A]">
                Thinking about a move?
              </div>
              <p className="text-[#273C46] mt-3 max-w-md mx-auto">
                Whether you&rsquo;re buying, selling, or just want a read on the market — let&rsquo;s talk.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
                <a
                  href="tel:+14156919272"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-[#0D1B2A] text-white hover:opacity-90"
                >
                  (415) 691-9272
                </a>
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium border border-black/[0.12] text-[#0D1B2A] hover:border-[#0D1B2A]/40"
                >
                  More writing
                </Link>
              </div>
            </div>
          </div>
        </article>
      )}

      {/* footer */}
      <PublicFooter />
    </div>
  )
}
