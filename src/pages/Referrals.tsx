import { Gift } from 'lucide-react'

// Recreated to restore the build — referenced by App.tsx (/referrals) but missing
// from the repo. Minimal version; replace with the full referrals view when ready.
export default function Referrals() {
  return (
    <div className="p-12 max-w-6xl">
      <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
        <Gift className="w-3.5 h-3.5" strokeWidth={1.5} />
        Referrals
      </div>
      <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">Referrals</h1>
      <p className="mt-5 text-ink-600 text-lg font-light leading-relaxed max-w-2xl">
        Track referral credits, conversions, and the audience members sending business your way.
        The full referrals ledger is being rebuilt and will surface here.
      </p>
    </div>
  )
}
