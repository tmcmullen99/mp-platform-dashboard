import { BarChart3 } from 'lucide-react'

// Recreated to restore the build — referenced by App.tsx (/analytics) but missing
// from the repo. Minimal version; replace with the full analytics view when ready.
export default function Analytics() {
  return (
    <div className="p-12 max-w-6xl">
      <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
        <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
        Analytics
      </div>
      <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">Analytics</h1>
      <p className="mt-5 text-ink-600 text-lg font-light leading-relaxed max-w-2xl">
        Audience growth, send performance, engagement, and pipeline conversion will be charted
        here. The analytics dashboard is being rebuilt.
      </p>
    </div>
  )
}
