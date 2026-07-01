// Reusable McMullen Commercial track-record showcase.
//
// Single source of truth for the commercial deals: reads published rows from
// public.commercial_deals (anon-readable). Renders each closing as a
// residential-style listing card. Used on the dedicated /commercial service
// page AND inline on the 1031 page — same data, no duplication. Editing a deal
// is a database row change, never a code change.
//
// Props let each host page set its own eyebrow/heading/intro and choose a
// light or dark surface, so the component fits different section backgrounds.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Reveal, NAVY, INK } from '@/components/public/motion'
import { Building2, MapPin } from 'lucide-react'

const EMERALD = '#3f7d5a'
const MCMULLEN_TENANT_ID = 'e0c8abe7-cc29-45c0-99c1-7c20b920262a'

export type CommercialDeal = {
  id: string
  address: string
  city: string
  property_type: string
  role: string
  status: string
  year: string | null
  price_display: string
  blurb: string | null
  image_url: string | null
  source_url: string | null
}

function DealCard({ d, i }: { d: CommercialDeal; i: number }) {
  return (
    <Reveal delay={0.08 * i}>
      <div className="mp-lift rounded-[24px] overflow-hidden bg-white border border-black/[0.07] h-full">
        {/* image band — real photo if present, else tasteful industrial gradient */}
        <div
          className="relative h-44"
          style={
            d.image_url
              ? { backgroundImage: `url(${d.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: 'linear-gradient(135deg, #223449 0%, #16283c 60%, #0f1c2c 100%)' }
          }
        >
          {!d.image_url ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-12 h-12" style={{ color: 'rgba(143,211,182,0.4)' }} />
            </div>
          ) : null}
          <div
            className="absolute top-4 left-4 mp-mono text-[10px] uppercase tracking-[0.16em] px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(63,125,90,0.92)', color: '#fff' }}
          >
            {d.status}{d.year ? ` · ${d.year}` : ''}
          </div>
          <div
            className="absolute bottom-4 right-4 mp-mono text-[10px] uppercase tracking-[0.16em] px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}
          >
            {d.property_type}
          </div>
        </div>

        <div className="p-7">
          <h3 className="mp-serif text-2xl font-semibold" style={{ color: NAVY }}>{d.address}</h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-sm" style={{ color: INK }}>
            <MapPin className="w-3.5 h-3.5" style={{ color: EMERALD }} />
            {d.city}
          </div>

          <div className="h-px my-5" style={{ background: 'rgba(13,27,42,0.08)' }} />

          <div className="flex items-center justify-between">
            <div>
              <div className="mp-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: INK }}>Role</div>
              <div className="text-sm font-semibold mt-0.5" style={{ color: NAVY }}>{d.role}</div>
            </div>
            <div className="text-right">
              <div className="mp-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: INK }}>Price</div>
              <div className="text-sm font-semibold mt-0.5" style={{ color: NAVY }}>{d.price_display}</div>
            </div>
          </div>

          {d.blurb ? <p className="text-sm mt-5 leading-relaxed" style={{ color: INK }}>{d.blurb}</p> : null}
        </div>
      </div>
    </Reveal>
  )
}

export default function CommercialShowcase({
  eyebrow = 'McMullen Commercial',
  heading = 'This isn\u2019t theory. It\u2019s already the work.',
  intro = 'Commercial real estate is a dedicated arm of the practice \u2014 McMullen Commercial \u2014 representing buyers acquiring income-producing industrial and commercial assets. A few recent closings:',
  surface = 'light',
}: {
  eyebrow?: string
  heading?: string
  intro?: string
  surface?: 'light' | 'plain'
}) {
  const [deals, setDeals] = useState<CommercialDeal[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('commercial_deals')
        .select('id,address,city,property_type,role,status,year,price_display,blurb,image_url,source_url')
        .eq('tenant_id', MCMULLEN_TENANT_ID)
        .eq('published', true)
        .order('sort_order', { ascending: true })
      if (cancelled) return
      setDeals((data as CommercialDeal[]) ?? [])
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Nothing published yet — render nothing rather than an empty shell.
  if (loaded && deals.length === 0) return null

  return (
    <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <Reveal>
        <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
          {eyebrow}
        </div>
        <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
          {heading}
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed max-w-3xl" style={{ color: INK }}>
          {intro}
        </p>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-6 mt-12">
        {deals.map((d, i) => (
          <DealCard key={d.id} d={d} i={i} />
        ))}
      </div>
    </div>
  )
}
