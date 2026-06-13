// src/pages/Login.tsx
//
// RESTORED — this file had been overwritten with FirstLoginTour code, which
// returns null on the /login route, producing a blank page with no console
// error. Rebuilt from spec: hostname-based client/agent branding, password +
// magic-link auth, agent-login link on the client view, version footer hidden
// for clients. The real guided tour lives in src/components/FirstLoginTour.tsx
// and is unaffected.
import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowRight, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Stage = 'password' | 'otp_sent'

// Hostname-based branding. clients.mcmullen.properties shows the client-facing
// brand; agents.mcmullen.properties (and any fallback host like pages.dev or
// localhost) shows the agent platform brand.
const IS_CLIENT_HOST =
  typeof window !== 'undefined' && window.location.hostname.startsWith('clients.')

const BRAND = IS_CLIENT_HOST
  ? { name: 'McMullen Properties', tagline: 'Neighborhood-Record Breaking Service' }
  : { name: 'The MP Platform', tagline: 'Win Or Go Home' }

const APP_VERSION = 'PLATFORM V0.17'

export default function Login() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stage, setStage] = useState<Stage>('password')
  const [loading, setLoading] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Once a session exists, leave the login screen. AuthContext resolves the
  // role; App's AuthGate then routes to portal (client) or dashboard (agent).
  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInErr) throw signInErr
      // Session change triggers the effect above; explicit nudge as backup.
      setTimeout(() => navigate('/', { replace: true }), 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError('Enter your email first, then request a magic link.')
      return
    }
    setError(null)
    setSendingLink(true)
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin },
      })
      if (otpErr) throw otpErr
      setStage('otp_sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link.')
    } finally {
      setSendingLink(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-ink-50/60 via-cream to-cream pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-ink-200/50" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl text-ink-900 leading-tight">{BRAND.name}</h1>
          <p className="text-2xs uppercase tracking-widest text-slate mt-2">{BRAND.tagline}</p>
        </div>

        {stage === 'otp_sent' ? (
          <div className="bg-white border border-ink-200 p-8 text-center">
            <MailCheck className="w-10 h-10 text-ink-900 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-display text-xl text-ink-900 mb-2">Check your email</h2>
            <p className="text-sm text-ink-600 leading-relaxed mb-6">
              We sent a secure sign-in link to <span className="text-ink-900">{email}</span>. Open it
              on this device to continue.
            </p>
            <button
              onClick={() => setStage('password')}
              className="text-2xs uppercase tracking-widest text-slate hover:text-ink-900"
            >
              &larr; Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="bg-white border border-ink-200 p-8 space-y-5">
            <div>
              <label className="block text-2xs uppercase tracking-widest text-slate mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="you@email.com"
                className="w-full px-3 py-2.5 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </div>

            <div>
              <label className="block text-2xs uppercase tracking-widest text-slate mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  className="w-full px-3 py-2.5 pr-10 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-900"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ink-900 text-cream text-sm hover:bg-ink-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
              Sign in
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={sendingLink}
                className="text-2xs uppercase tracking-widest text-slate hover:text-ink-900 disabled:opacity-50"
              >
                {sendingLink ? 'Sending...' : 'Email me a magic link instead'}
              </button>
            </div>
          </form>
        )}

        {/* New agents: self-serve signup front door */}
        {!IS_CLIENT_HOST && (
          <div className="text-center mt-6 pt-6 border-t border-ink-100">
            <span className="text-sm text-ink-500">New to the platform? </span>
            <Link
              to="/signup"
              className="text-sm text-ink-900 font-medium hover:underline"
            >
              Create your workspace
            </Link>
          </div>
        )}

        {/* Footer: client view links to agent login; agent view shows version */}
        <div className="text-center mt-6">
          {IS_CLIENT_HOST ? (
            <a
              href="https://agents.mcmullen.properties/login"
              className="text-2xs uppercase tracking-widest text-slate hover:text-ink-900"
            >
              For agents &rarr;
            </a>
          ) : (
            <span className="text-2xs uppercase tracking-widest text-ink-300">{APP_VERSION}</span>
          )}
        </div>
      </div>
    </div>
  )
}
