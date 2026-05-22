// C.2.0 — Public unsubscribe page (route /unsubscribe, no auth).
// Reads the tracking token from the URL and calls the email_unsubscribe
// function, which writes the canonical email_suppressions row so the contact
// is excluded from every future audience resolve.

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState<'working' | 'done' | 'error'>('working')

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setState('error')
        return
      }
      const { data, error } = await supabase.functions.invoke('email_unsubscribe', {
        body: { token },
      })
      if (cancelled) return
      setState(error || !data?.ok ? 'error' : 'done')
    }
    run()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="min-h-screen bg-ink-900 text-cream flex items-center justify-center px-6">
      <div className="bg-cream text-ink-900 w-full max-w-md p-10 text-center">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
          Email preferences
        </div>
        {state === 'working' && (
          <h1 className="font-display text-2xl">Updating your preferences…</h1>
        )}
        {state === 'done' && (
          <>
            <h1 className="font-display text-3xl mb-3">You’ve been unsubscribed</h1>
            <p className="text-ink-600 leading-relaxed">
              You won’t receive further marketing emails. You can reply to any prior
              email to reach us directly.
            </p>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 className="font-display text-2xl mb-3">Link not recognized</h1>
            <p className="text-ink-600 leading-relaxed">
              This unsubscribe link is invalid or has expired. Reply to any email from
              us and we’ll remove you right away.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
