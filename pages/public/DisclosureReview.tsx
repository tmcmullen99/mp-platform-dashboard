// /cma-review/disclosure/:slug — the GATED disclosure review viewer.
//
// This is the lead-magnet payoff. Access rules, enforced top to bottom:
//   • Signed-out visitor  → bounced to /join?next=<this url> (create account).
//   • Signed-in visitor   → RLS returns the row (authenticated showcase policy),
//                            we mint a short-lived signed URL for the private
//                            PDF in the 'disclosure-reviews' bucket and embed it.
// Anonymous users can never reach the PDF: the review_pdf_url column is revoked
// from anon at the DB level, and the storage bucket is private.

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { NAVY, BLUEGRAY, INK } from '@/components/public/motion'
import { ChevronLeft, Loader2, Download, Lock } from 'lucide-react'

type DiscRow = {
  name: string
  property_address: string | null
  showcase_neighborhood: string | null
  review_pdf_url: string | null
  review_html: string | null
}

export default function DisclosureReview() {
  const { slug } = useParams<{ slug: string }>()
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [row, setRow] = useState<DiscRow | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Gate: no session → send to signup, remembering where to return.
  useEffect(() => {
    if (authLoading) return
    if (!session) {
      navigate(`/join?next=/cma-review/disclosure/${slug}`, { replace: true })
    }
  }, [session, authLoading, slug, navigate])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug || !session) return
      const { data, error: e } = await supabase
        .from('disclosure_reviews')
        .select('name,property_address,showcase_neighborhood,review_pdf_url,review_html')
        .eq('slug', slug)
        .eq('visibility', 'public_showcase')
        .eq('status', 'published')
        .maybeSingle()
      if (cancelled) return
      if (e || !data) {
        setError('This review isn’t available.')
        setLoading(false)
        return
      }
      setRow(data as DiscRow)
      // Mint a signed URL (10 min) for the private PDF.
      if (data.review_pdf_url) {
        const { data: signed } = await supabase.storage
          .from('disclosure-reviews')
          .createSignedUrl(data.review_pdf_url, 600)
        if (!cancelled && signed?.signedUrl) setPdfUrl(signed.signedUrl)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug, session])

  if (authLoading || (!session && !error)) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: '#faf7f1' }}>
        <Loader2 className="animate-spin" style={{ color: BLUEGRAY }} />
      </div>
    )
  }

  return (
    <div style={{ background: '#faf7f1', minHeight: '100vh' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(250,247,241,.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(13,27,42,.10)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link
            to="/cma-review"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: NAVY }}
          >
            <ChevronLeft size={16} /> All analyses
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs tracking-[0.14em]" style={{ color: BLUEGRAY }}>
            <Lock size={12} /> DISCLOSURE REVIEW
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-40">
          <Loader2 className="animate-spin" style={{ color: BLUEGRAY }} />
        </div>
      )}

      {error && !loading && (
        <div className="mx-auto max-w-xl px-6 py-40 text-center">
          <h1 className="mp-serif text-3xl" style={{ color: NAVY }}>
            {error}
          </h1>
          <Link
            to="/cma-review"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-medium"
            style={{ background: NAVY, color: '#fff' }}
          >
            <ChevronLeft size={16} /> Back to the showcase
          </Link>
        </div>
      )}

      {row && !loading && (
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-6">
            <div className="text-xs tracking-[0.16em]" style={{ color: BLUEGRAY }}>
              {(row.showcase_neighborhood || '').toUpperCase()}
            </div>
            <h1 className="mp-serif mt-1 text-3xl" style={{ color: NAVY }}>
              {row.name.replace(/\s*[—-]\s*Disclosure Review.*$/i, '')}
            </h1>
            {row.property_address && (
              <p className="mt-1 text-[15px]" style={{ color: INK }}>
                {row.property_address}
              </p>
            )}
          </div>

          {/* Inline HTML review (if present) takes precedence; else the PDF. */}
          {row.review_html ? (
            <iframe
              title={row.name}
              srcDoc={row.review_html}
              sandbox="allow-scripts allow-popups"
              style={{ width: '100%', minHeight: '80vh', border: 'none', borderRadius: 12 }}
            />
          ) : pdfUrl ? (
            <>
              <div className="mb-3 flex justify-end">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium"
                  style={{ background: NAVY, color: '#fff' }}
                >
                  <Download size={15} /> Open / download PDF
                </a>
              </div>
              <iframe
                title={row.name}
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: '85vh',
                  border: '1px solid rgba(13,27,42,.12)',
                  borderRadius: 12,
                  background: '#fff',
                }}
              />
            </>
          ) : (
            <div className="py-20 text-center" style={{ color: '#5c6470' }}>
              Preparing the document…
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed" style={{ color: '#8a92a0' }}>
            This review is a summary prepared to inform a buyer&rsquo;s diligence; it is not a
            substitute for the full disclosure package or a professional inspection. McMullen
            Properties LLC, under Real Broker · CA DRE #02016832.
          </p>
        </div>
      )}
    </div>
  )
}
