// /account — purpose-built home for self-signup members. Unlike the existing
// client portal (which assumes an agent set them up), this is the first screen
// a self-created account sees: their $10,000 credit status, the application
// entry point, and the tool suite. Reads credit balance + application status
// for the signed-in client.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowRight, Check, Clock, Loader2, Calculator, Scale, FileSearch } from 'lucide-react'

type AppRow = {
  id: string
  side: 'buyer' | 'seller'
  status: 'submitted' | 'approved' | 'denied'
}

export default function AccountDashboard() {
  const navigate = useNavigate()
  const { clientProfile, memberDisplayName, loading: authLoading, signOut } = useAuth()
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [application, setApplication] = useState<AppRow | null>(null)
  const [loading, setLoading] = useState(true)

  const firstName = (memberDisplayName || clientProfile?.name || '').split(/\s+/)[0] || 'there'

  useEffect(() => {
    if (authLoading) return
    if (!clientProfile) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const [{ data: appRows }, { data: bal }] = await Promise.all([
        supabase
          .from('credit_applications')
          .select('id, side, status')
          .eq('client_id', clientProfile.id)
          .order('created_at', { ascending: false })
          .limit(1),
        clientProfile.contact_id
          ? supabase.rpc('contact_credit_balance', { p_contact_id: clientProfile.contact_id })
          : Promise.resolve({ data: 0 }),
      ])
      if (cancelled) return
      setApplication(((appRows as AppRow[]) || [])[0] ?? null)
      setBalanceCents(typeof bal === 'number' ? bal : (bal as unknown as number) ?? 0)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientProfile, authLoading])

  // The $10K is the application-granted credit; the small rewards rules
  // (signup, etc.) also live in account_credits, so display the full balance
  // but anchor the headline on whether the application credit is live.
  const hasCredit = (balanceCents ?? 0) >= 1000000
  const dollars = ((balanceCents ?? 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  if (authLoading || loading) {
    return (
      <div className="mp-public min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#273C46]" />
      </div>
    )
  }

  return (
    <div className="mp-public min-h-screen bg-[#FAFAF7] text-[#0D1B2A]">
      {/* top bar */}
      <header className="border-b border-black/[0.06] bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="mp-serif text-lg not-italic">McMullen Properties</Link>
          <div className="flex items-center gap-5">
            <Link to="/portal" className="text-sm text-[#273C46] hover:text-[#0D1B2A]">Portal</Link>
            <button onClick={() => { signOut(); navigate('/') }} className="text-sm text-[#273C46] hover:text-[#0D1B2A]">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">Your account</div>
        <h1 className="text-[34px] md:text-[46px] leading-[1.05] font-semibold tracking-tight">
          Welcome, <span className="mp-serif font-normal not-italic">{firstName}.</span>
        </h1>

        {/* credit card — state machine */}
        <div className="mt-9 rounded-[28px] bg-[#0D1B2A] text-white p-8 md:p-10 overflow-hidden relative">
          <div className="mp-mono text-[11px] uppercase tracking-[0.2em] text-white/40">Your $10,000 credit</div>

          {hasCredit ? (
            <>
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-[52px] md:text-[64px] leading-none font-semibold">{dollars}</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-300 text-sm">
                  <Check className="w-4 h-4" /> Active
                </span>
              </div>
              <p className="text-white/65 mt-4 max-w-lg leading-relaxed">
                Your credit is live and attached to your account. It never expires and comes straight
                off your costs when you buy or sell through McMullen Properties.
              </p>
            </>
          ) : application?.status === 'submitted' ? (
            <>
              <div className="flex items-center gap-2 mt-4 text-amber-300">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-semibold">Under review</span>
              </div>
              <p className="text-white/65 mt-4 max-w-lg leading-relaxed">
                We&rsquo;re confirming ownership of the property you submitted against county tax
                records. Your $10,000 credit goes live as soon as it&rsquo;s verified — usually within
                a day. We&rsquo;ll email you.
              </p>
            </>
          ) : application?.status === 'denied' ? (
            <>
              <div className="text-2xl font-semibold mt-4">Couldn&rsquo;t verify yet</div>
              <p className="text-white/65 mt-4 max-w-lg leading-relaxed">
                We weren&rsquo;t able to confirm ownership from what was submitted. Reply to our email
                or text Tim and we&rsquo;ll sort it out.
              </p>
              <a href="sms:+1-415-691-9272" className="inline-flex items-center gap-2 mt-6 text-white underline underline-offset-4">
                Text Tim — (415) 691-9272
              </a>
            </>
          ) : (
            <>
              <div className="text-[40px] md:text-[52px] leading-tight font-semibold mt-3">
                $10,000 is waiting.
              </div>
              <p className="text-white/65 mt-4 max-w-lg leading-relaxed">
                Apply once and the credit parks in your account — yours forever, applied at closing
                when you buy or sell with McMullen Properties. Takes about a minute.
              </p>
              <button
                onClick={() => navigate('/account/apply')}
                className="inline-flex items-center gap-2 mt-7 rounded-full bg-white text-[#0D1B2A] px-7 py-3.5 text-sm font-medium"
              >
                Apply for your $10,000 <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* tools */}
        <div className="mt-12">
          <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-5">Your tools</div>
          <div className="grid sm:grid-cols-3 gap-5">
            <ToolCard
              Icon={Calculator}
              title="Calculators"
              blurb="Mortgage payments and an 8-county seller net sheet."
              to="/#tools"
              cta="Open"
            />
            <ToolCard
              Icon={Scale}
              title="Compare properties"
              blurb="Paste Zillow links or addresses, build a ranked comparison."
              to="/compare"
              cta="Open"
            />
            <ToolCard
              Icon={FileSearch}
              title="Disclosure analysis"
              blurb="Request disclosures and rank homes by condition, not photos."
              to="/portal"
              cta="Open"
              soon
            />
          </div>
        </div>

        {/* fine print */}
        <div className="mt-14 border-t border-black/[0.07] pt-7">
          <div className="mp-mono text-[10px] uppercase tracking-[0.2em] text-[#273C46]/60 mb-3">
            About the $10,000 credit
          </div>
          <p className="text-xs leading-relaxed text-[#273C46]/80 max-w-3xl">
            The $10,000 is a platform account credit applied toward the costs of a real estate
            transaction initiated through McMullen Properties via Tim McMullen, California DRE
            #02016832 (operating under Real Broker). It is not cash, has no surrender value, cannot
            be withdrawn or transferred, and is limited to one credit per account and one redemption
            per person. The credit does not expire and may be redeemed at any time, subject to these
            terms. Tim McMullen reserves the right to refer or assign any resulting transaction to
            any affiliated agent; the credit is honored regardless of which affiliated agent is
            assigned. This offer is not a guarantee of any particular service, price, or transaction
            outcome, and is void where prohibited. Real estate brokerage services are provided
            through Real Broker. This is not legal, tax, or financial advice.
          </p>
        </div>
      </div>
    </div>
  )
}

function ToolCard({
  Icon,
  title,
  blurb,
  to,
  cta,
  soon,
}: {
  Icon: React.ComponentType<{ className?: string }>
  title: string
  blurb: string
  to: string
  cta: string
  soon?: boolean
}) {
  return (
    <Link to={to} className="block rounded-[24px] border border-black/[0.08] bg-white p-6 hover:border-[#0D1B2A]/35 transition-colors">
      <Icon className="w-5 h-5 text-[#0D1B2A]" />
      <div className="flex items-center gap-2 mt-4">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {soon ? (
          <span className="mp-mono text-[9px] uppercase tracking-[0.16em] text-[#273C46]/60 border border-black/10 rounded-full px-2 py-0.5">
            Soon
          </span>
        ) : null}
      </div>
      <p className="text-sm text-[#273C46] mt-2 leading-relaxed">{blurb}</p>
      <span className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#0D1B2A]">
        {cta} <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  )
}
