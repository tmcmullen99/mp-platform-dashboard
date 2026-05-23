import { Bell } from 'lucide-react'

// Recreated to restore the build — referenced by App.tsx (/notifications) but missing
// from the repo. Minimal version; replace with the full notifications view when ready.
export default function Notifications() {
  return (
    <div className="p-12 max-w-6xl">
      <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
        <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
        Notifications
      </div>
      <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">Notifications</h1>
      <p className="mt-5 text-ink-600 text-lg font-light leading-relaxed max-w-2xl">
        Your full notification history is being rebuilt. New alerts continue to appear in the bell
        menu at the top right.
      </p>
    </div>
  )
}
