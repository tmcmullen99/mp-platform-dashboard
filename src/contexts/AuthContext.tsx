import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Tenant, TenantBranding, UserProfile, Client } from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  clientProfile: Client | null
  isAgent: boolean
  isClient: boolean
  currentTenant: Tenant | null
  currentBranding: TenantBranding | null
  availableTenants: Tenant[]
  loading: boolean
  signOut: () => Promise<void>
  switchTenant: (tenantId: string) => void
  isOversight: boolean
  actAsTenant: (tenantId: string) => void
  enterOversight: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const CURRENT_TENANT_KEY = 'mp_current_tenant_id'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [clientProfile, setClientProfile] = useState<Client | null>(null)
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

        // Client membership (if this auth user is linked to a client row)
        const { data: clientRow } = await supabase
          .from('clients')
          .select('*')
          .eq('auth_user_id', userId)
          .maybeSingle()

        if (cancelled) return
        setClientProfile(clientRow as Client | null)

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

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        clientProfile,
        isAgent: availableTenants.length > 0,
        isClient: !!clientProfile,
        currentTenant,
        currentBranding,
        availableTenants,
        loading,
        signOut,
        switchTenant,
        isOversight,
        actAsTenant,
        enterOversight,
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
