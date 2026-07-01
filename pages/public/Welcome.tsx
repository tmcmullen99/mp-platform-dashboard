// /welcome — post-confirmation provisioning bridge.
//
// Supabase redirects here after the user clicks the email-confirmation link
// (they arrive authenticated). We call provision_account once — idempotent,
// tenant-bound server-side — to create the contact + client + member chain,
// then route into the member dashboard. If they land here unauthenticated
// (e.g. opened the link in another browser), we send them to sign in.

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// McMullen public site ingest token (binds provisioning to the McMullen tenant
// server-side). Tenant duplication swaps this per deployment.
const SITE_TOKEN = 'sEeAYucGGAUrHO0LIcfQSj1iBGx79tP8'
const PROVISION_URL = `${EDGE_FUNCTIONS_BASE_URL}/provision_account?token=${SITE_TOKEN}`

export default function Welcome() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextRaw = searchParams.get('next')
  const next = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : ''
  const { session, loading: authLoading } = useAuth()
  const [phase, setPhase] = useState<'working' | 'done' | 'unconfirmed' | 'error' | 'signin'>('working')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (authLoading) return
    if (!session) {
      setPhase('signin')
      return
    }
    if (ranRef.current) return
    ranRef.current = true

    ;(async () => {
      try {
        const res = await fetch(PROVISION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        })
        const body = await res.json().catch(() => ({}))
        if (res.status === 403 && body?.status === 'unconfirmed') {
          setPhase('unconfirmed')
          return
        }
        if (!res.ok || body?.error) {
          setErrorMsg(body?.error || 'Something went wrong setting up your account.')
          setPhase('error')
          return
        }
        // Account is provisioned. Force an auth refresh so AuthContext resolves
        // the new client identity, then route to the member dashboard.
        setPhase('done')
        await supabase.auth.refreshSession()
        setTimeout(() => navigate(next || '/account', { replace: true }), 900)
      } catch {
        setErrorMsg('Could not reach the server. Please refresh to try again.')
        setPhase('error')
      }
    })()
  }, [session, authLoading, navigate])

  return (
    <div className="mp-public min-h-screen bg-[#0D1B2A] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {phase === 'working' || phase === 'done' ? (
          <>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] text-white/40 mb-5">
              {phase === 'done' ? 'Account ready' : 'Setting up your account'}
            </div>
            <h1 className="mp-serif text-3xl not-italic">
              {phase === 'done' ? "You're all set." : 'One moment…'}
            </h1>
            <p className="text-white/60 text-sm mt-4 leading-relaxed">
              {phase === 'done'
                ? 'Taking you to your dashboard.'
                : 'Confirming your email and unlocking your tools.'}
            </p>
            <div className="mt-8 flex justify-center">
              <div className="h-1.5 w-32 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-1/2 bg-white/60 animate-pulse" />
              </div>
            </div>
          </>
        ) : phase === 'unconfirmed' ? (
          <>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] text-white/40 mb-5">
              Almost there
            </div>
            <h1 className="mp-serif text-3xl not-italic">Confirm your email first.</h1>
            <p className="text-white/60 text-sm mt-4 leading-relaxed">
              Click the confirmation link we emailed you, then return here. If you&rsquo;ve already
              clicked it, give it a few seconds and refresh.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-7 inline-flex items-center justify-center rounded-full bg-white text-[#0D1B2A] px-6 py-3 text-sm font-medium"
            >
              Refresh
            </button>
          </>
        ) : phase === 'signin' ? (
          <>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] text-white/40 mb-5">
              Email confirmed
            </div>
            <h1 className="mp-serif text-3xl not-italic">Sign in to finish.</h1>
            <p className="text-white/60 text-sm mt-4 leading-relaxed">
              Your email is confirmed. Sign in with the password you created and your account
              finishes setting up automatically.
            </p>
            <Link
              to="/login"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-white text-[#0D1B2A] px-6 py-3 text-sm font-medium"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] text-white/40 mb-5">
              Hmm
            </div>
            <h1 className="mp-serif text-3xl not-italic">That didn&rsquo;t work.</h1>
            <p className="text-white/60 text-sm mt-4 leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-7 inline-flex items-center justify-center rounded-full bg-white text-[#0D1B2A] px-6 py-3 text-sm font-medium"
            >
              Try again
            </button>
            <p className="text-white/40 text-xs mt-5">
              Still stuck?{' '}
              <a href="sms:+1-415-691-9272" className="underline">
                Text Tim — (415) 691-9272
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
