// P8.3 + P9.11 + P9.12.0 — ListingEditor compatibility shim.
//
// Previously this file contained:
//   • the client copy editor (default export)
//   • the agent approval queue (ListingEditApprovals export)
//
// As of P9.12.0 both of those surfaces are subsumed by the new ListingBuilder
// chassis, which renders the whole listing-component dashboard. This file
// stays as a shim so the existing Portal.tsx and Clients.tsx imports keep
// working — no upstream changes needed.

import { Deal } from '@/lib/supabase'
import ListingBuilder from './ListingBuilder'

// Client-facing surface — rendered in Portal.tsx's "My listing" tab
export default function ListingEditor({ deal }: { deal: Deal }) {
  return <ListingBuilder deal={deal} mode="client" />
}

// Agent-facing surface — rendered in Clients.tsx's "Listing & Service" tab
export function ListingEditApprovals({ deal }: { deal: Deal }) {
  return <ListingBuilder deal={deal} mode="agent" />
}
