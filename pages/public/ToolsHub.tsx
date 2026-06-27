// /tools — the hub for the public "be your own agent" toolset.
// Frames the journey (buyer / seller / investor) and links every tool. Some
// tools are live; some are teasers (off-market). Account CTA woven in as the
// step that unlocks saving + the full suite.

import { Link } from 'react-router-dom'
import { ToolShell, ToolGate } from '@/components/public/tools/ToolKit'
import {
  Scale, Calculator, LineChart, FileSearch, MapPinned, FileStack, ArrowRight, Lock,
} from 'lucide-react'

type Tool = {
  to: string
  icon: React.ComponentType<{ className?: string }>
  name: string
  blurb: string
  journey: ('buyer' | 'seller' | 'investor')[]
  status: 'live' | 'soon'
}

const TOOLS: Tool[] = [
  {
    to: '/compare',
    icon: Scale,
    name: 'Compare properties',
    blurb: 'Paste any Zillow or Redfin links and build a side-by-side comparison — price, $/sqft, condition, beds, baths, HOA.',
    journey: ['buyer', 'investor'],
    status: 'live',
  },
  {
    to: '/tools/net-sheet',
    icon: Calculator,
    name: 'Seller net sheet',
    blurb: 'Estimate your real proceeds at closing. Paste your listing to auto-fill the price, then see what you actually walk away with.',
    journey: ['seller'],
    status: 'live',
  },
  {
    to: '/tools/cma',
    icon: LineChart,
    name: 'Build your own CMA',
    blurb: 'Paste a subject property and a few comparable sales — get an instant value range, the way an agent prices a home.',
    journey: ['seller', 'investor'],
    status: 'live',
  },
  {
    to: '/tools/review',
    icon: FileSearch,
    name: 'CMA & disclosure review',
    blurb: 'Upload a CMA or disclosure packet and get an AI first-pass on what matters — then have Tim review it personally.',
    journey: ['buyer', 'seller'],
    status: 'live',
  },
  {
    to: '/tools/comps',
    icon: FileStack,
    name: 'Request comps',
    blurb: 'Tell us an address or neighborhood and what you’re weighing — get a hand-picked set of recent comparable sales.',
    journey: ['seller', 'investor'],
    status: 'live',
  },
  {
    to: '/tools/off-market',
    icon: MapPinned,
    name: 'Off-market access',
    blurb: 'See properties before they hit Zillow or Redfin. Pocket listings and quiet sales from Tim’s network.',
    journey: ['buyer', 'investor'],
    status: 'soon',
  },
]

export default function ToolsHub() {
  return (
    <ToolShell
      eyebrow="Your toolkit"
      title={<>Be your own <span className="mp-serif font-normal">agent.</span></>}
      intro="Every tool a realtor uses to do the job — open to you, free. Run the numbers, build a CMA, review a disclosure, compare homes. Create an account when you want to save your work and unlock the full suite."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOOLS.map((t) => {
          const Icon = t.icon
          const card = (
            <div
              className={
                'group relative h-full rounded-[22px] border bg-white p-6 transition-all duration-300 ' +
                (t.status === 'live'
                  ? 'border-black/[0.08] hover:-translate-y-1 hover:shadow-[0_22px_55px_-30px_rgba(13,27,42,0.4)]'
                  : 'border-black/[0.06] opacity-90')
              }
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-full bg-[#0D1B2A]/[0.05] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#0D1B2A]" />
                </div>
                {t.status === 'soon' ? (
                  <span className="mp-mono text-[10px] uppercase tracking-[0.16em] text-[#91a1ba] inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Soon
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-[#91a1ba] group-hover:text-[#0D1B2A] group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
              <h3 className="text-lg font-semibold tracking-tight mt-4 text-[#0D1B2A]">{t.name}</h3>
              <p className="text-sm text-[#273C46] mt-2 leading-relaxed">{t.blurb}</p>
              <div className="flex gap-1.5 mt-4">
                {t.journey.map((j) => (
                  <span key={j} className="mp-mono text-[10px] uppercase tracking-[0.14em] text-[#273C46] bg-[#0D1B2A]/[0.04] rounded-full px-2 py-0.5">
                    {j}
                  </span>
                ))}
              </div>
            </div>
          )
          return t.status === 'live' ? (
            <Link key={t.to} to={t.to} className="block h-full">{card}</Link>
          ) : (
            <div key={t.to} className="h-full">{card}</div>
          )
        })}
      </div>

      <div className="mt-10">
        <ToolGate
          journey="buyer"
          variant="banner"
          title="Save your work across every tool"
          blurb="One free account keeps your comparisons, net sheets, and CMAs — and unlocks agent review on any of them."
          cta="Create a free account"
        />
      </div>
    </ToolShell>
  )
}
