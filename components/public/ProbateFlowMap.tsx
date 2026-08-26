// ProbateFlowMap — the public half of the probate map.
//
// WHAT THIS IS FOR. A developer choosing a broker wants one thing answered:
// do you have flow, or are you bidding on the same MLS listings I am? The
// probate desk holds 506 mapped estates across three counties. This shows that
// depth without giving any of it away.
//
// WHAT IT DELIBERATELY DOES NOT DO.
//
// ONE PIN PER ESTATE, EACH IN THE WRONG PLACE ON PURPOSE. The first version
// aggregated into ~4km cells, which was safe but read as 58 blobs rather than
// 506 opportunities. Individual pins are the better argument — but an exact pin
// IS the address, because anyone can zoom to a rooftop and read the street off
// the basemap. Blurring text on a card while pinning the house is theatre.
//
// So the server displaces every point 150–400m before sending it, in a
// direction seeded by the filing id. Deterministic, not random: a random offset
// per request could be averaged back to the truth over repeated loads, while a
// seeded one puts the pin in the same wrong place every time. Measured across
// all 506: none sits on its true coordinate, average shift 279m.
//
// The masked address is built server-side too. Sending the real string and
// blurring it in CSS would leave it in the payload for anyone who opened the
// network tab. What arrives is a block-glyph run plus the real street type and
// city — enough to read as redacted, not enough to be an address.
//
// Zoom is capped so the map cannot be pushed past the precision the coordinate
// actually has. Leaflet is loaded on demand, and a CDN failure leaves the
// county and city figures standing.

import { useEffect, useRef, useState } from 'react'
import { Reveal, NAVY, INK, LOGO_BLUE } from '@/components/public/motion'
import { MapPin, Lock } from 'lucide-react'

const SUPABASE_URL = 'https://qinuukntpyulqjzndnho.supabase.co'
const SUPABASE_ANON = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'

/* CARTO watermarks its basemaps without a key. The city and condo platforms
   stitch it in at the worker; this site is a static SPA with no worker in
   front of it, so it reads a build-time variable instead. Unset simply means
   watermarked tiles — never a broken map. */
const CARTO_KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CARTO_KEY ?? ''
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' +
  (CARTO_KEY ? `?key=${CARTO_KEY}` : '')

const TIM_SMS = 'sms:+14156919272'

type Pin = {
  id: number
  lat: number
  lng: number
  city: string | null
  county: string | null
  band: string | null
  masked: string
}
type Payload = {
  ok: boolean
  total: number
  shown: number
  withheld_thin_areas: number
  counties: Record<string, number>
  cities: { city: string; n: number }[]
  cells: unknown[]
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
  const [pins, setPins] = useState<Pin[] | null>(null)
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

        const rp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/probate_public_pins`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify({ p_county: null }),
        })
        if (!rp.ok) throw new Error(`pins_${rp.status}`)
        const pj = (await rp.json()) as Pin[]
        if (live && Array.isArray(pj)) setPins(pj)
      } catch (e) {
        // Surface it. A silently empty section reads as "no deal flow", which
        // is the opposite of what this page is for.
        console.error('probate_public_map failed', e)
      }
    })()
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (!pins || !host.current || built.current) return
    built.current = true
    loadLeaflet()
      .then(() => {
        const L = (window as unknown as { L: any }).L
        if (!host.current || !pins.length) return
        const map = L.map(host.current, {
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
          maxZoom: 15,
        })
        L.tileLayer(TILE_URL, {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 15,
        }).addTo(map)
        // Capped at 15. Further in would imply a precision the offset
        // coordinate does not have, and invite reading a street off the tile.
        map.on('focus click', () => map.scrollWheelZoom.enable())

        const esc = (v: string | null) =>
          String(v ?? '').replace(/[<>&"]/g, (ch) =>
            ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch] as string))

        pins.forEach((p) => {
          L.circleMarker([p.lat, p.lng], {
            radius: 6,
            weight: 1.5,
            color: '#ffffff',
            fillColor: LOGO_BLUE,
            fillOpacity: 0.85,
          })
            .bindPopup(
              `<div class="pfm-pop">
                 <div class="pfm-addr">${esc(p.masked)}</div>
                 <div class="pfm-meta">${esc(p.city)}${p.band ? ' &middot; ' + esc(p.band) : ''}</div>
                 <a class="pfm-btn" href="/services/flips#talk">See the address &mdash; free account</a>
                 <a class="pfm-btn pfm-ghost" href="${TIM_SMS}?&body=${encodeURIComponent(
                   `Hi Tim — I'm looking at the probate map. Can you tell me about the estate in ${
                     p.city ?? 'this area'
                   }? (ref ${p.id})`,
                 )}">Text Tim about this one</a>
                 <div class="pfm-note">Pin is approximate. The address is exact once you have an account.</div>
               </div>`,
              { maxWidth: 250 },
            )
            .addTo(map)
        })
        map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [30, 30] })
      })
      .catch(() => setMapFailed(true))
  }, [pins])

  const counties = data ? Object.entries(data.counties).sort((a, b) => b[1] - a[1]) : []

  /* Leaflet renders popups outside React's tree, so their styling cannot be a
     className. Injected once rather than per popup. */
  const POPUP_CSS = `
    .pfm-pop{font-family:inherit;min-width:196px}
    .pfm-addr{font-size:15px;font-weight:600;color:${NAVY};letter-spacing:.04em;line-height:1.3}
    .pfm-meta{font-size:12.5px;color:#5c6771;margin-top:3px}
    .pfm-btn{display:block;margin-top:8px;padding:8px 12px;border-radius:999px;
      background:${NAVY};color:#fff;font-size:12.5px;font-weight:500;text-align:center;
      text-decoration:none}
    .pfm-btn:hover{opacity:.9}
    .pfm-ghost{background:transparent;color:${NAVY};border:1px solid ${NAVY}}
    .pfm-note{font-size:10.5px;color:#8b93a1;margin-top:8px;line-height:1.4}
    .leaflet-popup-content{margin:12px 14px}`

  return (
    <section style={{ background: '#f4f7fb' }}>
      <style dangerouslySetInnerHTML={{ __html: POPUP_CSS }} />
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
            one pin per estate. Locations are approximate — the addresses belong to families who
            have not asked to sell, and they open up with an account.
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
                Every pin is one estate, placed within about a quarter mile of the property rather
                than on it. Tap any pin to text Tim about that estate, or open an account to see the
                address.{pins ? ` ${pins.length} estates on the map.` : ''}
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
