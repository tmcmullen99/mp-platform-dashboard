// /welcome-client — P9.6 client onboarding, step 2 of 3.
//
// Flow: agent taps "Invite to portal" -> invite_client Edge Function emails a
// branded magic link whose redirectTo is THIS page. The client arrives already
// authenticated (supabase-js consumes the tokens in the URL hash), sets a
// password here (auth.updateUser), and is sent into /portal — where the
// calendar gate (ClientOnboarding) and the first-login tour (FirstLoginTour)
// take over as step 3.
//
// States:
//   loading   — auth still resolving the URL hash
//   form      — signed in, collecting password + confirm
//   done      — password saved; brief confirmation, then navigate to /portal
//   expired   — no session (link used twice / expired / opened elsewhere)
//
// This route lives in the PUBLIC block of App.tsx (before the AuthGate
// catch-all) so authenticated clients aren't bounced straight to /portal
// before they can set a password.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const MIN_LEN = 8

export default function WelcomeClient() {
  const navigate = useNavigate()
  const { session, loading: authLoading, clientProfile, currentBranding } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const brokerage = currentBranding?.brokerage_affiliation || 'McMullen Properties'
  const firstName =
    clientProfile?.name?.split(' ')[0] ||
    session?.user?.email?.split('@')[0] ||
    ''

  // After the success beat, drop them into the portal (tour takes over).
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => navigate('/portal', { replace: true }), 1600)
    return () => clearTimeout(t)
  }, [done, navigate])

  async function handleSubmit() {
    setError(null)
    if (password.length < MIN_LEN) {
      setError(`Password must be at least ${MIN_LEN} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    const { error: updErr } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setDone(true)
  }

  // ---- loading ----
  if (authLoading) {
    return (
      <Shell brokerage={brokerage}>
        <div className="flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Opening your invitation…
        </div>
      </Shell>
    )
  }

  // ---- expired / unauthenticated ----
  if (!session) {
    return (
      <Shell brokerage={brokerage}>
        <h1 className="font-display text-3xl text-ink-900 mb-3">
          This invitation link has expired.
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-600 mb-8 max-w-md">
          Invitation links are single-use for your security. Ask your agent to send a fresh
          one — it takes them a few seconds. If you&rsquo;ve already set a password, you can
          sign in directly.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-ink-900 text-cream px-6 py-3 text-sm tracking-wide hover:opacity-90"
        >
          Sign in <ArrowRight className="w-4 h-4" />
        </Link>
      </Shell>
    )
  }

  // ---- done ----
  if (done) {
    return (
      <Shell brokerage={brokerage}>
        <div className="flex items-center gap-3 text-ink-900 mb-3">
          <CheckCircle2 className="w-6 h-6 text-green-700" />
          <h1 className="font-display text-3xl">You&rsquo;re all set.</h1>
        </div>
        <p className="text-[15px] text-ink-600">Taking you to your portal…</p>
      </Shell>
    )
  }

  // ---- password form ----
  return (
    <Shell brokerage={brokerage}>
      <h1 className="font-display text-3xl md:text-4xl text-ink-900 mb-3">
        {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
      </h1>
      <p className="text-[15px] leading-relaxed text-ink-600 mb-8 max-w-md">
        Your private portal is ready — properties, market analysis, documents, and tour
        scheduling in one place. Create a password so you can come back any time.
      </p>

      <div className="max-w-sm space-y-4">
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder={`At least ${MIN_LEN} characters`}
        />
        <Field
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Type it again"
          onEnter={handleSubmit}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 bg-ink-900 text-cream px-6 py-3 text-sm tracking-wide hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {saving ? 'Saving…' : 'Create password & enter portal'}
        </button>

        <p className="text-xs text-ink-400 leading-relaxed">
          Signed in as {session.user?.email}. You&rsquo;ll use this email and your new
          password next time.
        </p>
      </div>
    </Shell>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onEnter?: () => void
}) {
  return (
    <label className="block">
      <span className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-900"
      />
    </label>
  )
}

function Shell({ brokerage, children }: { brokerage: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-5">
          <div className="font-display text-xl text-ink-900 leading-tight">{brokerage}</div>
          <div className="text-2xs uppercase tracking-widest text-ink-400">Client portal</div>
        </div>
      </header>
      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 md:px-8 py-16">{children}</div>
      </main>
      <footer className="border-t border-ink-200">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-4 text-2xs text-ink-400">
          {brokerage} · Equal Housing Opportunity
        </div>
      </footer>
    </div>
  )
}
