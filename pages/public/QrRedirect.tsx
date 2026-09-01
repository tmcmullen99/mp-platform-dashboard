// /r/:code — the QR redirect for printed letters.
//
// WHY THIS EXISTS HERE AND NOT IN THE WORKER:
// The city worker has a /r/ handler, but it only answers on the domains in its
// registry, and it builds the destination as `https://` + market domain +
// target — it treats target as a PATH. mcmullenresidential.com is this Pages
// project, not a worker domain, so a code printed against it would land on the
// SPA catch-all, render the brand card, and record nothing at all.
//
// A mailed QR cannot be recalled. So the code printed on the letter has to
// resolve on the domain that is printed underneath it, which is this one.
//
// The scan is recorded before the redirect, but never at its expense: if the
// RPC is slow, errors, or the network is bad on someone's phone in a driveway,
// the redirect still happens. Losing a tracking row is a reporting gap; losing
// the redirect is a dead QR on paper.

import { useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const FALLBACK = '/'
const MAX_WAIT_MS = 1200

export default function QrRedirect() {
  const { code } = useParams<{ code: string }>()
  const [params] = useSearchParams()
  /* StrictMode double-invokes effects in development, which would record two
     scans for one visit. */
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const go = (to: string) => {
      // replace(), not assign(): the back button should return to whatever the
      // person was doing before scanning, not bounce through the redirect again.
      window.location.replace(to)
    }

    if (!code) { go(FALLBACK); return }

    let settled = false
    const finish = (to: string) => { if (!settled) { settled = true; go(to) } }

    // Hard ceiling. The redirect is the product; the tracking is a bonus.
    const timer = setTimeout(() => finish(FALLBACK), MAX_WAIT_MS)

    /* The Supabase query builder is a thenable, not a Promise — it has no
       .catch(). An async IIFE with try/catch is the honest way to handle that
       rather than casting the type away. */
    void (async () => {
      try {
        const { data } = await supabase.rpc('record_qr_scan', {
          p_code: String(code).toUpperCase(),
          p_recipient: params.get('h'),
          p_visitor: params.get('v'),
          p_ua: navigator.userAgent,
          p_ref: document.referrer || null,
        })
        clearTimeout(timer)
        const target = data && data.ok && data.target ? String(data.target) : FALLBACK
        // An absolute URL is honoured only for this origin, so a bad row can
        // never turn a printed code into an open redirect to somewhere else.
        let dest = FALLBACK
        if (target.startsWith('/')) dest = target
        else {
          try {
            const u = new URL(target)
            if (u.origin === window.location.origin) dest = u.pathname + u.search
          } catch { /* keep the fallback */ }
        }
        const sep = dest.includes('?') ? '&' : '?'
        finish(dest + sep + 'qr=' + encodeURIComponent(String(code).toUpperCase()))
      } catch {
        clearTimeout(timer)
        finish(FALLBACK)
      }
    })()

    return () => clearTimeout(timer)
  }, [code, params])

  return (
    <div style={{
      minHeight: '60vh', display: 'grid', placeItems: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', color: '#273C46', padding: 24,
    }}>
      <p>Taking you there…</p>
    </div>
  )
}
