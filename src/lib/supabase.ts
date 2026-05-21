import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'
  )
}

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_ANON_KEY = supabaseAnonKey
export const EDGE_FUNCTIONS_BASE_URL = `${supabaseUrl}/functions/v1`

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ---------------------------------------------------------------------------
// Typed schema (matches platform_foundation_multitenant migration)
// ---------------------------------------------------------------------------

export type TenantStatus = 'active' | 'suspended' | 'archived'
export type TenantTier = 'brokerage_admin' | 'affiliated_agent' | 'paid_external'

export type Tenant = {
  id: string
  slug: string
  display_name: string
  status: TenantStatus
  tier: TenantTier
  default_subdomain: string | null
  custom_domain: string | null
  created_at: string
  updated_at: string
}

export type TenantBranding = {
  tenant_id: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  heading_font: string
  body_font: string
  agent_name: string | null
  agent_title: string | null
  agent_bio: string | null
  agent_photo_url: string | null
  agent_email: string | null
  agent_phone: string | null
  dre_license: string | null
  brokerage_affiliation: string | null
  social_links: Record<string, string>
  hero_title: string | null
  hero_subtitle: string | null
  hero_image_url: string | null
  service_areas: string[]
}

export type UserProfile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_brokerage_admin: boolean
  status: 'active' | 'invited' | 'suspended'
}

export type TenantMembership = {
  tenant_id: string
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  created_at: string
}

export type AuditLogEntry = {
  id: string
  tenant_id: string | null
  user_id: string | null
  actor_kind: 'user' | 'ai' | 'system'
  action: string
  entity_kind: string | null
  entity_id: string | null
  chat_session_id: string | null
  metadata: Record<string, unknown>
  happened_at: string
}

// ---------------------------------------------------------------------------
// P2 CRM schema (matches p2_crm_contacts_foundation migration)
// ---------------------------------------------------------------------------

export type LifecycleStage =
  | 'new'
  | 'engaged'
  | 'qualified'
  | 'customer'
  | 'former_customer'

export type EmailSubscriptionStatus =
  | 'subscribed'
  | 'unsubscribed'
  | 'bounced'
  | 'complained'

export type SourceKind =
  | 'manual'
  | 'inbound_form'
  | 'csv_import'
  | 'prospecting'
  | 'referral'
  | 'api'
  | 'legacy_lead'

export type Contact = {
  id: string
  tenant_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  lifecycle_stage: LifecycleStage
  email_subscription_status: EmailSubscriptionStatus
  notes: string | null
  custom_fields: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ContactList = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  color: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ContactListMembership = {
  id: string
  tenant_id: string
  list_id: string
  contact_id: string
  added_by: string | null
  added_at: string
  removed_at: string | null
}

export type ContactTag = {
  id: string
  tenant_id: string
  name: string
  color: string | null
  created_at: string
}

export type ContactTagAssignment = {
  contact_id: string
  tag_id: string
  tenant_id: string
  applied_by: string | null
  applied_at: string
}

export type ContactSource = {
  id: string
  tenant_id: string
  contact_id: string
  source_kind: SourceKind
  source_label: string | null
  metadata: Record<string, unknown>
  occurred_at: string
}

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'new',
  'engaged',
  'qualified',
  'customer',
  'former_customer',
]

export const EMAIL_SUBSCRIPTION_STATUSES: EmailSubscriptionStatus[] = [
  'subscribed',
  'unsubscribed',
  'bounced',
  'complained',
]

// ---------------------------------------------------------------------------
// P3 Campaigns
// ---------------------------------------------------------------------------

export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'failed' | 'canceled'

export type Campaign = {
  id: string
  tenant_id: string
  name: string
  subject: string
  from_name: string
  from_email: string
  reply_to: string | null
  html_body: string
  plain_body: string
  list_id: string | null
  status: CampaignStatus
  recipient_count: number
  sent_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  failed_count: number
  scheduled_at: string | null
  sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CampaignRecipientStatus = 'pending' | 'sent' | 'bounced' | 'failed' | 'skipped' | 'complained'

export type CampaignRecipient = {
  id: string
  tenant_id: string
  campaign_id: string
  contact_id: string
  email_at_send: string
  tracking_token: string
  status: CampaignRecipientStatus
  resend_message_id: string | null
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  unsubscribed_at: string | null
  error_message: string | null
  created_at: string
}

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'draft',
  'queued',
  'sending',
  'sent',
  'failed',
  'canceled',
]

// ===========================================================================
// P8.1 — Client Portal types
// ===========================================================================

export type ClientType = 'buyer' | 'seller' | 'investor' | 'referral'
export type ClientStage = 'lead' | 'qualified' | 'active' | 'on_hold' | 'closed' | 'lost'

export type Client = {
  id: string
  tenant_id: string
  contact_id: string | null
  agent_id: string | null
  auth_user_id: string | null
  name: string
  email: string | null
  phone: string | null
  client_type: ClientType | null
  stage: ClientStage | null
  source_lead_id: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type DealType = 'buy' | 'sell' | 'lease' | 'investment'
export type DealStage = 'exploring' | 'active' | 'offer' | 'accepted' | 'escrow' | 'closed' | 'lost'
export type ServicePackage =
  | 'make_me_move'
  | 'coming_soon'
  | 'active_listing'
  | 'pre_market'
  | 'buyer_representation'
  | 'tbd'

export type Deal = {
  id: string
  tenant_id: string
  client_id: string
  property_id: string | null
  coming_soon_listing_id: string | null
  title: string | null
  deal_type: DealType
  stage: DealStage
  service_package: ServicePackage | null
  estimated_value: number | null
  actual_value: number | null
  estimated_commission: number | null
  actual_commission: number | null
  close_date: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type WarRoomStatus = 'active' | 'archived' | 'closed'

export type WarRoom = {
  id: string
  tenant_id: string
  deal_id: string | null
  client_id: string
  name: string
  status: WarRoomStatus
  last_message_at: string | null
  unread_agent: number
  unread_client: number
  created_at: string
  updated_at: string
}

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'sms'
  | 'note'
  | 'showing'
  | 'offer'
  | 'contract'
  | 'closing'
  | 'task'

export type Activity = {
  id: string
  tenant_id: string
  client_id: string
  deal_id: string | null
  activity_type: ActivityType
  subject: string | null
  body: string | null
  metadata: Record<string, unknown> | null
  occurred_at: string
  created_at: string
}

export type DocumentCategory =
  | 'disclosure'
  | 'contract'
  | 'offer'
  | 'inspection'
  | 'appraisal'
  | 'closing'
  | 'marketing'
  | 'cma'
  | 'other'

export type DocumentRecord = {
  id: string
  tenant_id: string
  client_id: string | null
  deal_id: string | null
  name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  category: DocumentCategory
  uploaded_by_type: 'agent' | 'client' | 'system'
  uploaded_by_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export const SERVICE_PACKAGES: { value: ServicePackage; label: string; blurb: string }[] = [
  {
    value: 'make_me_move',
    label: 'Make Me Move',
    blurb:
      'Owner sets a price they would accept. Surfaced to qualified buyers without a live listing. No marketing investment until an offer materializes.',
  },
  {
    value: 'coming_soon',
    label: 'Coming Soon',
    blurb:
      'Off-MLS marketing window before going live. Hero photos, single-property landing page, drip to warm buyer pool. Creates demand before the MLS clock starts.',
  },
  {
    value: 'active_listing',
    label: 'Active Listing',
    blurb:
      'Full-service MLS listing with photography, staging consult, syndication, open houses, social campaigns, and weekly seller reports.',
  },
  {
    value: 'pre_market',
    label: 'Pre-Market',
    blurb: 'Quiet prep phase — repairs, decluttering, pricing strategy. Not yet visible to buyers.',
  },
  {
    value: 'buyer_representation',
    label: 'Buyer Representation',
    blurb: 'Buy-side engagement. Tour scheduling, offer strategy, escrow management.',
  },
  { value: 'tbd', label: 'TBD', blurb: 'Service package not yet decided.' },
]

export const CLIENT_STAGES: ClientStage[] = ['lead', 'qualified', 'active', 'on_hold', 'closed', 'lost']
export const CLIENT_TYPES: ClientType[] = ['buyer', 'seller', 'investor', 'referral']
export const DEAL_STAGES: DealStage[] = ['exploring', 'active', 'offer', 'accepted', 'escrow', 'closed', 'lost']

// ===========================================================================
// P8.3 — Listing edits + notifications + CMAs
// ===========================================================================

export type ListingEditStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type ListingEdit = {
  id: string
  tenant_id: string
  deal_id: string
  listing_id: string | null
  proposed_by_user_id: string | null
  proposed_by_type: 'agent' | 'client'
  field_changes: Record<string, unknown>
  status: ListingEditStatus
  agent_response: string | null
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type NotificationRecord = {
  id: string
  tenant_id: string
  recipient_type: 'agent' | 'client'
  recipient_id: string
  notification_type: string
  title: string
  body: string | null
  link_url: string | null
  read_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type CMAStatus = 'draft' | 'published' | 'archived'

export type CMASubject = {
  address: string
  city: string
  state: string
  zip: string
  listPrice: number | null
  mls: string
  beds: number | null
  bathsFull: number | null
  bathsPartial: number | null
  sqft: number | null
  lotSqft: number | null
  yearBuilt: number | null
  propertyType: string
  garage: string
  parking: string
  cooling: string
  heating: string
  hoaMonthly: number | null
  listDate: string
  daysOnMarket: number | null
  remarks: string
}

export type CMAComp = {
  address: string
  city: string
  listPrice: number | null
  soldPrice: number | null
  beds: number | null
  bathsFull: number | null
  bathsPartial: number | null
  sqft: number | null
  lotSqft: number | null
  pricePerSqft: number | null
  percentOverList: number | null
  daysOnMarket: number | null
  soldDate: string
  soldDateIso: string
  mls: string
  photoUrl?: string
  listingUrl?: string
}

export type CMA = {
  id: string
  tenant_id: string | null
  client_id: string | null
  deal_id: string | null
  slug: string | null
  name: string | null
  property_address: string | null
  list_price: string | null
  cma_html: string | null
  subject_data: CMASubject | null
  comps_data: CMAComp[] | null
  status: CMAStatus
  agent_notes: string | null
  created_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'contract', label: 'Contract' },
  { value: 'offer', label: 'Offer' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'closing', label: 'Closing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'cma', label: 'CMA' },
  { value: 'other', label: 'Other' },
]

export const CLIENT_DOCUMENTS_BUCKET = 'client-documents'

// ============================================================
// P9.2 — External listings (Zillow links etc.)
// ============================================================
export type ExternalListingSource = 'zillow' | 'redfin' | 'realtor' | 'mls' | 'other'
export type ExternalListingClientStatus =
  | 'interested'
  | 'shortlist'
  | 'toured'
  | 'offered'
  | 'rejected'
export type ExternalListingFetchStatus = 'pending' | 'success' | 'failed' | 'manual'

export type ExternalListing = {
  id: string
  tenant_id: string
  client_id: string
  added_by_type: 'agent' | 'client'
  added_by_user_id: string | null
  source_kind: ExternalListingSource
  source_url: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lot_sqft: number | null
  year_built: number | null
  property_type: string | null
  hoa_monthly: number | null
  parking_type: string | null
  parking_spaces: number | null
  outdoor_features: string[]
  photo_url: string | null
  raw_extracted_data: unknown
  is_favorite: boolean
  notes: string | null
  client_status: ExternalListingClientStatus
  fetch_status: ExternalListingFetchStatus
  fetch_error: string | null
  fetched_at: string | null
  created_at: string
  updated_at: string
}

export const OUTDOOR_FEATURES: { value: string; label: string }[] = [
  { value: 'backyard', label: 'Backyard' },
  { value: 'patio', label: 'Patio' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'deck', label: 'Deck' },
  { value: 'pool', label: 'Pool' },
  { value: 'garden', label: 'Garden' },
]

export const PARKING_TYPES: { value: string; label: string }[] = [
  { value: 'garage', label: 'Garage' },
  { value: 'driveway', label: 'Driveway' },
  { value: 'carport', label: 'Carport' },
  { value: 'street', label: 'Street' },
  { value: 'none', label: 'None' },
]

export const EXTERNAL_LISTING_STATUSES: {
  value: ExternalListingClientStatus
  label: string
  color: string
}[] = [
  { value: 'interested', label: 'Interested', color: 'bg-ink-100 text-ink-700' },
  { value: 'shortlist', label: 'Shortlist', color: 'bg-blue-50 text-blue-700' },
  { value: 'toured', label: 'Toured', color: 'bg-amber-50 text-amber-700' },
  { value: 'offered', label: 'Offered', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-700' },
]
