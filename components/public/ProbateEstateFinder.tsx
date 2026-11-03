// "Find your estate's page", shown on /services/probate to a reader who arrived from a probate letter's QR code.
//
// Letters mailed before 3 Nov 2026 print one fixed code (this page, with utm_campaign=probate), so the code cannot
// say which estate the reader is from. They give the street address and the date of death; probate_estate_find
// opens the estate's own date-of-death page (/date-of-death/<token>) only when both match the filing, so the box
// cannot be used to learn which homes are in probate. No match falls back to the request form further down.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cityMarket } from '@/lib/cityMarket'
import { NAVY, INK, LOGO_BLUE } from '@/components/public/motion'

export default function ProbateEstateFinder() {
  const nav = useNavigate()
  const [addr, setAddr] = useState('')
  const [dod, setDod] = useState('')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState(false)
  const input = 'w-full rounded-xl border px-3.5 py-3 text-[16px] bg-white outline-none'
  const box = { borderColor: 'rgba(13,27,42,0.18)', color: NAVY }
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)

  async function find() {
    setBusy(true)
    setMiss(false)
    const { data } = await cityMarket.rpc('probate_estate_find', { p_address: addr, p_dod: dod })
    setBusy(false)
    if (data?.ok && data.token) nav('/date-of-death/' + data.token)
    else setMiss(true)
  }

  return (
    <div className="mt-6 max-w-3xl rounded-[14px] bg-white p-5" style={{ boxShadow: '0 12px 40px rgba(0,0,0,.28)' }}>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: LOGO_BLUE }}>From my letter?</p>
      <h2 className="mt-1.5 font-serif text-[22px] leading-snug" style={{ color: NAVY }}>Find your estate’s valuation page</h2>
      <p className="mt-1 text-[14.5px] leading-relaxed" style={{ color: INK }}>
        The home’s street address and the date of death open the page I set up for it.
      </p>
      <div className="mt-3.5 grid gap-3 sm:grid-cols-[1fr_200px] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold" style={{ color: NAVY }}>The home’s street address</span>
          <input className={input} style={box} placeholder="e.g. 123 Main St" autoComplete="street-address" value={addr} onChange={(e) => setAddr(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold" style={{ color: NAVY }}>Date of death</span>
          <input className={input} style={box} type="date" max={today} min="1950-01-01" value={dod} onChange={(e) => setDod(e.target.value)} />
        </label>
      </div>
      <button type="button" onClick={find} disabled={busy || addr.trim().length < 4 || !dod}
        className="mt-3.5 h-12 w-full rounded-full text-[15px] font-semibold text-white disabled:opacity-40 sm:w-auto sm:px-8" style={{ background: NAVY }}>
        {busy ? 'Looking…' : 'Open the estate’s page'}
      </button>
      {miss ? (
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: INK }}>
          I couldn’t match that to a filing. Check the house number and the date, or{' '}
          <a href="#valuation" className="font-semibold underline" style={{ color: LOGO_BLUE }}>ask for the valuation below</a> and I’ll find it.
        </p>
      ) : null}
    </div>
  )
}
