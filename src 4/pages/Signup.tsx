// P9.10 — Self-serve tenant signup.
// Calls the create_tenant Edge Function (PUBLIC, verify_jwt=false), which
// creates the auth user + tenant + tenant_branding + tenant_users link.
// On success, signs the user in with the same credentials so they land
// directly on /today as the owner of their fresh tenant.

import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { supabase, SUPABASE_URL } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [brokerageName, setBrokerageName] = useState('')
  const [dreLicense, setDreLicense] = useState('')
  const [agentPhone, setAgentPhone] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<'form' | 'finishing'>('form')

  // Already signed in? Bounce to /
  useEffect(() => {
    if (!authLoading && session) {
      navigate('/', { replace: true })
    }
  }, [session, authLoading, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)

    // Client-side validation mirrors the Edge Function so we fail fast
    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!agentName.trim()) {
      setError('Agent name is required.')
      return
    }
    if (!brokerageName.trim()) {
      setError('Brokerage name is required.')
      return
    }

    setLoading(true)
    try {
      // 1. Create the tenant + auth user
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create_tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          agent_name: agentName.trim(),
          brokerage_name: brokerageName.trim(),
          dre_license: dreLicense.trim() || undefined,
          agent_phone: agentPhone.trim() || undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof payload?.error === 'string' ? payload.error : `Signup failed (${res.status})`
        throw new Error(msg)
      }

      // 2. Sign in with the credentials we just created
      setStage('finishing')
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInErr) {
        // Account exists but sign-in failed — bounce to login with a helpful message
        throw new Error(
          `Account created but sign-in failed: ${signInErr.message}. Try logging in directly.`,
        )
      }

      // 3. AuthContext will pick up the new session and load the new tenant.
      // The useEffect above will navigate when session becomes truthy.
      // Belt-and-suspenders explicit navigate after a short tick:
      setTimeout(() => navigate('/', { replace: true }), 400)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStage('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-ink-50/60 via-cream to-cream pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-ink-200/50" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="font-display text-4xl text-ink-900 mb-3">McMullen Platform</div>
          <div className="text-2xs uppercase tracking-widest text-ink-500">
            Brokerage Operating System
          </div>
          <div className="mt-3 mx-auto w-12 h-px bg-ink-300" />
        </div>

        {stage === 'finishing' ? (
          <div className="bg-white border border-ink-100 p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-ink-500 mx-auto mb-4" strokeWidth={1.5} />
            <div className="font-display text-xl text-ink-900 mb-2">
              Spinning up your brokerage…
            </div>
            <div className="text-sm text-ink-600 leading-relaxed">
              Creating your tenant, branding row, and owner account.
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-ink-100 p-10"
            autoComplete="off"
          >
            <div className="mb-8">
              <div className="font-display text-2xl text-ink-900 mb-2">Create your brokerage.</div>
              <p className="text-sm text-ink-600 leading-relaxed">
                One step. Your tenant, branding, and owner account are created together.
              </p>
            </div>

            {/* Brokerage */}
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-3">
              Brokerage name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={brokerageName}
              onChange={(e) => setBrokerageName(e.target.value)}
              placeholder="Real Broker, eXp Realty, etc."
              className="w-full border-b border-ink-200 pb-3 text-lg text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300"
            />

            {/* Agent name */}
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-3 mt-7">
              Your name
            </label>
            <input
              type="text"
              required
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Tim McMullen"
              className="w-full border-b border-ink-200 pb-3 text-lg text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300"
            />

            {/* Email */}
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-3 mt-7">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@brokerage.com"
              className="w-full border-b border-ink-200 pb-3 text-lg text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300"
            />

            {/* Password */}
            <div className="flex items-baseline justify-between mb-3 mt-7">
              <label className="block text-2xs uppercase tracking-widest text-ink-500">
                Password
              </label>
              <span
                className={`text-2xs uppercase tracking-widest font-mono ${
                  password.length >= 8 ? 'text-emerald-700' : 'text-ink-400'
                }`}
              >
                {password.length} / 8 min
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border-b border-ink-200 pb-3 pr-10 text-lg text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-ink-400 hover:text-ink-900 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-6 mt-7">
              <div>
                <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-3">
                  DRE <span className="text-ink-300 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={dreLicense}
                  onChange={(e) => setDreLicense(e.target.value)}
                  placeholder="02016832"
                  className="w-full border-b border-ink-200 pb-3 text-base text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-3">
                  Phone <span className="text-ink-300 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="(415) 555-1234"
                  className="w-full border-b border-ink-200 pb-3 text-base text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300"
                />
              </div>
            </div>

            {error && <p className="mt-6 text-sm text-red-600 leading-relaxed">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email || !password || !agentName || !brokerageName}
              className="mt-10 w-full bg-ink-900 text-cream py-4 text-xs uppercase tracking-widest hover:bg-ink-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  Creating…
                </>
              ) : (
                <>
                  Create brokerage
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </>
              )}
            </button>

            <div className="mt-6 pt-6 border-t border-ink-100 text-center">
              <Link
                to="/login"
                className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors"
              >
                Already on the platform? Sign in
              </Link>
            </div>
          </form>
        )}

        <div className="mt-10 text-center text-2xs uppercase tracking-widest text-ink-400">
          Platform v0.16 · P9.10
        </div>
      </div>
    </div>
  )
}
