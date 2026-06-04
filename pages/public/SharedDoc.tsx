// Public, read-only shared-document page. No auth required. Resolves a
// /share/:token link via the get_shared Edge Function (verify_jwt = false) and
// renders the document with the same brand template used in-app. Generic over
// entity kind — CMA today; Net Sheet and others slot in here later.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CMASubject, CMAComp } from '@/lib/supabase'
import CMATemplate from '@/components/CMATemplate'

type Branding = {
  agent_name?: string | null
  agent_phone?: string | null
  agent_email?: string | null
  brokerage_affiliation?: string | null
}

type CmaPayload = {
  name?: string | null
  property_address?: string | null
  list_price?: string | null
  subject_data: CMASubject | null
  comps_data: CMAComp[] | null
  agent_notes?: string | null
  published_at?: string | null
  created_at?: string | null
}

export default function SharedDoc() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<string>('')
  const [data, setData] = useState<CmaPayload | null>(null)
  const [branding, setBranding] = useState<Branding | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      const { data: res, error: e } = await supabase.functions.invoke('get_shared', {
        body: { token },
      })
      if (cancelled) return
      if (e || !res?.ok) {
        const reason = res?.reason || e?.message || 'not_found'
        setError(
          reason === 'expired' || reason === 'revoked'
            ? 'This share link is no longer active.'
            : 'This shared document could not be found.'
        )
        setLoading(false)
        return
      }
      setKind(res.kind)
      setData(res.data)
      setBranding(res.branding || null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
            McMullen Properties
          </div>
          <p className="text-ink-700">{error || 'Not found.'}</p>
        </div>
      </div>
    )
  }

  if (kind === 'cma') {
    const subject = (data.subject_data || {
      address: data.property_address || data.name || 'Subject property',
      city: '',
      state: '',
      zip: '',
      listPrice: data.list_price ? Number(data.list_price.replace(/[^\d]/g, '')) : null,
      mls: '',
      beds: null,
      bathsFull: null,
      bathsPartial: null,
      sqft: null,
      lotSqft: null,
      yearBuilt: null,
      propertyType: '',
      garage: '',
      parking: '',
      cooling: '',
      heating: '',
      hoaMonthly: null,
      listDate: '',
      daysOnMarket: null,
      remarks: '',
    }) as CMASubject
    const comps = (data.comps_data || []) as CMAComp[]

    return (
      <div className="min-h-screen bg-cream">
        <div className="max-w-5xl mx-auto p-6 md:p-12">
          <CMATemplate
            subject={subject}
            comps={comps}
            agentName={branding?.agent_name}
            agentPhone={branding?.agent_phone}
            agentEmail={branding?.agent_email}
            brokerageName={branding?.brokerage_affiliation}
            agentNotes={data.agent_notes}
            preparedAt={data.published_at || data.created_at}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-8">
      <p className="text-ink-700">Unsupported document type.</p>
    </div>
  )
}
