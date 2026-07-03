// Dark-themed live San Francisco map for the Sell Tenant-Occupied investor
// panel. Renders a real Leaflet map (CDN-loaded, so NO npm dependency and
// nothing to `npm install`) with representative investor-owned-condo dots
// clustered on SoMa / Mission Bay / downtown — the concentration our SF
// investor list actually reflects. Not a screenshot of any third-party tool:
// this is OpenStreetMap data via Carto's dark basemap, plotted with our brand.
//
// Design notes:
// - Carto "dark_all" tiles match the navy panel; attribution kept (required).
// - Dots are representative clusters, not exact addresses (privacy + honesty).
// - Leaflet's own CSS is injected once; the script loads once and is reused.
// - Fully cleans up its map instance on unmount to avoid re-init errors.

import { useEffect, useRef, useState } from 'react'

const LOGO_BLUE = '#4f82b9'

// A representative spread of investor-owned condo points, hand-placed over the
// SoMa / Mission Bay / South Beach / downtown core where our list concentrates.
// [lat, lng, weight] — weight (0..1) drives dot size/brightness.
const POINTS: [number, number, number][] = [
  // Mission Bay / South Beach (densest — 250-260 King, Berry St, Long Bridge)
  [37.7766, -122.3918, 1.0], // The Beacon (250-260 King)
  [37.7749, -122.3936, 0.9], // 300 Berry
  [37.7741, -122.3949, 0.85], // 325/330/335 Berry
  [37.7728, -122.3901, 0.9], // 708/718/738 Long Bridge
  [37.7758, -122.3894, 0.8], // 88 King
  [37.7772, -122.3902, 0.75], // 200 Brannan / 219 Brannan
  [37.7784, -122.3888, 0.7], // 235 Berry area
  [37.7736, -122.3968, 0.65], // Mission Bay Blvd
  [37.7719, -122.3925, 0.8], // China Basin / 435 China Basin
  [37.7705, -122.3898, 0.7], // 1000 3rd St
  [37.7752, -122.3872, 0.6], // 2nd & King
  // SoMa core (355/333/425 1st, Harrison, Folsom, Fremont)
  [37.7869, -122.3948, 0.95], // 355 1st St
  [37.7873, -122.3959, 0.85], // 333 1st St
  [37.7856, -122.3931, 0.8], // 425 1st St
  [37.7885, -122.3925, 0.9], // 201 Folsom (marquee 4-unit group)
  [37.7897, -122.3908, 0.75], // 301 Main
  [37.7863, -122.3902, 0.7], // 201 Harrison
  [37.7841, -122.3956, 0.7], // 401 Harrison
  [37.7908, -122.3941, 0.65], // 299 Fremont
  [37.7889, -122.3971, 0.6], // 1 Hawthorne
  [37.7913, -122.3959, 0.55], // 219 Brannan / Fremont
  [37.7845, -122.3993, 0.6], // 1160 Mission / 1550 Mission
  // Rincon Hill / Folsom towers
  [37.7881, -122.3893, 0.8], // 425 1st / Rincon
  [37.7852, -122.3918, 0.65],
  // Downtown / financial edge (lighter)
  [37.7936, -122.3965, 0.45], // 88 Townsend / 77 Dow
  [37.7924, -122.3982, 0.4], // 199 New Montgomery
  [37.7958, -122.3979, 0.35],
  [37.7899, -122.4003, 0.4], // 490 Post area (downtown)
  // A few scattered western/edge points for realism
  [37.7827, -122.4041, 0.3],
  [37.7803, -122.4012, 0.35],
  [37.7791, -122.3971, 0.5],
  [37.7815, -122.3897, 0.55],
]

const SOMA_CENTER: [number, number] = [37.7826, -122.3935]

let leafletLoading: Promise<void> | null = null

function loadLeaflet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  // Already present.
  if ((window as any).L) return Promise.resolve()
  if (leafletLoading) return leafletLoading

  leafletLoading = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.setAttribute('data-leaflet', '1')
      document.head.appendChild(link)
    }
    // JS
    const existing = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('leaflet load failed')))
      if ((window as any).L) resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.setAttribute('data-leaflet', '1')
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('leaflet load failed'))
    document.body.appendChild(script)
  })
  return leafletLoading
}

export default function SFInvestorMap() {
  const elRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const timeouts = useRef<number[]>([])
  const resizeHandler = useRef<(() => void) | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadLeaflet()
      .then(() => {
        if (cancelled || !elRef.current) return
        const L = (window as any).L
        if (!L) {
          setFailed(true)
          return
        }
        // Guard against double-init (StrictMode / re-render).
        if (mapRef.current) return

        const map = L.map(elRef.current, {
          center: SOMA_CENTER,
          zoom: 14,
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
        })
        mapRef.current = map

        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
          },
        ).addTo(map)

        // Plot representative investor-owned-condo dots.
        POINTS.forEach(([lat, lng, w]) => {
          const radius = 4 + w * 7
          L.circleMarker([lat, lng], {
            radius,
            color: '#ffffff',
            weight: 1,
            opacity: 0.35 + w * 0.4,
            fillColor: w > 0.7 ? '#ffffff' : LOGO_BLUE,
            fillOpacity: 0.25 + w * 0.6,
          }).addTo(map)
        })

        // Enable scroll-zoom only while focused, so the page still scrolls past.
        map.on('focus', () => map.scrollWheelZoom.enable())
        map.on('blur', () => map.scrollWheelZoom.disable())

        const bounds = L.latLngBounds(POINTS.map((p) => [p[0], p[1]]))

        // Leaflet often initializes before the panel has its final width (the
        // parent uses flex + a reveal animation), which makes it request only a
        // partial tile grid — the classic "half-rendered map" bug. Force it to
        // re-measure once the layout settles, then fit the cluster. We do this
        // a few times to catch the container's final size and the reveal.
        const settle = () => {
          if (cancelled || !mapRef.current) return
          map.invalidateSize(false)
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })
        }
        settle()
        const t1 = window.setTimeout(settle, 150)
        const t2 = window.setTimeout(settle, 500)
        const t3 = window.setTimeout(settle, 1200)
        timeouts.current.push(t1, t2, t3)

        // Also re-measure whenever the window resizes.
        const onResize = () => {
          if (mapRef.current) mapRef.current.invalidateSize(false)
        }
        window.addEventListener('resize', onResize)
        resizeHandler.current = onResize
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      timeouts.current.forEach((t) => window.clearTimeout(t))
      timeouts.current = []
      if (resizeHandler.current) {
        window.removeEventListener('resize', resizeHandler.current)
        resizeHandler.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full">
      <div
        ref={elRef}
        className="w-full rounded-[14px] overflow-hidden"
        style={{ height: 380, minHeight: 380, display: 'block', background: '#0b1420' }}
        aria-label="Map of San Francisco showing concentration of investor-owned condos in SoMa, Mission Bay, and downtown"
      />
      {failed && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[14px] text-center px-6"
          style={{ background: '#0b1420' }}
        >
          <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Interactive map loads on the live site. Our SF investor list concentrates in
            SoMa, Mission Bay, and the downtown core.
          </span>
        </div>
      )}
    </div>
  )
}
