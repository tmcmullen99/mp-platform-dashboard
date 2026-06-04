import { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  description: string
  Icon: LucideIcon
  phase: string
  replaces?: string
}

export default function Placeholder({ title, description, Icon, phase, replaces }: Props) {
  return (
    <div className="p-12 max-w-3xl">
      <div className="flex items-start gap-6">
        <div className="bg-ink-50 border border-ink-100 p-5 mt-1">
          <Icon className="w-6 h-6 text-ink-700" strokeWidth={1.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
            Ships in {phase}
          </div>
          <h1 className="font-display text-4xl text-ink-900 mb-5 leading-tight">{title}</h1>
          <p className="text-ink-600 text-lg font-light leading-relaxed">{description}</p>
          {replaces && (
            <div className="mt-8 pt-6 border-t border-ink-100 text-sm text-ink-500">
              <span className="text-2xs uppercase tracking-widest text-ink-400">Replaces </span>
              <span className="text-ink-700 ml-2">{replaces}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
