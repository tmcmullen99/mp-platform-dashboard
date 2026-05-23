import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Recreated to restore the build — referenced by App.tsx (/deals/:dealId) but
// missing from the repo. Minimal version; replace with the full deal view when ready.
export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>()

  return (
    <div className="p-12 max-w-6xl">
      <Link
        to="/pipeline"
        className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to pipeline
      </Link>
      <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">Deal</h1>
      <p className="mt-5 text-ink-600 text-lg font-light leading-relaxed max-w-2xl">
        Detailed deal view is being rebuilt. This deal's full timeline, documents, and net sheet
        will live here.
      </p>
      <div className="text-2xs uppercase tracking-widest text-ink-300 mt-6">
        Deal ID · {dealId || '—'}
      </div>
    </div>
  )
}
