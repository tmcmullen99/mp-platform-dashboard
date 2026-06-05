// src/portal/seller/SellerDocuments.tsx
// Documents tab — disclosures, agreements, CMAs, inspections. Opens/views in
// the dashboard via DocumentManager's signed-URL open (window.open in a new
// tab). Data path: documents table + client-documents bucket, unchanged.
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/portal/shared/ui'
import DocumentManager from '@/components/DocumentManager'

export default function SellerDocuments() {
  const { clientProfile } = useAuth()
  if (!clientProfile) return null
  return (
    <div>
      <PageHeader eyebrow="Documents" title="Your listing documents.">
        Listing agreements, disclosures, CMAs, inspection results — everything you and your agent
        have shared. Click any document to open it.
      </PageHeader>
      <DocumentManager
        tenantId={clientProfile.tenant_id}
        clientId={clientProfile.id}
        uploaderType="client"
      />
    </div>
  )
}
