import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Stage = 'password' | 'otp_sent'

export default function Login() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [stage, setStage] = useState<Stage>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // *** Critical: redirect to home whenever the user becomes authenticated.
  // Without this, signInWithPassword updates the session silently but the
  // URL stays at /login and the user appears stuck on the login page.
  useEffect(() => {
    if (!authLoading && session) {
      navigate('/', { replace: true })
    }
  }, [session, authLoading, navigate])

  async function signInWithPassword(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // Explicit redirect — don't depend on the useEffect alone
    if (data?.session) {
      navigate('/', { replace: true })
    }
  }

  async function sendMagicLink() {
    if (!email) {
      setError('Enter your email above first.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) setError(error.message)
    else {
      setStage('otp_sent')
      setPassword('')
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.replace(/\s/g, '')
    if (trimmed.length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: 'email',
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data?.session) {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-ink-50/60 via-cream to-cream pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-ink-200/50" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-14">
          <div className="font-display text-4xl text-ink-900 mb-3">McMullen Platform</div>
          <div className="text-2xs uppercase tracking-widest text-ink-500">
            Brokerage Operating System
          </div>
          <div className="mt-3 mx-auto w-12 h-px bg-ink-300" />
        </div>

        {stage === 'password' ? (
          <form
            onSubmit={signInWithPassword}
            className="bg-white border border-ink-100 p-10"
            autoComplete="off"
          >
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-4">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border-b border-ink-200 pb-3 text-lg text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300"
            />

            <div className="flex items-baseline justify-between mb-4 mt-8">
              <label className="block text-2xs uppercase tracking-widest text-ink-500">
                Password
              </label>
              <span className="text-2xs uppercase tracking-widest text-ink-400 font-mono">
                {password.length} {password.length === 1 ? 'char' : 'chars'}
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
                placeholder="••••••••••••••"
                className="w-full border-b border-ink-200 pb-3 pr-10 text-lg text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-ink-400 hover:text-ink-900 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={1.5} /> : <Eye className="w-5 h-5" strokeWidth={1.5} />}
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="mt-10 w-full bg-ink-900 text-cream py-4 text-xs uppercase tracking-widest hover:bg-ink-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <div className="mt-6 pt-6 border-t border-ink-100 text-center">
              <button
                type="button"
                onClick={sendMagicLink}
                disabled={loading || !email}
                className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors disabled:opacity-40"
              >
                Or send a magic link instead
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/signup"
                className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors"
              >
                New here? Create your brokerage →
              </Link>
            </div>
          </form>
        ) : (
          <div className="bg-white border border-ink-100 p-10">
            <div className="text-center mb-8">
              <div className="font-display text-2xl text-ink-900 mb-3">Check your email</div>
              <p className="text-ink-600 text-sm leading-relaxed">
                We sent a sign-in email to{' '}
                <span className="text-ink-900 font-medium">{email}</span>. Click the magic link{' '}
                <span className="text-ink-500">or</span> enter the 6-digit code below.
              </p>
            </div>

            <form onSubmit={verifyCode}>
              <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-4 text-center">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full border border-ink-200 px-4 py-3 text-2xl text-center font-mono tracking-[0.4em] text-ink-900 focus:outline-none focus:border-ink-900 transition-colors bg-transparent placeholder:text-ink-300"
              />
              {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="mt-6 w-full bg-ink-900 text-cream py-4 text-xs uppercase tracking-widest hover:bg-ink-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
            </form>

            <button
              onClick={() => {
                setStage('password')
                setCode('')
                setError(null)
              }}
              className="mt-8 w-full text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors"
            >
              ← Back to password sign-in
            </button>
          </div>
        )}

        <div className="mt-10 text-center text-2xs uppercase tracking-widest text-ink-400">
          Platform v0.16 · P9.10
        </div>
      </div>
    </div>
  )
}
