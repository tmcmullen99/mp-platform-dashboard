// /tools/cma — public "build your own CMA" tool.
// Paste a subject property, then paste 2–6 comparable sales. Each comp's
// price-per-sqft is applied to the subject's size to produce a per-comp value;
// the tool reports a low / likely / high range (min / median / max) the way an
// agent prices a home. Free to use; save + agent review is gated to an account.
//
// No MLS required — every property is ingested via the shared paste layer
// (fetch_listing_public). Pure client-side math, transparent per-comp.

import { useMemo, useState } from 'react'
import {
  ToolShell, ToolGate, PropertyPasteInput, ExtractedListing, usd, NAVY, BLUEGRAY,
} from '@/components/public/tools/ToolKit'
import { Home, Trash2, TrendingUp, Info, Plus } from 'lucide-react'

type Comp = ExtractedListing & { _id: string }

function ppsf(l: { price: number | null; sqft: number | null }): number | null {
  if (!l.price || !l.sqft || l.sqft <= 0) return null
  return l.price / l.sqft
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export default function CMATool() {
  const [subject, setSubject] = useState<ExtractedListing | null>(null)
  const [comps, setComps] = useState<Comp[]>([])

  function addComp(listing: ExtractedListing) {
    setComps((c) => [...c, { ...listing, _id: Math.random().toString(36).slice(2) }])
  }
  function removeComp(id: string) {
    setComps((c) => c.filter((x) => x._id !== id))
  }

  // Each comp -> $/sqft -> applied to subject sqft -> estimated subject value.
  const analysis = useMemo(() => {
    if (!subject?.sqft) return null
    const rows = comps
      .map((c) => {
        const p = ppsf(c)
        return p ? { comp: c, ppsf: p, estimate: p * subject.sqft! } : null
      })
      .filter((x): x is { comp: Comp; ppsf: number; estimate: number } => x !== null)
    if (rows.length === 0) return null
    const estimates = rows.map((r) => r.estimate)
    const low = Math.min(...estimates)
    const high = Math.max(...estimates)
    const mid = median(estimates)
    const avgPpsf = rows.reduce((s, r) => s + r.ppsf, 0) / rows.length
    return { rows, low, mid, high, avgPpsf, count: rows.length }
  }, [subject, comps])

  const subjAddr = subject
    ? [subject.address, subject.city, subject.state].filter(Boolean).join(', ')
    : null

  return (
    <ToolShell
      eyebrow="Seller & investor tool"
      title={<>Build your own <span className="mp-serif font-normal">CMA.</span></>}
      intro="A comparative market analysis is how agents price a home: find comparable sales, look at what they fetched per square foot, and apply it to the subject. Do exactly that here — paste a property, paste the comps, see the range."
    >
      {/* STEP 1 — subject */}
      <Step n={1} title="Your subject property" done={!!subject}>
        <PropertyPasteInput onResult={setSubject} cta="Set subject" />
        {subject ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white border border-black/[0.06] p-3">
            {subject.photoUrl ? (
              <img src={subject.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#0D1B2A]/[0.06] flex items-center justify-center">
                <Home className="w-6 h-6 text-[#0D1B2A]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[#0D1B2A] truncate">{subjAddr || 'Subject property'}</div>
              <div className="text-xs text-[#273C46] mt-0.5">
                {[subject.bedrooms && `${subject.bedrooms} bd`, subject.bathrooms && `${subject.bathrooms} ba`,
                  subject.sqft && `${subject.sqft.toLocaleString()} sqft`,
                  subject.yearBuilt && `built ${subject.yearBuilt}`].filter(Boolean).join(' · ')}
              </div>
              {!subject.sqft ? (
                <div className="text-xs text-amber-600 mt-1">
                  No square footage found — the CMA needs sqft to compute. Try a Redfin link.
                </div>
              ) : null}
            </div>
            <button onClick={() => setSubject(null)} className="text-[#91a1ba] hover:text-red-600 p-1" title="Clear subject">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </Step>

      {/* STEP 2 — comps */}
      <Step n={2} title="Comparable sales" done={comps.length >= 2} disabled={!subject}>
        <p className="text-sm text-[#273C46] mb-3">
          Add 2–6 recently sold (or active) homes nearby that are similar in size and style. The closer the match, the better the estimate.
        </p>
        <PropertyPasteInput onResult={addComp} cta="Add comp" placeholder="Paste a comparable Zillow/Redfin link…" />

        {comps.length > 0 ? (
          <div className="mt-5 space-y-2">
            {comps.map((c) => {
              const p = ppsf(c)
              const addr = [c.address, c.city].filter(Boolean).join(', ')
              return (
                <div key={c._id} className="flex items-center gap-3 rounded-2xl bg-white border border-black/[0.06] p-3">
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#0D1B2A]/[0.06] flex items-center justify-center shrink-0">
                      <Home className="w-4 h-4 text-[#0D1B2A]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[#0D1B2A] truncate">{addr || 'Comparable'}</div>
                    <div className="text-xs text-[#273C46]">
                      {[c.price && usd(c.price), c.sqft && `${c.sqft.toLocaleString()} sqft`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-[#0D1B2A]">{p ? usd(p) : '—'}</div>
                    <div className="text-[10px] uppercase tracking-wide text-[#91a1ba]">per sqft</div>
                  </div>
                  <button onClick={() => removeComp(c._id)} className="text-[#91a1ba] hover:text-red-600 p-1" title="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}
      </Step>

      {/* STEP 3 — result */}
      {analysis ? (
        <div className="mt-10 rounded-[28px] text-white overflow-hidden" style={{ background: NAVY }}>
          <div className="p-8">
            <div className="flex items-center gap-2 mp-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
              <TrendingUp className="w-4 h-4" /> Estimated value · based on {analysis.count} comp{analysis.count > 1 ? 's' : ''}
            </div>

            {/* range bar */}
            <div className="mt-6">
              <div className="flex items-end justify-between gap-4">
                <RangeStat label="Low" value={usd(analysis.low)} dim />
                <RangeStat label="Most likely" value={usd(analysis.mid)} big />
                <RangeStat label="High" value={usd(analysis.high)} dim align="right" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: '8%', right: '8%',
                    background: `linear-gradient(90deg, ${BLUEGRAY}55, ${BLUEGRAY}, ${BLUEGRAY}55)`,
                  }}
                />
              </div>
              <div className="text-center text-xs text-white/50 mt-3">
                Average of {usd(analysis.avgPpsf)}/sqft across your comps, applied to{' '}
                {subject?.sqft?.toLocaleString()} sqft.
              </div>
            </div>
          </div>

          {/* per-comp breakdown */}
          <div className="bg-white/[0.04] border-t border-white/10 px-8 py-6">
            <div className="mp-mono text-[10px] uppercase tracking-[0.16em] text-white/50 mb-3">How each comp values your home</div>
            <div className="space-y-1.5">
              {analysis.rows.map((r) => (
                <div key={r.comp._id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70 truncate pr-3">
                    {[r.comp.address, r.comp.city].filter(Boolean).join(', ') || 'Comp'}
                  </span>
                  <span className="text-white/50 tabular-nums shrink-0">
                    {usd(r.ppsf)}/sqft → <span className="text-white font-medium">{usd(r.estimate)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : subject?.sqft && comps.length === 1 ? (
        <p className="mt-8 text-center text-[#273C46] text-sm">Add at least one more comp to see a value range.</p>
      ) : null}

      {/* disclaimer + gate */}
      <div className="flex items-start gap-2 text-xs text-[#273C46] mt-6 px-1">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          A price-per-sqft estimate is a starting point, not an appraisal. It doesn’t adjust for condition,
          lot, view, or upgrades — the things that move real value. That’s where an agent earns their keep.
        </span>
      </div>

      <div className="mt-6">
        <ToolGate
          journey="seller"
          title="Get this CMA reviewed by Tim"
          blurb="Create a free account to save this analysis and have Tim adjust it for condition, location, and the things a raw $/sqft can’t see — then talk strategy."
          cta="Save & request a review"
        />
      </div>
    </ToolShell>
  )
}

/* --------------------------------------------------------------- pieces ---- */
function Step({
  n, title, children, done, disabled,
}: { n: number; title: string; children: React.ReactNode; done?: boolean; disabled?: boolean }) {
  return (
    <div className={'rounded-[24px] border p-6 mb-6 transition-opacity ' +
      (disabled ? 'border-black/[0.06] bg-[#FAFAF7] opacity-55 pointer-events-none' : 'border-black/[0.08] bg-[#FAFAF7]')}>
      <div className="flex items-center gap-3 mb-4">
        <div className={'w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ' +
          (done ? 'bg-[#0D1B2A] text-white' : 'bg-[#0D1B2A]/[0.08] text-[#0D1B2A]')}>
          {done ? '✓' : n}
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-[#0D1B2A]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function RangeStat({
  label, value, big, dim, align = 'left',
}: { label: string; value: string; big?: boolean; dim?: boolean; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className={'mp-mono text-[10px] uppercase tracking-[0.16em] ' + (dim ? 'text-white/45' : 'text-white/70')}>{label}</div>
      <div className={(big ? 'mp-serif not-italic text-4xl md:text-5xl font-semibold' : 'text-lg font-medium ') +
        (dim ? ' text-white/70' : ' text-white')}>
        {value}
      </div>
    </div>
  )
}
