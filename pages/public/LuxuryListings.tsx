// /luxury-listings — High-net-worth listing-strategy landing page.
//
// Speaks directly to the owner of a $10M+ Bay Area home. Productizes the
// 175 Huckleberry marketing playbook into homeowner-facing value props and
// converts on a single event: a qualified homeowner requests a private
// consultation. Submissions post to the submit_luxury_lead edge function,
// which persists to luxury_listing_leads and emails Tim.
//
// Brand: McMullen navy (#0D1B2A) / blue-gray (#91a1ba). NO gold. The warm
// tan accent of the Huckleberry property site is deliberately NOT used here.

import { useEffect, useRef, useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import { supabase, EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import { SITE_TOKEN } from '@/components/public/tools/ToolKit'
import {
  Globe, Crosshair, Share2, LineChart, EyeOff, UserCheck,
  ArrowRight, ArrowUpRight, CheckCircle2, Loader2,
} from 'lucide-react'

const NAVY = '#0D1B2A'
const NAVY_DEEP = '#080f18'
const BLUEGRAY = '#91a1ba'
const INK = '#273C46'
const HUCK_SLUG = '175-huckleberry-drive'

const VALUE_RANGES = ['$10M–$15M', '$15M–$25M', '$25M–$50M', '$50M+']
const TIMELINES = ['Actively preparing', 'Within 6 months', 'Within a year', 'Just exploring']

const STRATEGY = [
  { icon: Globe, title: 'A dedicated website for your home', body: 'Every listing gets its own bespoke property site — cinematic imagery, full gallery, film, the location story, and a private inquiry channel. Your home is presented as a singular asset, not a tile in a feed.' },
  { icon: Crosshair, title: 'Direct outreach to a curated audience', body: 'I maintain and continually build validated, targeted lists of qualified luxury homeowners and likely-buyer networks across the Bay Area and key second-home markets. Your home reaches the specific people most likely to buy it.' },
  { icon: Share2, title: 'Network-effect marketing', body: 'Beyond direct buyers, the campaign activates the peer networks of luxury owners — the word-of-mouth channel through which trophy homes actually trade. Reach the buyer who isn’t searching, but will move when the right home finds them.' },
  { icon: LineChart, title: 'Performance you can see', body: 'Every campaign is tracked — delivery, engagement, and interest are measured and reported back to you. No black box. You get a clear, honest read on how your home’s marketing is performing.' },
  { icon: EyeOff, title: 'Discreet and controlled', body: 'Outreach is private and tasteful. The campaign can run quietly to a targeted audience rather than splashing your home across the public internet — privacy-conscious selling for owners who don’t want a spectacle.' },
  { icon: UserCheck, title: 'One agent, fully accountable', body: 'I personally design and run every campaign — not a junior team member, not an outsourced vendor. A single, senior point of accountability from strategy through close.' },
]

/* --------------------------------- reveal --------------------------------- */
function useInView<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold })
    ob.observe(el)
    return () => ob.disconnect()
  }, [threshold])
  return { ref, seen }
}
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? 'none' : 'translateY(16px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

export default function LuxuryListings() {
  const [huckImg, setHuckImg] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('properties')
      .select('main_image')
      .eq('slug', HUCK_SLUG)
      .maybeSingle()
      .then(({ data }) => {
        const img = (data?.main_image as { url?: string } | null)?.url
        if (img) setHuckImg(img)
      })
  }, [])

  const scrollToForm = () => document.getElementById('consult')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-white" style={{ color: INK }}>
      <style>{`
        .lx-serif { font-family: 'Playfair Display', Georgia, serif; }
        .lx-mono { font-family: 'DM Mono', ui-monospace, monospace; }
        body { font-family: 'DM Sans', system-ui, sans-serif; }
      `}</style>

      <PublicNav active="sell" cta="phone" />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: NAVY }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(1100px circle at 70% 0%, rgba(145,161,186,0.16), transparent 60%)` }} />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <Reveal>
            <div className="lx-mono text-xs uppercase tracking-[0.22em]" style={{ color: BLUEGRAY }}>
              For Bay Area homeowners · $10M+
            </div>
            <h1 className="mt-5 text-white font-semibold tracking-tight text-[40px] md:text-[64px] leading-[1.04] max-w-4xl">
              Your home deserves a <span className="lx-serif font-normal italic" style={{ color: BLUEGRAY }}>campaign</span>, not a listing.
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Most luxury homes are under-marketed — posted, then left to wait. I run an actual marketing engine for the homes I represent. Here’s what that means for yours.
            </p>
            <div className="mt-9">
              <button
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: '#fff', color: NAVY }}
              >
                Request a Private Consultation <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── THESIS ───────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="lx-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: BLUEGRAY }}>The thesis</div>
          <div className="space-y-5 text-lg md:text-[21px] leading-relaxed" style={{ color: INK }}>
            <p>A $10M home is not sold the way a $1M home is sold. The buyer pool is smaller, more private, and rarely refreshing a listings feed. Reaching them takes more than a sign in the yard and a spot on the MLS.</p>
            <p>So I don’t just list your home — I build and run a campaign for it. A dedicated property site. Direct, validated outreach to the people most likely to buy. Activation of the peer networks where trophy homes actually change hands. And honest, tracked reporting so you always know how it’s performing.</p>
            <p className="font-medium" style={{ color: NAVY }}>It’s the difference between exposure and a strategy. Below is the strategy — and it’s running live right now.</p>
          </div>
        </Reveal>
      </section>

      {/* ── SIX STRATEGY BLOCKS ──────────────────────────────── */}
      <section className="py-8 md:py-12" style={{ background: '#FAFAF7' }}>
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <Reveal>
            <h2 className="text-[30px] md:text-[44px] font-semibold tracking-tight mb-12" style={{ color: NAVY }}>
              The strategy, <span className="lx-serif font-normal italic" style={{ color: BLUEGRAY }}>productized.</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
            {STRATEGY.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.title} delay={(i % 2) * 0.08}>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(13,27,42,0.06)', color: NAVY }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{s.title}</h3>
                      <p className="mt-2 leading-relaxed" style={{ color: INK }}>{s.body}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── LIVE PROOF: 175 HUCKLEBERRY ──────────────────────── */}
      <section className="py-20 md:py-28" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3]" style={{ background: NAVY_DEEP }}>
                {huckImg ? (
                  <img src={huckImg} alt="175 Huckleberry Drive, Jackson Hole" className="w-full h-full object-cover" />
                ) : null}
                <span className="absolute top-4 left-4 lx-mono text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 rounded-full" style={{ background: '#1f7a4d', color: '#fff' }}>
                  Live now
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div>
                <div className="lx-mono text-xs uppercase tracking-[0.22em]" style={{ color: BLUEGRAY }}>The strategy, in action</div>
                <h2 className="mt-4 text-white font-semibold tracking-tight text-[30px] md:text-[42px] leading-[1.1]">
                  175 Huckleberry Drive
                </h2>
                <p className="mt-2 text-lg" style={{ color: BLUEGRAY }}>Jackson Hole, WY · $9,950,000</p>
                <p className="mt-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  A custom estate currently marketed with this exact system — a dedicated property site, targeted outreach to a qualified high-net-worth audience, and tracked performance. This is what I’d build for your home.
                </p>
                <a
                  href="https://175huckleberrydrive.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                  style={{ background: '#fff', color: NAVY }}
                >
                  View the campaign site <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CREDIBILITY ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="lx-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: BLUEGRAY }}>Why Tim</div>
          <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight" style={{ color: NAVY }}>
            One operator. One system. <span className="lx-serif font-normal italic" style={{ color: BLUEGRAY }}>Full accountability.</span>
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed" style={{ color: INK }}>
            <p>I’m Tim McMullen — a Bay Area agent with McMullen Properties, under Real Broker. I built the marketing system on this page myself, and I run it personally for every home I represent. There’s no hand-off to a junior team member and no outsourced vendor between you and your campaign.</p>
            <p>If you’re weighing whether your home is being marketed the way an asset of its caliber deserves, that’s exactly the conversation I want to have.</p>
          </div>
          <div className="mt-6 lx-mono text-xs uppercase tracking-[0.16em]" style={{ color: BLUEGRAY }}>
            McMullen Properties · Real Broker · CA DRE #02016832
          </div>
        </Reveal>
      </section>

      {/* ── LEAD CAPTURE ─────────────────────────────────────── */}
      <ConsultForm />

      <PublicFooter />
    </div>
  )
}

/* ===================================================================== */
/* Qualifying consultation form                                          */
/* ===================================================================== */
function ConsultForm() {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    property_address: '', value_range: '', timeline: '',
    message: '', website: '', // website = honeypot
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const step1Valid = form.full_name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)
  const step2Valid = form.property_address.trim() && form.value_range

  async function submit() {
    if (!step1Valid || !step2Valid) { setErr('Please complete the required fields.'); setStatus('error'); return }
    setStatus('sending'); setErr('')
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/submit_luxury_lead?token=${SITE_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          property_address: form.property_address,
          value_range: form.value_range,
          timeline: form.timeline || undefined,
          message: form.message || undefined,
          page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          website: form.website,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) { setErr(body?.error || 'Something went wrong.'); setStatus('error'); return }
      setStatus('sent')
    } catch {
      setErr('Could not reach the server — please try again.'); setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <section id="consult" className="py-20 md:py-28" style={{ background: '#FAFAF7' }}>
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="lx-serif text-3xl md:text-4xl font-semibold mt-6" style={{ color: NAVY }}>Thank you.</h2>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: INK }}>
            Tim will personally reach out within one business day to schedule your private consultation. This goes
            straight to him — not a team, not an assistant.
          </p>
        </div>
      </section>
    )
  }

  const inputCls = 'w-full rounded-xl border bg-white px-4 py-3 text-[15px] focus:outline-none transition-colors'
  const inputStyle = { borderColor: 'rgba(13,27,42,0.14)', color: NAVY } as const

  return (
    <section id="consult" className="py-20 md:py-28" style={{ background: '#FAFAF7' }}>
      <div className="max-w-xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-[30px] md:text-[44px] font-semibold tracking-tight" style={{ color: NAVY }}>
            Request a <span className="lx-serif font-normal italic" style={{ color: BLUEGRAY }}>private consultation.</span>
          </h2>
          <p className="mt-4 leading-relaxed" style={{ color: INK }}>
            A confidential conversation about how I’d position and market your home. No obligation.
          </p>
        </div>

        <div className="rounded-[28px] border bg-white p-6 md:p-8" style={{ borderColor: 'rgba(13,27,42,0.08)' }}>
          {/* progress */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 flex-1 rounded-full" style={{ background: step >= 1 ? NAVY : 'rgba(13,27,42,0.1)' }} />
            <div className="h-1 flex-1 rounded-full" style={{ background: step >= 2 ? NAVY : 'rgba(13,27,42,0.1)' }} />
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <Field label="Full name" required>
                <input className={inputCls} style={inputStyle} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Your name" />
              </Field>
              <Field label="Email" required>
                <input className={inputCls} style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" />
              </Field>
              <Field label="Phone" hint="optional">
                <input className={inputCls} style={inputStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(415) 000-0000" />
              </Field>
              {/* honeypot */}
              <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={(e) => set('website', e.target.value)} />
              <button
                onClick={() => { if (step1Valid) { setStep(2); setStatus('idle'); setErr('') } else { setErr('Add your name and a valid email.'); setStatus('error') } }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: NAVY }}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
              {status === 'error' ? <p className="text-sm text-red-600 text-center">{err}</p> : null}
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Property address" required>
                <input className={inputCls} style={inputStyle} value={form.property_address} onChange={(e) => set('property_address', e.target.value)} placeholder="The home you’re considering selling" />
              </Field>
              <Field label="Estimated value" required>
                <div className="grid grid-cols-2 gap-2">
                  {VALUE_RANGES.map((v) => (
                    <button key={v} onClick={() => set('value_range', v)}
                      className="rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors"
                      style={form.value_range === v
                        ? { borderColor: NAVY, background: NAVY, color: '#fff' }
                        : { borderColor: 'rgba(13,27,42,0.14)', color: NAVY, background: '#fff' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Timeline to sell" hint="optional">
                <div className="grid grid-cols-2 gap-2">
                  {TIMELINES.map((t) => (
                    <button key={t} onClick={() => set('timeline', form.timeline === t ? '' : t)}
                      className="rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors"
                      style={form.timeline === t
                        ? { borderColor: NAVY, background: NAVY, color: '#fff' }
                        : { borderColor: 'rgba(13,27,42,0.14)', color: NAVY, background: '#fff' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Anything Tim should know" hint="optional">
                <textarea className={inputCls + ' min-h-[90px]'} style={inputStyle} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="A note about your home or your goals" />
              </Field>

              {status === 'error' ? <p className="text-sm text-red-600">{err}</p> : null}

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setStatus('idle'); setErr('') }}
                  className="rounded-full px-5 py-3.5 text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(13,27,42,0.06)', color: NAVY }}>
                  Back
                </button>
                <button onClick={submit} disabled={status === 'sending'}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                  style={{ background: NAVY }}>
                  {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Request consultation
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: BLUEGRAY }}>
          Confidential. Tim McMullen · McMullen Properties · Real Broker · CA DRE #02016832
        </p>
      </div>
    </section>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest" style={{ color: INK }}>
        {label}{required ? <span style={{ color: BLUEGRAY }}> *</span> : hint ? <span style={{ color: BLUEGRAY }}> · {hint}</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
