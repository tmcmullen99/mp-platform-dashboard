// P9.1 — CMA visual template. Renders structured CMASubject + CMAComp[] as a
// polished single-page CMA. Uses the McMullen brand tokens; safe to render both
// in the agent dashboard and inside the client portal (no nav, just content).

import type { CMASubject, CMAComp } from '@/lib/supabase'
import { MapPin, Home, Bath, Maximize2, Calendar, TrendingUp } from 'lucide-react'

type Props = {
  subject: CMASubject
  comps: CMAComp[]
  agentName?: string | null
  agentPhone?: string | null
  agentEmail?: string | null
  brokerageName?: string | null
  agentNotes?: string | null
  preparedFor?: string | null
  preparedAt?: string | null
}

function fmtMoney(n: number | null | undefined, fallback = '—'): string {
  if (n == null || isNaN(n)) return fallback
  return '$' + Number(n).toLocaleString()
}

function fmtSqft(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString() + ' sqft'
}

function fmtBaths(full: number | null, partial: number | null): string {
  if (full == null && partial == null) return '—'
  if (!partial) return String(full ?? 0)
  return `${full ?? 0}.${partial}`
}

function fmtPpsf(price: number | null, sqft: number | null): string {
  if (!price || !sqft) return '—'
  return '$' + Math.round(price / sqft).toLocaleString() + '/sqft'
}

export default function CMATemplate({
  subject,
  comps,
  agentName,
  agentPhone,
  agentEmail,
  brokerageName,
  agentNotes,
  preparedFor,
  preparedAt,
}: Props) {
  // Stats roll-up
  const soldPrices = comps.map((c) => c.soldPrice).filter((p): p is number => !!p)
  const ppsfs = comps
    .map((c) => (c.soldPrice && c.sqft ? Math.round(c.soldPrice / c.sqft) : null))
    .filter((p): p is number => !!p)
  const avgSold = soldPrices.length ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length) : null
  const medianPpsf = ppsfs.length
    ? ppsfs.sort((a, b) => a - b)[Math.floor(ppsfs.length / 2)]
    : null
  const subjectPpsf = subject.listPrice && subject.sqft ? Math.round(subject.listPrice / subject.sqft) : null

  return (
    <article className="bg-cream text-ink-900 font-body">
      {/* ============ HERO ============ */}
      <section className="border-b border-ink-200 pb-12 mb-12">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
          Comparative Market Analysis
          {preparedAt && <span className="ml-3">{new Date(preparedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
        </div>

        <h1 className="font-display text-5xl text-ink-900 leading-tight">
          {subject.address || 'Subject property'}
        </h1>
        {(subject.city || subject.state || subject.zip) && (
          <p className="text-ink-600 text-lg mt-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" strokeWidth={1.5} />
            {[subject.city, subject.state, subject.zip].filter(Boolean).join(', ')}
          </p>
        )}

        {preparedFor && (
          <p className="text-sm text-ink-500 mt-4">
            Prepared for <span className="text-ink-900">{preparedFor}</span>
            {agentName && <span> by {agentName}{brokerageName ? `, ${brokerageName}` : ''}</span>}
          </p>
        )}

        {/* Key stats */}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mt-10">
          <Stat label="List price" value={fmtMoney(subject.listPrice)} accent />
          <Stat label="Beds / Baths" value={`${subject.beds ?? '—'} / ${fmtBaths(subject.bathsFull, subject.bathsPartial)}`} />
          <Stat label="Living area" value={fmtSqft(subject.sqft)} />
          <Stat label="$ / sqft" value={subjectPpsf ? '$' + subjectPpsf.toLocaleString() : '—'} />
          <Stat label="Year built" value={subject.yearBuilt ? String(subject.yearBuilt) : '—'} />
          <Stat label="Lot size" value={fmtSqft(subject.lotSqft)} />
          <Stat label="MLS#" value={subject.mls || '—'} />
          <Stat label="DOM" value={subject.daysOnMarket != null ? String(subject.daysOnMarket) : '—'} />
        </dl>

        {subject.remarks && (
          <p className="mt-10 text-sm text-ink-700 leading-relaxed max-w-3xl whitespace-pre-wrap">
            {subject.remarks}
          </p>
        )}
      </section>

      {/* ============ MARKET CONTEXT ============ */}
      {comps.length > 0 && (avgSold || medianPpsf) && (
        <section className="border-b border-ink-200 pb-12 mb-12">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Market context</div>
          <h2 className="font-display text-3xl text-ink-900 mb-8">What the comps tell us.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {avgSold && (
              <StatCard
                Icon={TrendingUp}
                label="Average sold price"
                value={fmtMoney(avgSold)}
                hint={`Across ${comps.length} comparable${comps.length === 1 ? '' : 's'}`}
              />
            )}
            {medianPpsf && (
              <StatCard
                Icon={Maximize2}
                label="Median $/sqft sold"
                value={'$' + medianPpsf.toLocaleString()}
                hint={subjectPpsf ? `Subject at $${subjectPpsf.toLocaleString()}/sqft` : ''}
              />
            )}
            {avgSold && subject.listPrice && (
              <StatCard
                Icon={Home}
                label="Subject vs market avg"
                value={
                  subject.listPrice > avgSold
                    ? `+${Math.round(((subject.listPrice - avgSold) / avgSold) * 100)}%`
                    : `${Math.round(((subject.listPrice - avgSold) / avgSold) * 100)}%`
                }
                hint={subject.listPrice > avgSold ? 'Above average' : 'Below average'}
              />
            )}
          </div>
        </section>
      )}

      {/* ============ COMPS GRID ============ */}
      {comps.length > 0 && (
        <section className="mb-12">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Comparables</div>
          <h2 className="font-display text-3xl text-ink-900 mb-8">
            {comps.length} recently sold {comps.length === 1 ? 'home' : 'homes'}.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comps.map((c, i) => (
              <CompCard key={`${c.address}-${i}`} comp={c} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* ============ AGENT NOTES ============ */}
      {agentNotes && (
        <section className="border-t border-ink-200 pt-10 mb-12">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Agent notes</div>
          <p className="text-sm text-ink-700 leading-relaxed max-w-3xl whitespace-pre-wrap">
            {agentNotes}
          </p>
        </section>
      )}

      {/* ============ AGENT FOOTER ============ */}
      {(agentName || agentEmail || agentPhone || brokerageName) && (
        <footer className="border-t border-ink-200 pt-8 mt-12 text-sm text-ink-600 leading-relaxed">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">Prepared by</div>
          {agentName && <div className="text-ink-900 font-medium">{agentName}</div>}
          {brokerageName && <div>{brokerageName}</div>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {agentEmail && <span>{agentEmail}</span>}
            {agentPhone && <span>{agentPhone}</span>}
          </div>
        </footer>
      )}
    </article>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</dt>
      <dd
        className={
          accent
            ? 'font-display text-2xl text-ink-900 leading-none'
            : 'text-sm text-ink-900'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function StatCard({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: typeof Home
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="border border-ink-200 p-5">
      <Icon className="w-4 h-4 text-ink-500 mb-3" strokeWidth={1.5} />
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</div>
      <div className="font-display text-2xl text-ink-900 leading-tight">{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-2">{hint}</div>}
    </div>
  )
}

function CompCard({ comp, index }: { comp: CMAComp; index: number }) {
  return (
    <div className="border border-ink-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
            Comp #{index}
          </div>
          <div className="text-base text-ink-900 font-medium leading-snug">
            {comp.address}
          </div>
          {comp.city && <div className="text-xs text-ink-500">{comp.city}</div>}
        </div>
        {comp.percentOverList != null && comp.percentOverList !== 1 && (
          <div
            className={`text-2xs uppercase tracking-wider px-2 py-1 border ${
              comp.percentOverList > 1
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                : 'border-ink-200 text-ink-600 bg-ink-50'
            }`}
          >
            {comp.percentOverList > 1 ? '+' : ''}
            {Math.round((comp.percentOverList - 1) * 100)}% over list
          </div>
        )}
      </div>

      {comp.photoUrl && (
        <a href={comp.listingUrl || '#'} target="_blank" rel="noreferrer" className="block mb-4">
          <img
            src={comp.photoUrl}
            alt={comp.address}
            className="w-full h-44 object-cover border border-ink-200"
          />
        </a>
      )}

      <div className="border-t border-ink-200 pt-4">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-2xs uppercase tracking-widest text-ink-500">Sold</span>
          <span className="font-display text-xl text-ink-900">
            {fmtMoney(comp.soldPrice)}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-ink-500">Beds/Baths</dt>
          <dd className="text-ink-900 text-right">
            {comp.beds ?? '—'} / {fmtBaths(comp.bathsFull, comp.bathsPartial)}
          </dd>
          <dt className="text-ink-500">Living area</dt>
          <dd className="text-ink-900 text-right">{fmtSqft(comp.sqft)}</dd>
          <dt className="text-ink-500">$/sqft</dt>
          <dd className="text-ink-900 text-right">{fmtPpsf(comp.soldPrice, comp.sqft)}</dd>
          {comp.daysOnMarket != null && (
            <>
              <dt className="text-ink-500">Days on market</dt>
              <dd className="text-ink-900 text-right">{comp.daysOnMarket}</dd>
            </>
          )}
          {comp.soldDate && (
            <>
              <dt className="text-ink-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Sold
              </dt>
              <dd className="text-ink-900 text-right">{comp.soldDate}</dd>
            </>
          )}
          {comp.mls && (
            <>
              <dt className="text-ink-500">MLS#</dt>
              <dd className="text-ink-900 text-right text-2xs">{comp.mls}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}
