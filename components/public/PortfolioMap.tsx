// McMullen Properties — portfolio map (/listings).
//
// The City Markets map, in McMullen dress:
// - Leaflet and Leaflet.markercluster from the CDN, so nothing to npm install. The
//   Leaflet tags are the same data-leaflet ones SFInvestorMap uses, so the library
//   loads once whichever map mounts first.
// - Carto light_all tiles (OpenStreetMap data; attribution kept, it is required).
//   Carto serves a watermark without a key, so the key comes from the Cloudflare
//   Pages variable VITE_CARTO_KEY, baked in at build like the Supabase vars. Until it
//   is set, the map falls back to plain OpenStreetMap tiles rather than the watermark.
// - Gold pins with gold clusters (Tim, 13 Oct 2026). The click on a pin opens a
//   card, and the card links to the property page.
// - Scroll-wheel zoom stays off until the map is clicked, so the page scrolls past it,
//   and a trackpad pinch (a wheel event with ctrlKey) zooms. On a phone one finger
//   scrolls the page and two fingers move the map.
// - It opens on the Bay Area. "All locations" fits every pin (Tahoe, Jackson Hole,
//   Melbourne).
// - Positions come from properties.latitude / longitude (US Census geocoder, the
//   agent desk's verified transaction place, or OpenStreetMap for the one listing
//   abroad). A home without a position is simply not on the map.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export type MapHome = {
  slug: string
  name: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  img: string | null
  badge: string | null
  hood: string | null
  highlight: string | null
  lat: number
  lng: number
  kind: 'sfh' | 'condo' | null
}

const GOLD = '#C9A44C'
const GOLD_DEEP = '#9C7A2C'
const NAVY = '#0D1B2A'

/* ------------------------------- loaders -------------------------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletNS = any
let leafletP: Promise<void> | null = null
let clusterP: Promise<void> | null = null

function addCss(href: string, attr: string) {
  if (document.querySelector(`link[${attr}]`)) return
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = href
  l.setAttribute(attr, '1')
  document.head.appendChild(l)
}
function addScript(src: string, attr: string, ready: () => boolean): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (ready()) { resolve(); return }
    const existing = document.querySelector(`script[${attr}]`) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(src + ' failed')))
      // It may have loaded between the check and the listener.
      if (ready()) resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.setAttribute(attr, '1')
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(src + ' failed'))
    document.head.appendChild(s)
  })
}
function loadLeaflet(): Promise<void> {
  const w = window as unknown as { L?: LeafletNS }
  if (!leafletP) {
    addCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'data-leaflet')
    leafletP = addScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'data-leaflet', () => !!w.L?.map)
      .catch((e) => { leafletP = null; throw e })
  }
  return leafletP
}
function loadCluster(): Promise<void> {
  const w = window as unknown as { L?: LeafletNS }
  if (!clusterP) {
    addCss('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'data-leaflet-cluster')
    clusterP = loadLeaflet().then(() =>
      addScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'data-leaflet-cluster',
        () => !!w.L?.markerClusterGroup))
      .catch((e) => { clusterP = null; throw e })
  }
  return clusterP
}

/* -------------------------------- helpers ------------------------------- */
function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
function money(n: number | null): string {
  return n == null ? 'Price on request' : '$' + Math.round(n).toLocaleString('en-US')
}
// Great-circle distance in km, for "which pins are the Bay Area".
function km(a: [number, number], b: [number, number]): number {
  const R = 6371, rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
function median(xs: number[]): number {
  const s = [...xs].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
/* The core is every pin within 160 km of the median pin: the Bay Area for this
   portfolio. Everything else is reachable with "All locations". */
function splitCore(homes: MapHome[]): { core: MapHome[]; far: MapHome[] } {
  if (homes.length < 3) return { core: homes, far: [] }
  const c: [number, number] = [median(homes.map((h) => h.lat)), median(homes.map((h) => h.lng))]
  const core = homes.filter((h) => km(c, [h.lat, h.lng]) <= 160)
  const far = homes.filter((h) => km(c, [h.lat, h.lng]) > 160)
  return core.length ? { core, far } : { core: homes, far: [] }
}

const PIN_SVG =
  `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">` +
  `<path class="mpm-pin-body" d="M15 38.5s12-13.4 12-22.9A12 12 0 0 0 3 15.6c0 9.5 12 22.9 12 22.9z" stroke="#fff" stroke-width="2"/>` +
  `<circle cx="15" cy="15.6" r="4.6" fill="${NAVY}"/></svg>`

function cardHtml(h: MapHome): string {
  const facts = [h.hood, h.bedrooms != null ? `${h.bedrooms} bd` : null, h.bathrooms != null ? `${h.bathrooms} ba` : null,
    h.area_sqft != null ? `${Math.round(h.area_sqft).toLocaleString('en-US')} sqft` : null].filter(Boolean).join(' · ')
  const top = h.img
    ? `<img src="${esc(h.img)}" alt="${esc(h.name)}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="mpm-noimg">${esc(h.highlight || h.name)}</div>`
  return `<a class="mpm-card" href="/listings/${esc(h.slug)}" data-slug="${esc(h.slug)}">` +
    `<div class="mpm-img">${top}${h.badge ? `<span class="mpm-badge">${esc(h.badge)}</span>` : ''}</div>` +
    `<div class="mpm-body"><div class="mpm-price">${esc(money(h.price))}</div>` +
    `<div class="mpm-name">${esc(h.name)}</div>` +
    (facts ? `<div class="mpm-facts">${esc(facts)}</div>` : '') +
    (h.highlight && h.img ? `<div class="mpm-hl">${esc(h.highlight)}</div>` : '') +
    `<div class="mpm-cta">View property →</div></div></a>`
}

/* -------------------------------- component ----------------------------- */
type Kind = 'all' | 'sfh' | 'condo'
const KIND_LABEL: Record<Kind, string> = { all: 'All homes', sfh: 'Single family', condo: 'Condo & TIC' }

export default function PortfolioMap({ homes: allHomes }: { homes: MapHome[] }) {
  /* Single family vs condo (TICs included). Only the map filters; the grid below is
     unchanged. */
  const [kind, setKind] = useState<Kind>('all')
  const counts = useMemo(() => ({
    all: allHomes.length,
    sfh: allHomes.filter((h) => h.kind === 'sfh').length,
    condo: allHomes.filter((h) => h.kind === 'condo').length,
  }), [allHomes])
  const homes = useMemo(() => (kind === 'all' ? allHomes : allHomes.filter((h) => h.kind === kind)), [allHomes, kind])
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletNS>(null)
  const layerRef = useRef<LeafletNS>(null)
  const markersRef = useRef<Record<string, LeafletNS>>({})
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [scope, setScope] = useState<'core' | 'all'>('core')
  const { core, far } = useMemo(() => splitCore(homes), [homes])

  // Build the map once.
  useEffect(() => {
    let dead = false
    loadCluster().then(() => {
      if (dead || !hostRef.current || mapRef.current) return
      const L = (window as unknown as { L: LeafletNS }).L
      const map = L.map(hostRef.current, { scrollWheelZoom: false, zoomControl: true, worldCopyJump: true, dragging: !L.Browser.mobile })
      const cartoKey = String(import.meta.env.VITE_CARTO_KEY ?? '').trim()
      if (cartoKey) {
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(cartoKey), {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(map)
      } else {
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)
      }
      map.on('focus click', () => map.scrollWheelZoom.enable())
      // Trackpad pinch (ctrlKey wheel) zooms; a plain two-finger scroll scrolls the page.
      const el = hostRef.current
      let acc = 0
      let timer: number | null = null
      el.addEventListener('wheel', (e: WheelEvent) => {
        if (!e.ctrlKey) return
        e.preventDefault()
        acc += e.deltaY
        if (timer) return
        const cx = e.clientX, cy = e.clientY
        timer = window.setTimeout(() => {
          const step = acc > 0 ? -1 : 1
          acc = 0; timer = null
          const r = el.getBoundingClientRect()
          map.setZoomAround(map.containerPointToLatLng(L.point(cx - r.left, cy - r.top)), map.getZoom() + step)
        }, 40)
      }, { passive: false })
      mapRef.current = map
      setState('ready')
    }).catch(() => { if (!dead) setState('error') })
    return () => {
      dead = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layerRef.current = null }
    }
  }, [])

  // Card links open the property page inside the app, without a full reload.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a[data-slug]') as HTMLAnchorElement | null
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      navigate(`/listings/${a.dataset.slug}`)
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [navigate])

  // (Re)draw the pins whenever the set changes, and fit the view.
  useEffect(() => {
    const map = mapRef.current
    if (state !== 'ready' || !map) return
    const L = (window as unknown as { L: LeafletNS }).L
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null }
    const group = L.markerClusterGroup({
      maxClusterRadius: 46, showCoverageOnHover: false, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 17,
      /* Keep every pin in the DOM. With the default, a card taller than a phone's map
         panned its own pin out of view, the cluster layer dropped the pin, and the card
         closed with it. 53 pins cost nothing to keep. */
      removeOutsideVisibleBounds: false,
      iconCreateFunction: (c: LeafletNS) => {
        const n = c.getChildCount()
        const size = n < 10 ? 38 : n < 25 ? 44 : 50
        return L.divIcon({ html: `<div class="mpm-cluster" style="width:${size}px;height:${size}px"><span>${n}</span></div>`,
          className: 'mpm-cluster-wrap', iconSize: L.point(size, size) })
      },
    })
    markersRef.current = {}
    homes.forEach((h) => {
      const icon = L.divIcon({ className: 'mpm-pin', html: PIN_SVG, iconSize: [30, 40], iconAnchor: [15, 39], popupAnchor: [0, -34] })
      markersRef.current[h.slug] = L.marker([h.lat, h.lng], { icon, title: h.name, keyboard: true, riseOnHover: true })
        .bindPopup(cardHtml(h), { className: 'mpm-popup', maxWidth: 264, minWidth: 264, closeButton: true,
          autoPanPaddingTopLeft: L.point(16, 16), autoPanPaddingBottomRight: L.point(16, 16) })
        .addTo(group)
    })
    group.addTo(map)
    layerRef.current = group
    const pts = (scope === 'all' ? homes : core).map((h) => [h.lat, h.lng])
    if (pts.length === 1) map.setView(pts[0], 15)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 15 })
  }, [homes, core, scope, state])

  /* The homes outside the Bay Area each get a button under the map: it flies to the
     pin and opens its card, so Tahoe, Jackson Hole and Melbourne are one click away
     rather than hidden behind a world-wide view (Tim, 13 Oct 2026). */
  function goTo(h: MapHome) {
    const map = mapRef.current
    const m = markersRef.current[h.slug]
    if (!map || !m) return
    hostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    map.setView([h.lat, h.lng], 15)
    const group = layerRef.current
    if (group && group.zoomToShowLayer) group.zoomToShowLayer(m, () => m.openPopup())
    else m.openPopup()
  }

  return (
    <div>
      <style>{`
        .mpm-pin { background: none; border: 0; }
        .mpm-pin svg { display: block; filter: drop-shadow(0 3px 4px rgba(13,27,42,.28)); transition: transform .18s ease; transform-origin: 50% 100%; }
        .mpm-pin .mpm-pin-body { fill: ${GOLD}; }
        .mpm-pin:hover svg { transform: translateY(-2px) scale(1.06); }
        .leaflet-marker-icon.mpm-pin:focus { outline: none; }
        .leaflet-marker-icon.mpm-pin:focus svg { transform: scale(1.1); }
        .leaflet-marker-icon.mpm-pin:focus .mpm-pin-body { fill: ${GOLD_DEEP}; }
        .mpm-cluster-wrap { background: none; border: 0; }
        .mpm-cluster { border-radius: 999px; background: ${GOLD}; color: ${NAVY}; border: 3px solid #fff;
          display: flex; align-items: center; justify-content: center; font: 700 13px/1 'DM Sans', system-ui, sans-serif;
          box-shadow: 0 0 0 6px rgba(201,164,76,.28), 0 4px 10px rgba(13,27,42,.25); }
        .mpm-popup .leaflet-popup-content-wrapper { padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 18px 44px rgba(13,27,42,.28); }
        .mpm-popup .leaflet-popup-content { margin: 0; width: 264px !important; }
        .mpm-popup .leaflet-popup-close-button { color: #fff !important; background: rgba(13,27,42,.55); border-radius: 999px; width: 26px !important; height: 26px !important;
          top: 8px !important; right: 8px !important; display: flex; align-items: center; justify-content: center; font-size: 18px !important; z-index: 2; }
        .mpm-card { display: block; color: ${NAVY} !important; text-decoration: none !important; font-family: 'DM Sans', system-ui, sans-serif; }
        .mpm-img { position: relative; height: 150px; background: #eef1f5; overflow: hidden; }
        .mpm-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
        .mpm-card:hover .mpm-img img { transform: scale(1.05); }
        .mpm-noimg { height: 100%; display: flex; align-items: flex-end; padding: 16px; color: #fff; font: italic 17px/1.3 'Playfair Display', Georgia, serif;
          background: linear-gradient(160deg, ${NAVY} 0%, #1a2c40 100%); }
        .mpm-badge { position: absolute; top: 10px; left: 10px; background: ${NAVY}; color: #fff; font: 600 10px/1 'DM Sans', system-ui, sans-serif;
          letter-spacing: .08em; text-transform: uppercase; padding: 6px 9px; border-radius: 7px; }
        .mpm-body { padding: 13px 15px 15px; }
        .mpm-price { font: italic 21px/1.15 'Playfair Display', Georgia, serif; letter-spacing: -.01em; }
        .mpm-name { font-size: 14px; margin-top: 3px; }
        .mpm-facts { font-size: 12px; color: #5a6578; margin-top: 4px; }
        .mpm-hl { font: italic 13px/1.35 'Playfair Display', Georgia, serif; margin-top: 7px; color: ${NAVY}; }
        .mpm-cta { margin-top: 10px; font: 600 11px/1 ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; color: ${GOLD_DEEP}; }
        .mpm-host .leaflet-control-attribution { font-size: 10px; }
        @media (max-width: 640px) { .mpm-img { height: 112px; } .mpm-popup .leaflet-popup-content { width: 240px !important; } }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46]">
            On the map · {homes.length} {homes.length === 1 ? 'home' : 'homes'}
          </div>
          <div className="inline-flex rounded-full p-1 border" role="group" aria-label="Home type"
            style={{ borderColor: 'rgba(13,27,42,0.12)', background: '#f6f7f9' }}>
            {(['all', 'sfh', 'condo'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                disabled={k !== 'all' && counts[k] === 0}
                className="whitespace-nowrap rounded-full px-2.5 sm:px-3.5 py-1 text-[12px] sm:text-[12.5px] font-medium transition-colors disabled:opacity-40"
                style={kind === k ? { background: '#fff', color: NAVY, boxShadow: '0 1px 3px rgba(13,27,42,0.15)' } : { color: '#5a6578' }}>
                {KIND_LABEL[k]} <span style={{ color: kind === k ? GOLD_DEEP : '#9aa3b2' }}>{counts[k]}</span>
              </button>
            ))}
          </div>
        </div>
        {far.length > 0 && (
          <div className="flex gap-2" role="group" aria-label="Map area">
            {(['core', 'all'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setScope(k)}
                className="rounded-full px-4 py-1.5 text-[13px] font-medium border transition-colors"
                aria-pressed={scope === k}
                style={scope === k
                  ? { background: NAVY, color: '#fff', borderColor: NAVY }
                  : { background: '#fff', color: NAVY, borderColor: 'rgba(13,27,42,0.15)' }}>
                {k === 'core' ? 'Bay Area' : `All locations · ${homes.length}`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative rounded-[20px] overflow-hidden border border-black/[0.07]" style={{ boxShadow: '0 10px 40px rgba(13,27,42,0.08)' }}>
        <div ref={hostRef} className="mpm-host h-[380px] md:h-[480px] w-full" style={{ background: '#eef1f5' }}
          aria-label="Map of the portfolio" />
        {state !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center mp-mono text-[11px] uppercase tracking-[0.2em] text-[#7b8794]">
            {state === 'error' ? 'The map could not load. Every home is listed below.' : 'Loading map…'}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[#7b8794]">
        <span>
          Select a pin to see the home.{' '}
          <span className="md:hidden">Use two fingers to move the map.</span>
        </span>
        {far.length > 0 && (
          <span className="flex flex-wrap items-center gap-2">
            <span>Further afield:</span>
            {far.map((h) => (
              <button key={h.slug} type="button" onClick={() => goTo(h)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] text-[#0D1B2A] transition-colors hover:border-[#0D1B2A]"
                style={{ borderColor: 'rgba(13,27,42,0.15)', background: '#fff' }}>
                <svg width="9" height="12" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 38.5s12-13.4 12-22.9A12 12 0 0 0 3 15.6c0 9.5 12 22.9 12 22.9z" fill={GOLD} /></svg>
                {h.hood || h.name}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
