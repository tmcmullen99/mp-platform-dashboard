import { X, Upload } from 'lucide-react'

// Recreated to restore the build — the original component was referenced by
// Markets.tsx and MarketDetail.tsx but missing from the repo. This is a minimal,
// safe version that matches the call sites' props. Wire the actual unit-import
// pipeline back in when ready.
export default function MarketImportModal({
  marketId,
  marketName,
  onClose,
  onComplete,
}: {
  marketId: string
  marketName: string
  onClose: () => void
  onComplete: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-ink-100 max-w-lg w-full p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-ink-400" strokeWidth={1.5} />
            <div>
              <div className="font-display text-2xl text-ink-900 leading-tight">Import units</div>
              <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">{marketName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-sm text-ink-600 leading-relaxed">
          The bulk unit importer for this market isn't connected in this build. Add units
          individually for now, or reconnect the CSV import pipeline.
        </p>
        <div className="text-2xs uppercase tracking-widest text-ink-300 mt-3">
          Market ID · {marketId}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-ink-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onComplete()
              onClose()
            }}
            className="px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
