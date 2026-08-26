// ProbateFlowMap — the public half of the probate map.
//
// WHAT THIS IS FOR. A developer choosing a broker wants one thing answered:
// do you have flow, or are you bidding on the same MLS listings I am? The
// probate desk holds 506 mapped estates across three counties. This shows that
// depth without giving any of it away.
//
// WHAT IT DELIBERATELY DOES NOT DO.
//
// It does not blur pins in CSS. That is not blurring — the real coordinate
// would still sit in the payload for anyone who opened the network tab. The
// server snaps every point to a ~4km grid BEFORE it is sent, and the snapped
// value is the only one this component ever receives. There is no address, no
// petitioner, no contact and no AVM figure in the response.
//
// It does not draw a cell holding fewer than three estates. One filing alone in
// one district is an address whatever the grid, because it is findable in the
// public court index in minutes. Those are dropped server-side and the count of
// what was dropped is reported on the page rather than hidden — the honest
// version of "506 estates" is "442 of 506 shown, the rest are too sparse to
// place without identifying them."
//
// Leaflet is loaded on demand, and a CDN failure leaves the county and city
// figures standing. The numbers are the argument; the map is how it is felt.

import { useEffect, useRef, useState } from 'react'
import { Reveal, NAVY, INK, LOGO_BLUE } from '@/components/public/motion'
import { MapPin, Lock } from 'lucide-react'

const SUPABASE_URL = 'https://qinuukntpyulqjzndnho.supabase.co'
const SUPABASE_ANON = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'

type Cell = { lat: number; lng: number; n: number; city: string | null; band: string | null }
type Payload = {
  ok: boolean
  total: number
  shown: number
  withheld_thin_areas: number
  counties: Record<string, number>
  cities: { city: string; n: number }[]
  cells: Cell[]
}

function loadLeaflet(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { L?: unknown }
    if (w.L) return resolve()
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      link.setAttribute('data-leaflet', '1')
      document.head.appendChild(link)
    }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('leaflet_cdn_failed'))
    document.head.appendChild(s)
  })
}

export default function ProbateFlowMap() {
  const [data, setData] = useState<Payload | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const host = useRef<HTMLDivElement | null>(null)
  const built = useRef(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/probate_public_map`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify({ p_county: null }),
        })
        if (!r.ok) throw new Error(`rpc_${r.status}`)
        const j = (await r.json()) as Payload
        if (live && j?.ok) setData(j)
      } catch (e) {
        // Surface it. A silently empty section reads as "no deal flow", which
        // is the opposite of what this page is for.
        console.error('probate_public_map failed', e)
      }
    })()
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (!data || !host.current || built.current) return
    built.current = true
    loadLeaflet()
      .then(() => {
        const L = (window as unknown as { L: any }).L
        if (!host.current || !data.cells.length) return
        const map = L.map(host.current, {
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
        })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 14,
        }).addTo(map)
        // Capped at 14: zooming further would imply a precision the snapped
        // coordinate does not have.
        map.on('focus click', () => map.scrollWheelZoom.enable())

        const max = data.cells.reduce((a, c) => Math.max(a, c.n), 1)
        data.cells.forEach((c) => {
          const w = c.n / max
          L.circleMarker([c.lat, c.lng], {
            radius: 9 + Math.round(w * 20),
            stroke: false,
            fillColor: LOGO_BLUE,
            fillOpacity: 0.2 + w * 0.4,
          })
            .bindPopup(
              `<div style="font-family:inherit;min-width:150px">
                 <b style="display:block;font-size:.95rem">${c.n} estates</b>
                 <span style="display:block;font-size:.8rem;color:#5c6771">${
                   c.city ? String(c.city).replace(/[<>&]/g, '') : 'This area'
                 }${c.band ? ' &middot; typically ' + c.band : ''}</span>
                 <span style="display:block;font-size:.72rem;color:#8b93a1;margin-top:6px">
                   Approximate area, not addresses</span>
               </div>`,
            )
            .addTo(map)
        })
        map.fitBounds(L.latLngBounds(data.cells.map((c) => [c.lat, c.lng])), { padding: [30, 30] })
      })
      .catch(() => setMapFailed(true))
  }, [data])

  const counties = data ? Object.entries(data.counties).sort((a, b) => b[1] - a[1]) : []

  return (
    <section style={{ background: '#f4f7fb' }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: LOGO_BLUE }}>
            The estate pipeline
          </div>
          <h2
            className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold"
            style={{ color: NAVY }}
          >
            {data ? `${data.total} estates, tracked daily.` : 'Estates, tracked daily.'}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-2xl" style={{ color: INK }}>
            Every probate filing across Santa Clara, San Mateo and San Francisco, mapped and followed
            from the day it is filed. Most never reach the MLS. This is the flow behind the deals —
            shown as areas, because the addresses belong to families who have not asked to sell.
          </p>
        </Reveal>

        {counties.length > 0 && (
          <Reveal delay={0.08}>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-2xl">
              {counties.map(([name, n]) => (
                <div key={name} className="rounded-2xl bg-white border border-black/[0.07] px-5 py-4">
                  <div className="mp-mono text-[26px] leading-none font-semibold" style={{ color: NAVY }}>
                    {n}
                  </div>
                  <div className="text-[13px] mt-2" style={{ color: INK }}>
                    {name}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal delay={0.14}>
          <div className="mt-8 rounded-[24px] overflow-hidden border border-black/[0.07] bg-white">
            {mapFailed ? (
              <p className="px-6 py-10 text-sm" style={{ color: INK }}>
                The map could not load, but the figures above are complete.
              </p>
            ) : (
              <div ref={host} style={{ height: 440 }} aria-label="Approximate areas of probate estates" />
            )}
            <div
              className="px-5 py-3 text-[12.5px] border-t border-black/[0.07] flex items-start gap-2"
              style={{ color: '#5c6771' }}
            >
              <MapPin className="w-4 h-4 mt-[1px] shrink-0" style={{ color: LOGO_BLUE }} />
              <span>
                Circles are approximate areas of roughly two and a half miles, never addresses.
                {data
                  ? ` ${data.shown} of ${data.total} are shown; ${data.withheld_thin_areas} sit in areas too sparse to place without identifying the property.`
                  : ''}
              </span>
            </div>
          </div>
        </Reveal>

        {data && data.cities.length > 0 && (
          <Reveal delay={0.2}>
            <div className="mt-8 flex flex-wrap gap-2">
              {data.cities.map((c) => (
                <span
                  key={c.city}
                  className="rounded-full bg-white border border-black/[0.07] px-4 py-2 text-[13px]"
                  style={{ color: INK }}
                >
                  {c.city} <span style={{ color: LOGO_BLUE }}>{c.n}</span>
                </span>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal delay={0.26}>
          <div className="mt-10 rounded-[24px] bg-white border border-black/[0.07] p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(79,130,185,0.12)' }}
              >
                <Lock className="w-5 h-5" style={{ color: LOGO_BLUE }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>
                  Clients see the addresses
                </h3>
                <p className="text-[15px] mt-3 leading-relaxed max-w-2xl" style={{ color: INK }}>
                  With an account you get the map at address level: where each estate is, when it was
                  filed, how far through probate it has moved, and whether the property is still
                  available. If one is worth a closer look, I approach the estate — properly, as the
                  listing side — and you get the first conversation.
                </p>
                <p className="text-[13.5px] mt-4 leading-relaxed" style={{ color: '#5c6771' }}>
                  I do not hand over petitioner contact details. These are families settling an
                  estate, and the approach is mine to make.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/services/flips#talk"
                    className="inline-flex items-center rounded-full px-6 py-3 text-[15px] font-medium text-white"
                    style={{ background: NAVY }}
                  >
                    Get access
                  </a>
                  <a
                    href="/services/probate"
                    className="inline-flex items-center rounded-full px-6 py-3 text-[15px] font-medium border"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    How the probate desk works
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
