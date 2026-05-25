// P9.1 / P9.A — CMA visual template (editorial light theme).
// Renders structured CMASubject + CMAComp[] as a guided, plain-English CMA aimed
// at non-technical clients. Used unchanged in three places: the agent dashboard
// (CMAViewer), the client portal, and public /share links (SharedDoc) — no nav,
// just the report body. Mirrors the McMullen Webflow CMA design.
// NOTE: the comparable map is a deliberate follow-on — CMAComp has no lat/lng yet.

import { useMemo, useState, type ReactNode } from 'react'
import type { CMASubject, CMAComp } from '@/lib/supabase'

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

// ---------- helpers ----------
const money = (n?: number | null) => (n == null || isNaN(n) ? '—' : '$' + Math.round(n).toLocaleString())
const moneyM = (n?: number | null) =>
  n == null || isNaN(n) ? '—' : '$' + (n / 1_000_000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + 'M'
const median = (xs: number[]): number | null => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const ppsfOf = (c: CMAComp): number | null =>
  c.pricePerSqft ?? (c.soldPrice && c.sqft ? Math.round(c.soldPrice / c.sqft) : null)
const overPctOf = (c: CMAComp): number | null => (c.percentOverList != null ? (c.percentOverList - 1) * 100 : null)
const bathStr = (f?: number | null, p?: number | null) => (f == null && p == null ? '—' : p ? `${f ?? 0}.${p}` : String(f ?? 0))
const pctStr = (d: number | null) => (d == null ? '—' : (d >= 0 ? '+' : '') + Math.round(d) + '%')

// Tailwind-safe literal class maps (kept literal so the JIT build picks them up).
const deltaClass: Record<string, string> = {
  up: 'text-emerald-700 bg-emerald-50',
  down: 'text-rose-700 bg-rose-50',
  flat: 'text-ink-500 bg-ink-50',
}
const deltaKey = (d: number | null) => (d == null || Math.abs(d) < 0.5 ? 'flat' : d > 0 ? 'up' : 'down')

type SortKey = 'sale' | 'over' | 'ppsf' | 'size' | 'dom'
const cardSorters: Record<SortKey, (a: CMAComp, b: CMAComp) => number> = {
  sale: (a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0),
  over: (a, b) => (overPctOf(b) ?? -1e9) - (overPctOf(a) ?? -1e9),
  ppsf: (a, b) => (ppsfOf(b) ?? 0) - (ppsfOf(a) ?? 0),
  size: (a, b) => (b.sqft ?? 0) - (a.sqft ?? 0),
  dom: (a, b) => (a.daysOnMarket ?? 1e9) - (b.daysOnMarket ?? 1e9),
}
const sortLabels: { key: SortKey; label: string }[] = [
  { key: 'sale', label: 'Sale price' },
  { key: 'over', label: 'Most over asking' },
  { key: 'ppsf', label: 'Price / sq ft' },
  { key: 'size', label: 'Size' },
  { key: 'dom', label: 'Days on market' },
]

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
  const [cardSort, setCardSort] = useState<SortKey>('sale')
  const [tblSort, setTblSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'sale', dir: 'desc' })

  // ----- computed market stats -----
  const stats = useMemo(() => {
    const sold = comps.map((c) => c.soldPrice).filter((n): n is number => !!n)
    const overs = comps.map(overPctOf).filter((n): n is number => n != null)
    const ppsfs = comps.map(ppsfOf).filter((n): n is number => !!n)
    const doms = comps.map((c) => c.daysOnMarket).filter((n): n is number => n != null)
    return {
      medSold: median(sold),
      avgOver: avg(overs),
      medPpsf: median(ppsfs),
      avgDom: avg(doms),
      subjPpsf: subject.listPrice && subject.sqft ? Math.round(subject.listPrice / subject.sqft) : null,
    }
  }, [comps, subject.listPrice, subject.sqft])

  const sortedCards = useMemo(() => [...comps].sort(cardSorters[cardSort]), [comps, cardSort])
  const sortedRows = useMemo(() => {
    const get = (c: CMAComp, k: string): number | string =>
      k === 'sale' ? c.soldPrice ?? 0
      : k === 'list' ? c.listPrice ?? 0
      : k === 'over' ? overPctOf(c) ?? -1e9
      : k === 'ppsf' ? ppsfOf(c) ?? 0
      : k === 'size' ? c.sqft ?? 0
      : k === 'dom' ? c.daysOnMarket ?? 0
      : k === 'sold' ? c.soldDateIso || c.soldDate || ''
      : c.address || ''
    return [...comps].sort((a, b) => {
      const va = get(a, tblSort.key), vb = get(b, tblSort.key)
      if (typeof va === 'string' || typeof vb === 'string')
        return tblSort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
      return tblSort.dir === 'asc' ? va - vb : vb - va
    })
  }, [comps, tblSort])

  const onHeader = (key: string, type: 'num' | 'str') =>
    setTblSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: type === 'str' ? 'asc' : 'desc' }
    )

  const loc = [subject.city, subject.state, subject.zip].filter(Boolean).join(', ')
  const recoParas = (agentNotes || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <article
      className="font-sans text-ink-700"
      style={{
        background:
          'radial-gradient(1100px 460px at 85% -8%, rgba(145,161,186,.10), transparent 60%), #fafaf7',
      }}
    >
      {/* ============ HERO ============ */}
      <header className="px-6 md:px-12 pt-12 md:pt-16 pb-10 border-b border-ink-200">
        <div className="text-2xs uppercase tracking-widest text-slate font-semibold mb-5">
          Comparative Market Analysis
          {preparedFor ? ` · Prepared for ${preparedFor}` : ' · Prepared for you'}
        </div>
        <h1 className="font-display font-medium text-ink-900 leading-none tracking-tight text-4xl md:text-6xl">
          {subject.address || 'Subject property'}
        </h1>
        {loc && <p className="font-display italic text-ink-600 text-lg md:text-xl mt-4">{loc}</p>}
        <p className="text-ink-700 text-base md:text-lg leading-relaxed max-w-2xl mt-5">
          A clear, plain-English look at what this home is really likely to sell for — built from{' '}
          {comps.length} recent {comps.length === 1 ? 'sale' : 'sales'} nearby, with a straightforward
          recommendation at the end.
        </p>
        {/* facts strip */}
        <div className="flex flex-wrap border-t border-ink-200 mt-8">
          <Fact k="Asking price" v={money(subject.listPrice)} accentGreen />
          <Fact k="Bedrooms" v={subject.beds != null ? String(subject.beds) : '—'} />
          <Fact k="Bathrooms" v={bathStr(subject.bathsFull, subject.bathsPartial)} />
          <Fact k="Size" v={subject.sqft ? subject.sqft.toLocaleString() + ' sf' : '—'} />
          {subject.yearBuilt ? <Fact k="Built" v={String(subject.yearBuilt)} /> : null}
        </div>
      </header>

      {/* ============ SHORT VERSION ============ */}
      {comps.length > 0 && (
        <Section>
          <div className="bg-white border border-ink-200 rounded-xl p-7 md:p-12 relative overflow-hidden shadow-sm"
               style={{ boxShadow: '0 24px 60px -44px rgba(26,31,46,.45)' }}>
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />
            <div className="text-2xs uppercase tracking-widest text-emerald-700 font-semibold mb-4">The short version</div>
            <p className="font-display font-medium text-ink-900 leading-snug text-2xl md:text-3xl mb-4">
              The {comps.length} homes most like this one sold for a typical{' '}
              <b className="text-emerald-700 italic">{moneyM(stats.medSold)}</b>
              {stats.avgOver != null && (
                <> — about <b className="text-emerald-700 italic">{Math.round(stats.avgOver)}% over asking</b></>
              )}
              {stats.avgDom != null && <>, in a median of {Math.round(stats.avgDom)} days.</>}
            </p>
            <p className="text-ink-700 text-base md:text-lg max-w-2xl">
              The {money(subject.listPrice)} asking price is the starting point, not the finish line — in this
              market it's set to attract a crowd. The pages below show why, using real homes that recently sold
              nearby. The recommendation near the bottom is the takeaway.
            </p>
          </div>
        </Section>
      )}

      {/* ============ HOW TO READ ============ */}
      <Section>
        <Eyebrow>How to read this report</Eyebrow>
        <H2>Three simple parts, <em className="text-slate not-italic font-normal">start to finish.</em></H2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Step n="1" title="The home">A quick profile of the property we're analyzing and what makes it special.</Step>
          <Step n="2" title="What sold nearby">Recent comparable homes that set the price — shown as cards you can sort.</Step>
          <Step n="3" title="The recommendation">What we suggest offering, and the plain reasoning behind it.</Step>
        </div>
      </Section>

      {/* ============ THE HOME ============ */}
      <Section>
        <Eyebrow>Part 1 · The home</Eyebrow>
        <H2>{subject.address || 'The subject property'}.</H2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-8 items-start">
          <div className="flex flex-col">
            <SubjRow k="Asking price" v={money(subject.listPrice)} green />
            <SubjRow k="Bedrooms" v={subject.beds != null ? String(subject.beds) : '—'} />
            <SubjRow k="Bathrooms" v={bathStr(subject.bathsFull, subject.bathsPartial)} />
            <SubjRow k="Living size" v={subject.sqft ? subject.sqft.toLocaleString() + ' sq ft' : '—'} />
            <SubjRow k="Lot size" v={subject.lotSqft ? subject.lotSqft.toLocaleString() + ' sq ft' : '—'} />
            {subject.yearBuilt ? <SubjRow k="Year built" v={String(subject.yearBuilt)} /> : null}
            {stats.subjPpsf ? <SubjRow k="Price / sq ft" v={'$' + stats.subjPpsf.toLocaleString()} /> : null}
            {subject.mls ? <SubjRow k="MLS #" v={subject.mls} small /> : null}
          </div>
          {subject.remarks && (
            <div className="bg-ink-50 rounded-xl p-7 md:p-8 h-full">
              <div className="font-display text-4xl text-slate leading-none">“</div>
              <p className="font-display italic text-ink-800 text-base md:text-lg leading-relaxed mt-3 whitespace-pre-line">
                {subject.remarks}
              </p>
              <div className="text-2xs uppercase tracking-widest text-ink-500 font-semibold border-t border-ink-200 pt-4 mt-5">
                From the listing{subject.mls ? ` · MLS #${subject.mls}` : ''}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ============ MARKET SNAPSHOT ============ */}
      {comps.length > 0 && (
        <Section>
          <Eyebrow>Part 2 · What sold nearby</Eyebrow>
          <H2>The neighborhood market, <em className="text-slate not-italic font-normal">in plain numbers.</em></H2>
          <div className="grid grid-cols-2 md:grid-cols-4 border border-ink-200 rounded-xl overflow-hidden bg-white mt-8">
            <StatTile num={moneyM(stats.medSold)} label="Typical sale price" plain={`The middle of the ${comps.length} sales`} />
            <StatTile num={stats.avgOver != null ? '+' + Math.round(stats.avgOver) + '%' : '—'} label="Over asking, on average" plain="What buyers paid above list" green />
            <StatTile num={stats.medPpsf ? '$' + stats.medPpsf.toLocaleString() : '—'} label="Price per sq ft" plain={stats.subjPpsf ? `Subject asks $${stats.subjPpsf.toLocaleString()}/sf` : 'Median of the comps'} />
            <StatTile num={stats.avgDom != null ? Math.round(stats.avgDom) + ' days' : '—'} label="Time on the market" plain="These homes go fast" />
          </div>
          {/* glossary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 mt-7">
            <Gloss t="Over asking">how much more than the list price a home actually sold for. In this market, well over is normal.</Gloss>
            <Gloss t="Price / sq ft">sale price divided by the home's size, so homes of different sizes can be compared fairly.</Gloss>
            <Gloss t="Days on market">how long a home was for sale before going into contract. Low numbers signal strong demand.</Gloss>
            <Gloss t="Sold vs. asking">the final sale price next to the original asking price, so you can see the gap.</Gloss>
          </div>
        </Section>
      )}

      {/* ============ COMP CARDS ============ */}
      {comps.length > 0 && (
        <Section>
          <Eyebrow>The recent sales</Eyebrow>
          <H2>{comps.length} homes that <em className="text-slate not-italic font-normal">set the price.</em></H2>
          <p className="text-ink-700 text-base md:text-lg max-w-2xl mt-3">
            Each card shows what the home sold for versus its asking price, plus size, price per square foot, and
            how fast it sold. Tap a card to view that home on Zillow.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-7">
            <span className="text-2xs uppercase tracking-widest text-ink-500 font-semibold mr-1">Reorder by</span>
            {sortLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCardSort(key)}
                className={`text-sm rounded-full px-4 py-2 border transition-colors ${
                  cardSort === key
                    ? 'bg-ink-900 text-cream border-ink-900'
                    : 'bg-white text-ink-700 border-ink-200 hover:border-ink-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
            {sortedCards.map((c, i) => (
              <CompCard key={`${c.address}-${i}`} comp={c} />
            ))}
          </div>
        </Section>
      )}

      {/* ============ RECOMMENDATION ============ */}
      {recoParas.length > 0 && (
        <Section>
          <Eyebrow>Part 3 · Our recommendation</Eyebrow>
          <H2>What we'd offer, <em className="text-slate not-italic font-normal">plainly stated.</em></H2>
          <div
            className="bg-white border border-ink-200 border-l-4 border-l-emerald-600 rounded-xl p-7 md:p-12 mt-8 shadow-sm"
            style={{ boxShadow: '0 26px 64px -42px rgba(26,31,46,.5)' }}
          >
            <div className="text-2xs uppercase tracking-widest text-emerald-700 font-semibold mb-4">
              {agentName ? `${agentName}'s assessment` : 'Assessment'}
            </div>
            <div className="text-ink-800 text-base md:text-lg leading-relaxed space-y-4">
              {recoParas.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {(agentName || brokerageName || preparedAt) && (
              <div className="flex flex-wrap justify-between items-center gap-3 border-t border-ink-200 pt-5 mt-7 text-sm text-ink-500">
                <div>
                  {agentName && <div className="font-display text-lg text-ink-900 font-semibold">{agentName}</div>}
                  {brokerageName && <div>{brokerageName}</div>}
                </div>
                {preparedAt && (
                  <div>
                    Prepared{' '}
                    {new Date(preparedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ============ FULL DATA (demoted) ============ */}
      {comps.length > 0 && (
        <Section>
          <Eyebrow>For the detail-minded · optional</Eyebrow>
          <H2>The complete data, <em className="text-slate not-italic font-normal">if you'd like it.</em></H2>
          <p className="text-ink-700 text-base md:text-lg max-w-2xl mt-3">
            Everything behind the analysis. Click any column heading to sort. If you've read the recommendation,
            you can skip this — it's here for completeness.
          </p>
          <div className="border border-ink-200 rounded-xl overflow-x-auto bg-white mt-7">
            <table className="w-full border-collapse text-sm" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <Th label="Address" k="addr" type="str" sort={tblSort} onClick={onHeader} />
                  <Th label="Asking" k="list" type="num" sort={tblSort} onClick={onHeader} />
                  <Th label="Sold" k="sale" type="num" sort={tblSort} onClick={onHeader} />
                  <Th label="Over asking" k="over" type="num" sort={tblSort} onClick={onHeader} />
                  <Th label="Size" k="size" type="num" sort={tblSort} onClick={onHeader} />
                  <Th label="$/sf" k="ppsf" type="num" sort={tblSort} onClick={onHeader} />
                  <Th label="Days" k="dom" type="num" sort={tblSort} onClick={onHeader} />
                  <Th label="Closed" k="sold" type="str" sort={tblSort} onClick={onHeader} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((c, i) => {
                  const d = overPctOf(c)
                  return (
                    <tr key={`${c.address}-${i}`} className="border-t border-ink-200 hover:bg-ink-50">
                      <td className="px-4 py-3 font-display text-ink-900 font-medium whitespace-nowrap">{c.address}</td>
                      <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{money(c.listPrice)}</td>
                      <td className="px-4 py-3 font-display text-ink-900 font-medium whitespace-nowrap">{money(c.soldPrice)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-2xs font-bold rounded-full px-2 py-0.5 ${deltaClass[deltaKey(d)]}`}>{pctStr(d)}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-800 whitespace-nowrap">{c.sqft ? c.sqft.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-ink-800 whitespace-nowrap">{ppsfOf(c) ? '$' + Math.round(ppsfOf(c)!).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-ink-800 whitespace-nowrap">{c.daysOnMarket != null ? c.daysOnMarket + 'd' : '—'}</td>
                      <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{c.soldDate || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ============ FOOTER ============ */}
      {(agentName || agentEmail || agentPhone || brokerageName) && (
        <footer className="bg-ink-900 text-ink-200 px-6 md:px-12 py-12">
          <div className="flex flex-wrap justify-between gap-8">
            <div>
              {brokerageName && <div className="font-display text-2xl text-white font-medium">{brokerageName}</div>}
              <div className="text-2xs uppercase tracking-widest text-slate mt-1">San Francisco · Bay Area</div>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              {agentName && <div className="text-white font-medium">{agentName}</div>}
              {agentPhone && <a href={`tel:${agentPhone.replace(/[^\d+]/g, '')}`} className="hover:text-white">{agentPhone}</a>}
              {agentEmail && <a href={`mailto:${agentEmail}`} className="hover:text-white">{agentEmail}</a>}
            </div>
          </div>
          <div className="border-t border-white/10 mt-9 pt-5 text-2xs leading-relaxed text-ink-400">
            Comparative Market Analysis{subject.address ? ` regarding ${subject.address}` : ''}
            {subject.mls ? ` (MLS #${subject.mls})` : ''}. Based on {comps.length} comparable
            {comps.length === 1 ? ' sale' : ' sales'} and the active listing as published. All figures are
            approximate and are not a guarantee of value or an appraisal. For informational purposes only.
            {brokerageName ? ` © ${new Date().getFullYear()} ${brokerageName}.` : ''}
          </div>
        </footer>
      )}
    </article>
  )
}

// ---------- sub-components ----------
function Section({ children }: { children: ReactNode }) {
  return <section className="px-6 md:px-12 py-12 md:py-16 border-b border-ink-200">{children}</section>
}
function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-2xs uppercase tracking-widest text-slate font-semibold mb-4">{children}</div>
}
function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display font-medium text-ink-900 leading-tight tracking-tight text-3xl md:text-4xl">{children}</h2>
}
function Fact({ k, v, accentGreen }: { k: string; v: string; accentGreen?: boolean }) {
  return (
    <div className="flex-1 min-w-[110px] px-5 py-5 border-r border-ink-200 first:pl-0 last:border-r-0">
      <div className="text-2xs uppercase tracking-widest text-ink-500 font-semibold mb-2">{k}</div>
      <div className={`font-display text-2xl ${accentGreen ? 'text-emerald-700' : 'text-ink-900'} font-medium`}>{v}</div>
    </div>
  )
}
function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-ink-200 rounded-xl p-7">
      <div className="font-display font-semibold text-ink-900 w-9 h-9 rounded-full border border-ink-200 flex items-center justify-center mb-4">{n}</div>
      <h3 className="font-display text-xl text-ink-900 font-medium mb-2">{title}</h3>
      <p className="text-sm text-ink-700 leading-relaxed">{children}</p>
    </div>
  )
}
function SubjRow({ k, v, green, small }: { k: string; v: string; green?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-5 py-3 border-b border-ink-200 last:border-b-0">
      <div className="text-2xs uppercase tracking-widest text-ink-500 font-semibold">{k}</div>
      <div className={`text-right ${small ? 'text-sm text-ink-700' : `font-display font-medium ${green ? 'text-emerald-700 text-xl' : 'text-ink-900 text-lg'}`}`}>{v}</div>
    </div>
  )
}
function StatTile({ num, label, plain, green }: { num: string; label: string; plain: string; green?: boolean }) {
  return (
    <div className="p-6 md:p-7 border-r border-b border-ink-200">
      <div className={`font-display font-medium leading-none text-3xl md:text-4xl ${green ? 'text-emerald-700' : 'text-ink-900'}`}>{num}</div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 font-semibold mt-3">{label}</div>
      <div className="text-xs text-ink-600 mt-1.5 leading-snug">{plain}</div>
    </div>
  )
}
function Gloss({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm leading-relaxed py-2.5 border-t border-dashed border-ink-200">
      <b className="text-ink-900 font-semibold whitespace-nowrap">{t}</b>
      <span className="text-ink-700">— {children}</span>
    </div>
  )
}
function CompCard({ comp }: { comp: CMAComp }) {
  const d = overPctOf(comp)
  const inner = (
    <div className="bg-white border border-ink-200 rounded-xl p-6 h-full transition-all hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-md">
      <div className="flex justify-between items-center gap-3 text-2xs uppercase tracking-widest text-ink-500 font-semibold mb-3">
        <span>{comp.city || 'Nearby sale'}</span>
        <span className={`rounded-full px-2 py-0.5 ${deltaClass[deltaKey(d)]}`}>{pctStr(d)} vs asking</span>
      </div>
      <div className="font-display text-xl text-ink-900 font-medium leading-snug mb-4">{comp.address}</div>
      <div className="flex justify-between items-baseline border-y border-ink-200 py-4 mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-widest text-ink-500 font-semibold">Sold for</span>
          <span className="font-display text-2xl text-ink-900 font-semibold">{money(comp.soldPrice)}</span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-2xs uppercase tracking-widest text-ink-500 font-semibold">Asked</span>
          <span className="font-display text-sm text-ink-500">{money(comp.listPrice)}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <CompStat k="Size" v={comp.sqft ? comp.sqft.toLocaleString() : '—'} />
        <CompStat k="$/sf" v={ppsfOf(comp) ? '$' + Math.round(ppsfOf(comp)!).toLocaleString() : '—'} />
        <CompStat k="Days" v={comp.daysOnMarket != null ? String(comp.daysOnMarket) : '—'} />
      </div>
      <div className="flex justify-between gap-2 border-t border-ink-200 pt-4 mt-4 text-2xs uppercase tracking-widest text-ink-500">
        <span>{comp.beds ?? '—'}bd · {bathStr(comp.bathsFull, comp.bathsPartial)}ba</span>
        {comp.listingUrl && <span className="text-ink-900 font-semibold">View on Zillow ↗</span>}
      </div>
    </div>
  )
  return comp.listingUrl ? (
    <a href={comp.listingUrl} target="_blank" rel="noreferrer" className="block">{inner}</a>
  ) : (
    inner
  )
}
function CompStat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 font-semibold mb-1">{k}</div>
      <div className="font-display text-base text-ink-900 font-medium">{v}</div>
    </div>
  )
}
function Th({
  label, k, type, sort, onClick,
}: {
  label: string; k: string; type: 'num' | 'str'
  sort: { key: string; dir: 'asc' | 'desc' }; onClick: (k: string, t: 'num' | 'str') => void
}) {
  const arrow = sort.key === k ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''
  return (
    <th
      onClick={() => onClick(k, type)}
      className="bg-ink-50 text-2xs font-bold uppercase tracking-widest text-ink-500 px-4 py-3.5 text-left border-b border-ink-200 cursor-pointer select-none whitespace-nowrap hover:text-ink-900"
    >
      {label}
      <span className="text-emerald-700">{arrow}</span>
    </th>
  )
}
