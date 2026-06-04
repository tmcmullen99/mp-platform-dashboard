import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Tenant, TenantBranding, UserProfile, Client, ClientType, CalendarProvider } from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  clientProfile: Client | null
  isAgent: boolean
  isClient: boolean
  // Portal routing: which experience the client sees. Derived from
  // clientProfile.client_type. 'both' surfaces a Buyer/Seller switch.
  clientType: ClientType | null
  calendarProvider: CalendarProvider | null
  calendarPrefs: Record<string, unknown> | null
  // Member metadata (from client_members junction). Null for agents or
  // legacy clients resolved via the fallback path.
  memberDisplayName: string | null
  memberRelationship: string | null
  memberIsPrimary: boolean
  memberOnboardedAt: string | null
  currentTenant: Tenant | null
  currentBranding: TenantBranding | null
  availableTenants: Tenant[]
  loading: boolean
  signOut: () => Promise<void>
  switchTenant: (tenantId: string) => void
  isOversight: boolean
  actAsTenant: (tenantId: string) => void
  enterOversight: () => void
  markOnboarded: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const CURRENT_TENANT_KEY = 'mp_current_tenant_id'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [clientProfile, setClientProfile] = useState<Client | null>(null)
  const [memberDisplayName, setMemberDisplayName] = useState<string | null>(null)
  const [memberRelationship, setMemberRelationship] = useState<string | null>(null)
  const [memberIsPrimary, setMemberIsPrimary] = useState(false)
  const [memberOnboardedAt, setMemberOnboardedAt] = useState<string | null>(null)
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([])
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [currentBranding, setCurrentBranding] = useState<TenantBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOversight, setIsOversight] = useState(false)

  // Subscribe to auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load profile + tenants when session changes
  useEffect(() => {
    let cancelled = false

    if (!session?.user) {
      setProfile(null)
      setClientProfile(null)
      setMemberDisplayName(null)
      setMemberRelationship(null)
      setMemberIsPrimary(false)
      setMemberOnboardedAt(null)
      setAvailableTenants([])
      setCurrentTenant(null)
      setCurrentBranding(null)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      try {
        const userId = session!.user.id

        // Profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (cancelled) return
        setProfile(profileData as UserProfile | null)

        // Tenant memberships (with joined tenants)
        const { data: memberships } = await supabase
          .from('tenant_users')
          .select('role, tenants:tenants(*)')
          .eq('user_id', userId)

        // Client membership — junction-first, legacy fallback.
        // Primary path: resolve via client_members (supports multiple logins
        // per client, e.g. spouses). Captures member metadata for the
        // first-login tour. Fallback path: legacy clients.auth_user_id, so any
        // client provisioned before the junction still resolves.
        let resolvedClient: Client | null = null
        let memberMeta: {
          display_name: string | null
          relationship: string | null
          is_primary: boolean
          onboarded_at: string | null
        } | null = null

        const { data: memberRow } = await supabase
          .from('client_members')
          .select('display_name, relationship, is_primary, onboarded_at, clients:clients(*)')
          .eq('auth_user_id', userId)
          .maybeSingle()

        if (memberRow) {
          const joined = (memberRow as { clients: Client | Client[] | null }).clients
          resolvedClient = (Array.isArray(joined) ? joined[0] : joined) ?? null
          memberMeta = {
            display_name: (memberRow as { display_name: string | null }).display_name ?? null,
            relationship: (memberRow as { relationship: string | null }).relationship ?? null,
            is_primary: !!(memberRow as { is_primary: boolean | null }).is_primary,
            onboarded_at: (memberRow as { onboarded_at: string | null }).onboarded_at ?? null,
          }
        } else {
          // Legacy fallback
          const { data: legacyRow } = await supabase
            .from('clients')
            .select('*')
            .eq('auth_user_id', userId)
            .maybeSingle()
          resolvedClient = (legacyRow as Client | null) ?? null
        }

        if (cancelled) return
        setClientProfile(resolvedClient)
        setMemberDisplayName(memberMeta?.display_name ?? null)
        setMemberRelationship(memberMeta?.relationship ?? null)
        setMemberIsPrimary(memberMeta?.is_primary ?? false)
        setMemberOnboardedAt(memberMeta?.onboarded_at ?? null)

        if (cancelled) return

        const tenants: Tenant[] = ((memberships ?? []) as Array<{ tenants: Tenant | Tenant[] | null }>)
          .flatMap((m) => (Array.isArray(m.tenants) ? m.tenants : m.tenants ? [m.tenants] : []))

        setAvailableTenants(tenants)

        // Resolve current tenant
        const savedId = localStorage.getItem(CURRENT_TENANT_KEY)
        const resolved = tenants.find((t) => t.id === savedId) || tenants[0] || null
        setCurrentTenant(resolved)

        if (resolved) {
          const { data: brand } = await supabase
            .from('tenant_branding')
            .select('*')
            .eq('tenant_id', resolved.id)
            .maybeSingle()
          if (cancelled) return
          setCurrentBranding(brand as TenantBranding | null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem(CURRENT_TENANT_KEY)
  }

  function switchTenant(tenantId: string) {
    const t = availableTenants.find((x) => x.id === tenantId)
    if (!t) return
    setCurrentTenant(t)
    localStorage.setItem(CURRENT_TENANT_KEY, tenantId)
    supabase
      .from('tenant_branding')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then(({ data }) => setCurrentBranding(data as TenantBranding | null))
  }

  // Brokerage-admin tenant scoping. actAsTenant pins one tenant; enterOversight
  // returns to the cross-tenant (all tenants) view.
  function actAsTenant(tenantId: string) {
    setIsOversight(false)
    switchTenant(tenantId)
  }

  function enterOversight() {
    setIsOversight(true)
  }

  // Marks the current member's first-login tour complete (sets onboarded_at
  // server-side via RPC) and updates local state so the tour won't re-trigger
  // this session.
  async function markOnboarded() {
    const { error } = await supabase.rpc('mark_member_onboarded')
    if (!error) setMemberOnboardedAt(new Date().toISOString())
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        clientProfile,
        isAgent: availableTenants.length > 0,
        isClient: !!clientProfile,
        clientType: clientProfile?.client_type ?? null,
        calendarProvider: clientProfile?.calendar_provider ?? null,
        calendarPrefs: clientProfile?.calendar_prefs ?? null,
        memberDisplayName,
        memberRelationship,
        memberIsPrimary,
        memberOnboardedAt,
        currentTenant,
        currentBranding,
        availableTenants,
        loading,
        signOut,
        switchTenant,
        isOversight,
        actAsTenant,
        enterOversight,
        markOnboarded,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
