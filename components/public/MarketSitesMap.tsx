// Meet Tim, My Team: every Local Market site on one map (Tim, 19 Nov 2026).
//
// - Leaflet from the CDN, with the same data-leaflet tags PortfolioMap and SFInvestorMap
//   use, so the library loads once whichever map mounts first. It loads only when the
//   map scrolls near the screen.
// - Esri dark gray tiles (standing rule: Esri, not Carto, which watermarks without a key).
// - Each pin is the Local Market mark (ring and dot, from the brokerage site's favicon). Pins
//   pop in one after another and pulse. Hover shows the name; a click opens that market's
//   site in a new tab. On a phone a tap opens a small card with the link instead.
// - The South Bay sites sit a few kilometres apart, so pins that would overlap are nudged
//   apart on screen, with a thin line back to the true spot. Zooming in re-spaces them.
// - Scroll-wheel zoom stays off until the map is clicked, so the page scrolls past it.

import { useEffect, useRef, useState } from 'react'

export type MarketSite = { name: string; county: string; url: string; lat: number; lng: number }

const AMBER = '#d99a4e'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletNS = any
let leafletP: Promise<void> | null = null

function loadLeaflet(): Promise<void> {
  const w = window as unknown as { L?: LeafletNS }
  if (!leafletP) {
    if (!document.querySelector('link[data-leaflet]')) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      l.setAttribute('data-leaflet', '1')
      document.head.appendChild(l)
    }
    leafletP = new Promise<void>((resolve, reject) => {
      if (w.L?.map) { resolve(); return }
      const existing = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('leaflet failed')))
        if (w.L?.map) resolve()
        return
      }
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.async = true
      s.setAttribute('data-leaflet', '1')
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('leaflet failed'))
      document.head.appendChild(s)
    }).catch((e) => { leafletP = null; throw e })
  }
  return leafletP
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// The Local Market mark on a dark disc so it reads on the map.
const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#0b0d12"/><circle cx="32" cy="32" r="19" fill="none" stroke="${AMBER}" stroke-width="5.5"/><circle cx="32" cy="32" r="8.25" fill="${AMBER}"/></svg>`

const CSS = `
.lm-map .leaflet-container{background:#1b1b1b;font-family:Inter,system-ui,sans-serif}
.lm-pin-wrap{background:none;border:0}
.lm-pin{position:relative;display:block;width:26px;height:26px;transform:scale(0);animation:lm-pop .55s cubic-bezier(.34,1.56,.64,1) var(--d) forwards;cursor:pointer}
.lm-pin svg{position:relative;z-index:1;display:block;width:100%;height:100%;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7));transition:transform .2s}
.lm-pin::before{content:'';position:absolute;inset:0;border-radius:50%;background:rgba(217,154,78,.5);opacity:0;animation:lm-pulse 2.4s ease-out calc(var(--d) + .6s) infinite}
.leaflet-marker-icon:hover .lm-pin svg,.leaflet-marker-icon:focus-visible .lm-pin svg{transform:scale(1.2)}
@keyframes lm-pop{to{transform:scale(1)}}
@keyframes lm-pulse{0%{transform:scale(1);opacity:.75}100%{transform:scale(2.7);opacity:0}}
.lm-tip{background:#0b0d12;border:1px solid rgba(255,255,255,.14);color:#fff;border-radius:10px;padding:6px 10px;box-shadow:0 8px 24px rgba(0,0,0,.5);font:500 12px/1.35 Inter,system-ui,sans-serif;white-space:nowrap}
.lm-tip b{display:block;font-weight:600}
.lm-tip span{display:block;color:rgba(255,255,255,.55);font-size:11px;font-weight:400}
.lm-tip.leaflet-tooltip-top::before{border-top-color:#0b0d12}
.lm-popup .leaflet-popup-content-wrapper{background:#0b0d12;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.lm-popup .leaflet-popup-tip{background:#0b0d12}
.lm-popup .leaflet-popup-content{margin:9px 13px}
.lm-pop{display:block;color:#fff!important;text-decoration:none;font:600 13px/1.35 Inter,system-ui,sans-serif}
.lm-pop span{display:block;color:rgba(255,255,255,.6);font-size:11px;font-weight:400;margin-top:1px}
.lm-map .leaflet-control-attribution{background:rgba(11,13,18,.75)!important;color:rgba(255,255,255,.45)!important;font-size:9px;line-height:1.5}
.lm-map .leaflet-control-attribution a{color:rgba(255,255,255,.6)!important}
.lm-map .leaflet-bar{border:1px solid rgba(255,255,255,.14)!important;box-shadow:none}
.lm-map .leaflet-bar a{background:#0b0d12;color:#fff;border-bottom-color:rgba(255,255,255,.14)}
.lm-map .leaflet-bar a:hover{background:#1c1f27;color:#fff}
@media (prefers-reduced-motion:reduce){.lm-pin{animation:none;transform:none}.lm-pin::before{animation:none}}
`

function build(el: HTMLElement, sites: MarketSite[]): LeafletNS {
  const L = (window as unknown as { L: LeafletNS }).L
  const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25, minZoom: 6, maxZoom: 13 })
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors', maxZoom: 16,
  }).addTo(map)
  map.attributionControl.setPrefix(false)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  map.fitBounds(L.latLngBounds(sites.map((s) => [s.lat, s.lng])), { padding: [42, 42] })
  map.once('click', () => map.scrollWheelZoom.enable())

  const hover = window.matchMedia('(hover: hover)').matches
  const leaders = L.layerGroup().addTo(map)
  const markers = sites.map((s, i) => {
    const icon = L.divIcon({
      className: 'lm-pin-wrap', iconSize: [26, 26], iconAnchor: [13, 13],
      html: `<span class="lm-pin" style="--d:${i * 90}ms" aria-label="${esc(s.name)}: visit the site">${MARK}</span>`,
    })
    const m = L.marker([s.lat, s.lng], { icon, riseOnHover: true, keyboard: true }).addTo(map)
    if (hover) {
      m.bindTooltip(`<b>${esc(s.name)}</b><span>${esc(s.county)} · visit the site ↗</span>`, { className: 'lm-tip', direction: 'top', offset: [0, -14] })
      m.on('click', () => window.open(s.url, '_blank', 'noopener,noreferrer'))
    } else {
      m.bindPopup(`<a class="lm-pop" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}<span>${esc(s.county)} · visit the site ↗</span></a>`,
        { className: 'lm-popup', closeButton: false, offset: [0, -10] })
    }
    return m
  })

  // Nudge overlapping pins apart on screen; a thin line runs back to each true spot.
  const spread = () => {
    const MIN = 25
    const home = sites.map((s) => map.latLngToLayerPoint([s.lat, s.lng]))
    const pos = home.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }))
    for (let it = 0; it < 150; it++) {
      let moved = false
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          let dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y
          let d = Math.hypot(dx, dy)
          if (d >= MIN) continue
          if (d < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1 }
          const push = (MIN - d) / 2
          pos[i].x -= (dx / d) * push; pos[i].y -= (dy / d) * push
          pos[j].x += (dx / d) * push; pos[j].y += (dy / d) * push
          moved = true
        }
      }
      if (!moved) break
    }
    leaders.clearLayers()
    markers.forEach((m: LeafletNS, i: number) => {
      const ll = map.layerPointToLatLng(L.point(pos[i].x, pos[i].y))
      m.setLatLng(ll)
      if (Math.hypot(pos[i].x - home[i].x, pos[i].y - home[i].y) > 4) {
        L.polyline([[sites[i].lat, sites[i].lng], ll], { color: AMBER, weight: 1, opacity: 0.5, interactive: false }).addTo(leaders)
        L.circleMarker([sites[i].lat, sites[i].lng], { radius: 2, stroke: false, fillColor: AMBER, fillOpacity: 0.9, interactive: false }).addTo(leaders)
      }
    })
  }
  map.on('zoomend', spread)
  spread()
  return map
}

export default function MarketSitesMap({ sites, cityNextHref }: { sites: MarketSite[]; cityNextHref: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    let map: LeafletNS = null
    let dead = false
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      loadLeaflet()
        .then(() => { if (!dead) map = build(el, sites) })
        .catch(() => { if (!dead) setFailed(true) })
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); if (map) map.remove() }
  }, [sites])

  return (
    <div className="lm-map relative isolate h-full w-full rounded-[2rem] overflow-hidden border border-white/10 bg-[#1b1b1b]">
      <style>{CSS}</style>
      <div ref={box} className="absolute inset-0" role="region" aria-label="Map of the Local Market sites" />
      <div className="pointer-events-none absolute top-4 right-4 z-[1000] rounded-full bg-[#0b0d12]/85 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/70">
        Local Market sites · {sites.length}
      </div>
      <a href={cityNextHref} target="_blank" rel="noopener noreferrer"
         className="absolute bottom-4 left-4 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-[#0b0d12]/85 border border-dashed border-white/25 px-3 py-1.5 text-[12px] text-white/70 hover:text-white hover:border-white/50 transition-colors">
        Your city next →
      </a>
      {/* Every site as a plain link too: for screen readers, and in sight if the map can't load. */}
      <ul className={failed ? 'absolute inset-0 z-[1000] p-5 pt-14 flex flex-wrap content-start gap-2' : 'sr-only'}>
        {sites.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/80 hover:text-white">
              {s.name} · {s.county}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
