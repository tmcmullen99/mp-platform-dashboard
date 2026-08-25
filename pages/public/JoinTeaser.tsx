// /join — self-serve account creation. Real signup via supabase.auth.signUp()
// with email confirmation ON (Supabase sends the confirm link → /welcome).
// The account (contact + client) is provisioned on /welcome after confirmation,
// not here. Keeps the established navy hero + 3-step ladder design.
//
// Tenant binding is implicit: this is McMullen's public site, so confirmed
// signups provision into the McMullen tenant (the /welcome provisioner resolves
// tenant from the site token, never from the browser).

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const PRIMARY_SHADOW = '0 14px 34px -14px rgba(13,27,42,0.55)'

// Only allow same-site relative paths as a post-auth destination (no open redirect).
function safeNext(raw: string | null): string {
  if (!raw) return ''
  if (!raw.startsWith('/') || raw.startsWith('//')) return ''
  return raw
}

const LADDER = [
  {
    tag: 'Free · no account',
    title: 'Run the numbers',
    blurb:
      'Mortgage calculator and an 8-county seller net sheet, right on the homepage. No email, no friction.',
  },
  {
    tag: 'Free account',
    title: 'Every tool, unlocked',
    blurb:
      'The full toolkit agents use — property comparison, comps requests, condition rankings, and a CMA you build on your own home — all in one place.',
  },
  {
    tag: 'Free account',
    title: 'Save everything to your account',
    blurb:
      'Favorite listings, saved comparisons, your CMAs, and disclosure reviews all live in your account — pick up exactly where you left off, on any device.',
  },
  {
    tag: 'Members only',
    title: 'Off-market & pre-market listings',
    blurb:
      'See homes before they hit the public portals. Account holders get access to off-market opportunities and an early look at listings still in preparation.',
  },
  {
    tag: 'Free account',
    title: 'Agent-grade analysis',
    blurb:
      'Request disclosures on your favorites, get condition-based rankings beyond the photos, and plug Tim in the moment you want a professional read.',
  },
  {
    tag: 'After signup',
    title: 'A $10,000 credit that’s yours',
    blurb:
      'Apply for a $10,000 credit toward your next deal — a uniform benefit for account holders, yours to keep at closing.',
  },
]

export default function JoinTeaser() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] =
    useState<'idle' | 'sending' | 'sent' | 'resending' | 'exists' | 'error'>('idle')
  const [cooldown, setCooldown] = useState(0)

  /* Supabase rate-limits resends; a live countdown is kinder than a button
     that silently refuses. */
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // After email confirmation Supabase returns to /welcome; forward the intended
  // destination so the visitor lands back on the gated asset they wanted.
  const redirectTo = `${window.location.origin}/welcome${
    next ? `?next=${encodeURIComponent(next)}` : ''
  }`

  // Already signed in? Send them straight to their intended destination.
  useEffect(() => {
    if (!authLoading && session) navigate(next || '/welcome', { replace: true })
  }, [session, authLoading, navigate, next])

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Add your name, email, and a password to continue.')
      setState('error')
      return
    }
    if (password.length < 8) {
      setErrorMsg('Use at least 8 characters for your password.')
      setState('error')
      return
    }
    setState('sending')
    setErrorMsg(null)
    const addr = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: addr,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { name: name.trim() },
      },
    })
    if (error) {
      setErrorMsg(error.message)
      setState('error')
      return
    }

    /* If email confirmation is switched off in the project, signUp returns a
       live session and the person is already logged in. The old code ignored
       `data` entirely and always showed "Check your email", so turning
       confirmation off would have left the page promising an email that was
       never going to be sent. */
    if (data.session) {
      navigate(next || '/welcome', { replace: true })
      return
    }

    /* Supabase deliberately does not error when the address already has an
       account - it returns a user with an empty identities array instead, so
       an existing customer got "Check your email" and an email that never
       came, forever. Name it and give them the way in. */
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setState('exists')
      return
    }

    setState('sent')
  }

  /* A real resend, not a form reset. "Try again" put them back on a blank form
     where re-submitting the same address hits the existing-account path above
     and sends nothing - the exact loop somebody who did not get the first
     email would fall into. */
  async function resend() {
    if (cooldown > 0 || state === 'resending') return
    setState('resending')
    setErrorMsg(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    })
    if (error) {
      /* Rate limiting is the single most likely reason a confirmation email
         never arrives, so say so plainly rather than showing the raw string. */
      setErrorMsg(/rate|limit|seconds/i.test(error.message)
        ? 'That is too many requests in a row. Wait a minute and try once more.'
        : error.message)
    }
    setState('sent')
    setCooldown(45)
  }

  const inputCls =
    'w-full rounded-[12px] border border-white/15 bg-white/[0.07] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40'

  return (
    <div className="mp-public min-h-screen bg-white text-[#0D1B2A]">
      {/* hero — navy */}
      <section className="bg-[#0D1B2A] pt-10 pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto px-6">
          <Link to="/" className="mp-mono text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white/80">
            &larr; McMullen Properties
          </Link>
          <div className="text-center mt-14 md:mt-20">
            <div className="mp-mono text-xs uppercase tracking-[0.22em] text-white/40 mb-5">
              Create your free account
            </div>
            <h1 className="text-[40px] md:text-[64px] leading-[1.04] font-semibold tracking-tight text-white">
              Do what an agent does.{' '}
              <span className="mp-serif font-normal">Yourself.</span>
            </h1>
            <p className="text-white/65 text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
              A free account unlocks the tools agents use — property comparison, disclosure
              requests, condition rankings, self-created CMAs. Then apply for a $10,000 credit
              toward your next deal that&rsquo;s yours to keep.
            </p>
          </div>

          {/* signup card */}
          <div className="max-w-xl mx-auto mt-12 rounded-[24px] bg-white/[0.05] border border-white/10 p-7 md:p-8">
            {state === 'exists' ? (
              <div className="text-center py-4">
                <div className="mp-serif text-2xl text-white not-italic">
                  You already have an account.
                </div>
                <p className="text-white/60 text-sm mt-3 leading-relaxed">
                  <span className="text-white">{email}</span> is already registered, so nothing new
                  was sent. Sign in with your password, or reset it if you cannot remember.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <Link
                    to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
                    className="rounded-full bg-white text-[#0D1B2A] px-6 py-2.5 text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <button
                    onClick={() => { setState('idle'); setEmail('') }}
                    className="rounded-full border border-white/25 text-white px-6 py-2.5 text-sm"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            ) : state === 'sent' || state === 'resending' ? (
              <div className="text-center py-4">
                <div className="mp-serif text-2xl text-white not-italic">Check your email.</div>
                <p className="text-white/60 text-sm mt-3 leading-relaxed">
                  We sent a confirmation link to <span className="text-white">{email}</span>. Click it to
                  activate your account and unlock the tools. The link lands you right back here.
                </p>
                {errorMsg && (
                  <p className="text-[#f0a58f] text-sm mt-4" role="alert">{errorMsg}</p>
                )}
                <div className="mt-6 flex flex-wrap gap-3 justify-center items-center">
                  <button
                    onClick={resend}
                    disabled={cooldown > 0 || state === 'resending'}
                    className="rounded-full border border-white/25 text-white px-6 py-2.5 text-sm disabled:opacity-45"
                  >
                    {state === 'resending'
                      ? 'Sending\u2026'
                      : cooldown > 0
                        ? `Send it again in ${cooldown}s`
                        : 'Send it again'}
                  </button>
                  <Link
                    to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
                    className="text-white/60 text-sm underline"
                  >
                    Already confirmed? Sign in
                  </Link>
                </div>
                <p className="mp-mono text-[10px] uppercase tracking-[0.16em] text-white/30 mt-5">
                  Check spam and promotions &middot; it comes from Supabase
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputCls}
                  autoComplete="name"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className={inputCls}
                  autoComplete="email"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (8+ characters)"
                  className={inputCls}
                  autoComplete="new-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit()
                  }}
                />
                {state === 'error' && errorMsg ? (
                  <p className="text-xs text-red-300">{errorMsg}</p>
                ) : null}
                <button
                  onClick={submit}
                  disabled={state === 'sending'}
                  className="w-full inline-flex items-center justify-center rounded-full bg-white text-[#0D1B2A] px-6 py-3.5 text-sm font-medium disabled:opacity-60"
                  style={{ boxShadow: PRIMARY_SHADOW }}
                >
                  {state === 'sending' ? 'Creating your account…' : 'Create my free account'}
                </button>
                <p className="mp-mono text-[10px] uppercase tracking-[0.16em] text-white/30 text-center pt-1">
                  Free forever · unlocks every tool · $10,000 credit available after signup
                </p>
                <p className="text-center text-white/40 text-xs pt-2">
                  Already have an account?{' '}
                  <Link to="/login" className="text-white/70 underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* the ladder — white */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">
          What you unlock
        </div>
        <h2 className="text-[32px] md:text-[44px] leading-[1.05] font-semibold tracking-tight">
          The full toolkit, <span className="mp-serif font-normal">in three steps.</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {LADDER.map((it) => (
            <div key={it.title} className="h-full rounded-[28px] border border-black/[0.07] bg-white p-8">
              <span className="mp-mono text-[10px] uppercase tracking-[0.18em] text-[#273C46]/70 border border-black/[0.09] rounded-full px-3 py-1">
                {it.tag}
              </span>
              <h3 className="text-xl font-semibold tracking-tight mt-5">{it.title}</h3>
              <p className="text-[#273C46] leading-relaxed mt-3 text-sm">{it.blurb}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#273C46] mt-10">
          Want to talk to a person instead?{' '}
          <a href="sms:+1-415-691-9272" className="underline underline-offset-4 hover:text-[#0D1B2A]">
            Text Tim — (415) 691-9272
          </a>
        </p>
      </section>
    </div>
  )
}
