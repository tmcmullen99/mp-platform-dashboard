// D.0b — site beacon. Fire-and-forget engagement signal from public pages into
// the track_event function, which attributes to a contact via a campaign or
// claim token and logs into the engagement_events stream the board scores.

import { supabase } from '@/lib/supabase'

function sessionId(): string {
  try {
    const k = 'mp_sid'
    let v = sessionStorage.getItem(k)
    if (!v) {
      v = crypto.randomUUID()
      sessionStorage.setItem(k, v)
    }
    return v
  } catch {
    return 'anon'
  }
}

export function trackEvent(opts: {
  event_type?: string
  page_path?: string
  campaign_token?: string | null
  claim_token?: string | null
  metadata?: Record<string, unknown>
}): void {
  try {
    void supabase.functions.invoke('track_event', {
      body: {
        event_type: opts.event_type || 'page_view',
        session_id: sessionId(),
        page_path:
          opts.page_path ||
          (typeof window !== 'undefined' ? window.location.pathname : null),
        campaign_token: opts.campaign_token || null,
        claim_token: opts.claim_token || null,
        metadata: opts.metadata || {},
      },
    })
  } catch {
    // fire and forget — never block the page on telemetry
  }
}
