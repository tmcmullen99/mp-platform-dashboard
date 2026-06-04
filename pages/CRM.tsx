import { useEffect, useMemo, useState, FormEvent } from 'react'
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  Users,
  ListPlus,
  UserPlus,
  Search,
  ChevronLeft,
  X,
  Plus,
  Tag as TagIcon,
  Mail,
  Phone,
  Folder,
  ArrowUpRight,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
  Contact,
  ContactList,
  ContactTag,
  ContactSource,
  LifecycleStage,
  EmailSubscriptionStatus,
  LIFECYCLE_STAGES,
  EMAIL_SUBSCRIPTION_STATUSES,
} from '@/lib/supabase'

export default function CRM() {
  return (
    <Routes>
      <Route index element={<ListsView />} />
      <Route path="all" element={<ContactsView />} />
      <Route path="lists/:listId" element={<ContactsView />} />
      <Route path="contacts/:contactId" element={<ContactDetailView />} />
    </Routes>
  )
}

// ===========================================================================
// LISTS VIEW — default /crm landing
// ===========================================================================

function ListsView() {
  const { currentTenant } = useAuth()
  const [lists, setLists] = useState<ContactList[]>([])
  const [memberCounts, setMemberCounts] = useState<Map<string, number>>(new Map())
  const [totalContacts, setTotalContacts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [contactCreateOpen, setContactCreateOpen] = useState(false)

  async function refresh() {
    if (!currentTenant) return
    setLoading(true)
    const [{ data: listsData }, { data: memData }, { count: contactsCount }] =
      await Promise.all([
        supabase
          .from('contact_lists')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('contact_list_memberships')
          .select('list_id')
          .eq('tenant_id', currentTenant.id)
          .is('removed_at', null),
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id),
      ])
    const counts = new Map<string, number>()
    for (const row of (memData || []) as { list_id: string }[]) {
      counts.set(row.list_id, (counts.get(row.list_id) || 0) + 1)
    }
    setLists((listsData as ContactList[]) || [])
    setMemberCounts(counts)
    setTotalContacts(contactsCount || 0)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id])

  return (
    <div className="p-12 max-w-6xl">
      <div className="flex items-start justify-between mb-12">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
            Contacts & Lists
          </div>
          <h1 className="font-display text-4xl text-ink-900 leading-[1.1]">CRM</h1>
          <p className="mt-3 text-ink-600 text-base font-light leading-relaxed max-w-2xl">
            The list-centric core. Group contacts into lists, tag them for segmentation,
            and the rest of the platform writes engagement back here.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/crm/import"
            className="flex items-center gap-2 border border-ink-200 px-4 py-2.5 text-sm text-ink-700 hover:border-ink-900 hover:text-ink-900 transition-colors"
          >
            <Upload className="w-4 h-4" strokeWidth={1.5} />
            Import CSV
          </Link>
          <button
            onClick={() => setContactCreateOpen(true)}
            className="flex items-center gap-2 border border-ink-200 px-4 py-2.5 text-sm text-ink-700 hover:border-ink-900 hover:text-ink-900 transition-colors"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.5} />
            New contact
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-ink-900 text-cream px-4 py-2.5 text-sm hover:bg-ink-800 transition-colors"
          >
            <ListPlus className="w-4 h-4" strokeWidth={1.5} />
            New list
          </button>
        </div>
      </div>

      <SectionLabel>All</SectionLabel>
      <Link
        to="/crm/all"
        className="block bg-white border border-ink-100 p-6 mb-12 hover:border-ink-300 transition-colors group"
      >
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 bg-ink-900 text-cream flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-ink-900">All contacts</div>
            <div className="text-sm text-ink-500 mt-1">
              {totalContacts} {totalContacts === 1 ? 'contact' : 'contacts'} in this workspace
            </div>
          </div>
          <ArrowUpRight
            className="w-5 h-5 text-ink-400 group-hover:text-ink-900 transition-colors"
            strokeWidth={1.5}
          />
        </div>
      </Link>

      <SectionLabel>Lists</SectionLabel>
      {loading ? (
        <div className="text-sm text-ink-500 py-12 text-center">Loading lists…</div>
      ) : lists.length === 0 ? (
        <div className="border border-dashed border-ink-200 p-12 text-center">
          <Folder className="w-8 h-8 mx-auto mb-4 text-ink-300" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 mb-1">No lists yet</div>
          <div className="text-xs text-ink-500 mb-6">
            Create your first list to start segmenting contacts.
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-ink-900 text-cream px-4 py-2 text-sm hover:bg-ink-800 transition-colors"
          >
            <ListPlus className="w-4 h-4" strokeWidth={1.5} />
            Create first list
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <Link
              key={list.id}
              to={`/crm/lists/${list.id}`}
              className="block bg-white border border-ink-100 p-5 hover:border-ink-300 transition-colors group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-2 h-2 rounded-full mt-2 shrink-0"
                  style={{ background: list.color || '#91a1ba' }}
                />
                <div className="font-display text-lg text-ink-900 leading-tight flex-1 min-w-0">
                  {list.name}
                </div>
                <ArrowUpRight
                  className="w-4 h-4 text-ink-300 group-hover:text-ink-900 transition-colors shrink-0"
                  strokeWidth={1.5}
                />
              </div>
              {list.description && (
                <p className="text-sm text-ink-600 leading-relaxed mb-4 line-clamp-2">
                  {list.description}
                </p>
              )}
              <div className="text-2xs uppercase tracking-widest text-ink-500">
                {memberCounts.get(list.id) || 0}{' '}
                {(memberCounts.get(list.id) || 0) === 1 ? 'member' : 'members'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateListModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      )}
      {contactCreateOpen && (
        <CreateContactModal
          allLists={lists}
          onClose={() => setContactCreateOpen(false)}
          onCreated={() => {
            setContactCreateOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ===========================================================================
// CONTACTS VIEW — /crm/all or /crm/lists/:listId
// ===========================================================================

function ContactsView() {
  const { currentTenant } = useAuth()
  const { listId } = useParams()
  const [list, setList] = useState<ContactList | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tagsByContact, setTagsByContact] = useState<Map<string, ContactTag[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [allLists, setAllLists] = useState<ContactList[]>([])

  async function refresh() {
    if (!currentTenant) return
    setLoading(true)

    // 1. Fetch the named list metadata (if filtering)
    let listMeta: ContactList | null = null
    if (listId) {
      const { data } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('id', listId)
        .single()
      listMeta = (data as ContactList) || null
    }
    setList(listMeta)

    // 2. Fetch contact IDs (filtered or all)
    let contactIds: string[] | null = null
    if (listId) {
      const { data: memData } = await supabase
        .from('contact_list_memberships')
        .select('contact_id')
        .eq('list_id', listId)
        .is('removed_at', null)
      contactIds = ((memData || []) as { contact_id: string }[]).map(
        (r) => r.contact_id,
      )
    }

    // 3. Fetch contacts
    let q = supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false })
      .limit(500)
    if (contactIds) {
      if (contactIds.length === 0) {
        setContacts([])
        setTagsByContact(new Map())
        setLoading(false)
        return
      }
      q = q.in('id', contactIds)
    }
    const { data: contactsData } = await q
    const list1 = (contactsData as Contact[]) || []
    setContacts(list1)

    // 4. Fetch tag assignments + tags for these contacts
    const ids = list1.map((c) => c.id)
    if (ids.length > 0) {
      const { data: tagAssigns } = await supabase
        .from('contact_tag_assignments')
        .select('contact_id, contact_tags(id, name, color)')
        .in('contact_id', ids)
      const byContact = new Map<string, ContactTag[]>()
      for (const row of (tagAssigns || []) as any[]) {
        const tag = row.contact_tags as ContactTag | null
        if (!tag) continue
        const arr = byContact.get(row.contact_id) || []
        arr.push(tag)
        byContact.set(row.contact_id, arr)
      }
      setTagsByContact(byContact)
    } else {
      setTagsByContact(new Map())
    }

    // 5. Fetch all lists (for create modal)
    const { data: allListsData } = await supabase
      .from('contact_lists')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('name', { ascending: true })
    setAllLists((allListsData as ContactList[]) || [])

    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id, listId])

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts
    const q = search.toLowerCase().trim()
    return contacts.filter((c) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase()
      return (
        (c.email && c.email.toLowerCase().includes(q)) ||
        name.includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      )
    })
  }, [contacts, search])

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-2">
        <Link
          to="/crm"
          className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" strokeWidth={2} />
          Back to lists
        </Link>
      </div>

      <div className="flex items-start justify-between mb-10 mt-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-3">
            {list?.color && (
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: list.color }}
              />
            )}
            <h1 className="font-display text-4xl text-ink-900 leading-[1.1] truncate">
              {list ? list.name : 'All contacts'}
            </h1>
          </div>
          {list?.description && (
            <p className="text-ink-600 text-base font-light leading-relaxed">
              {list.description}
            </p>
          )}
          <div className="text-2xs uppercase tracking-widest text-ink-500 mt-3">
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
            {search.trim() && contacts.length !== filtered.length && (
              <span> · filtered from {contacts.length}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-ink-900 text-cream px-4 py-2.5 text-sm hover:bg-ink-800 transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.5} />
          New contact
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search
            className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full border border-ink-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-ink-500 py-12 text-center">Loading contacts…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-ink-200 p-12 text-center">
          <Users className="w-8 h-8 mx-auto mb-4 text-ink-300" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 mb-1">
            {contacts.length === 0 ? 'No contacts yet' : 'No matches'}
          </div>
          <div className="text-xs text-ink-500 mb-6">
            {contacts.length === 0
              ? list
                ? 'Add a contact to this list.'
                : 'Add your first contact to start building lists.'
              : 'Try a different search.'}
          </div>
          {contacts.length === 0 && (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 bg-ink-900 text-cream px-4 py-2 text-sm hover:bg-ink-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              Add first contact
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-ink-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/50">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Stage</Th>
                <Th>Tags</Th>
                <Th align="right">Added</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/30 cursor-pointer transition-colors"
                  onClick={() => {
                    window.location.assign(`/crm/contacts/${c.id}`)
                  }}
                >
                  <Td>{formatName(c) || <span className="text-ink-400">—</span>}</Td>
                  <Td>
                    {c.email ? (
                      <span className="font-mono text-xs">{c.email}</span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </Td>
                  <Td>
                    {c.phone ? (
                      <span className="font-mono text-xs">{c.phone}</span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <LifecycleBadge stage={c.lifecycle_stage} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {(tagsByContact.get(c.id) || []).slice(0, 3).map((t) => (
                        <TagPill key={t.id} tag={t} compact />
                      ))}
                      {(tagsByContact.get(c.id) || []).length > 3 && (
                        <span className="text-2xs text-ink-400">
                          +{(tagsByContact.get(c.id) || []).length - 3}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-2xs text-ink-500">
                      {new Date(c.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <CreateContactModal
          allLists={allLists}
          initialListId={listId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ===========================================================================
// CONTACT DETAIL VIEW — /crm/contacts/:contactId
// ===========================================================================

function ContactDetailView() {
  const { currentTenant } = useAuth()
  const { contactId } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [memberships, setMemberships] = useState<
    Array<{ id: string; list: ContactList }>
  >([])
  const [tags, setTags] = useState<ContactTag[]>([])
  const [sources, setSources] = useState<ContactSource[]>([])
  const [allLists, setAllLists] = useState<ContactList[]>([])
  const [loading, setLoading] = useState(true)
  const [newTagInput, setNewTagInput] = useState('')
  const [tagBusy, setTagBusy] = useState(false)
  const [listPickerOpen, setListPickerOpen] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesBuffer, setNotesBuffer] = useState('')

  async function refresh() {
    if (!currentTenant || !contactId) return
    setLoading(true)

    const [
      { data: contactData },
      { data: memData },
      { data: tagData },
      { data: srcData },
      { data: listsData },
    ] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', contactId).single(),
      supabase
        .from('contact_list_memberships')
        .select('id, contact_lists(*)')
        .eq('contact_id', contactId)
        .is('removed_at', null),
      supabase
        .from('contact_tag_assignments')
        .select('contact_tags(id, name, color, tenant_id, created_at)')
        .eq('contact_id', contactId),
      supabase
        .from('contact_sources')
        .select('*')
        .eq('contact_id', contactId)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('contact_lists')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name'),
    ])

    const c = (contactData as Contact) || null
    setContact(c)
    setNotesBuffer(c?.notes || '')
    setMemberships(
      ((memData || []) as any[])
        .filter((row) => row.contact_lists)
        .map((row) => ({ id: row.id, list: row.contact_lists as ContactList })),
    )
    setTags(
      ((tagData || []) as any[])
        .map((row) => row.contact_tags as ContactTag | null)
        .filter(Boolean) as ContactTag[],
    )
    setSources((srcData as ContactSource[]) || [])
    setAllLists((listsData as ContactList[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, currentTenant?.id])

  async function updateField(field: keyof Contact, value: any) {
    if (!contact) return
    await supabase.from('contacts').update({ [field]: value }).eq('id', contact.id)
    setContact({ ...contact, [field]: value })
  }

  async function saveNotes() {
    if (!contact) return
    setSavingNotes(true)
    await supabase
      .from('contacts')
      .update({ notes: notesBuffer || null })
      .eq('id', contact.id)
    setContact({ ...contact, notes: notesBuffer || null })
    setSavingNotes(false)
  }

  async function removeMembership(membershipId: string) {
    await supabase
      .from('contact_list_memberships')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', membershipId)
    refresh()
  }

  async function addToList(listId: string) {
    if (!contact || !currentTenant) return
    const { data: existing } = await supabase
      .from('contact_list_memberships')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('list_id', listId)
      .is('removed_at', null)
      .maybeSingle()
    if (existing) return
    await supabase.from('contact_list_memberships').insert({
      tenant_id: currentTenant.id,
      list_id: listId,
      contact_id: contact.id,
    })
    setListPickerOpen(false)
    refresh()
  }

  async function addTag(name: string) {
    if (!contact || !currentTenant) return
    const trimmed = name.trim()
    if (!trimmed) return
    setTagBusy(true)

    // 1. Ensure tag exists (case-insensitive)
    const { data: existing } = await supabase
      .from('contact_tags')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .ilike('name', trimmed)
      .maybeSingle()

    let tag = existing as ContactTag | null
    if (!tag) {
      const { data: created } = await supabase
        .from('contact_tags')
        .insert({ tenant_id: currentTenant.id, name: trimmed })
        .select('*')
        .single()
      tag = created as ContactTag
    }
    if (!tag) {
      setTagBusy(false)
      return
    }

    // 2. Assign (idempotent via PK conflict)
    await supabase
      .from('contact_tag_assignments')
      .upsert(
        {
          contact_id: contact.id,
          tag_id: tag.id,
          tenant_id: currentTenant.id,
        },
        { onConflict: 'contact_id,tag_id' },
      )

    setNewTagInput('')
    setTagBusy(false)
    refresh()
  }

  async function removeTag(tagId: string) {
    if (!contact) return
    await supabase
      .from('contact_tag_assignments')
      .delete()
      .eq('contact_id', contact.id)
      .eq('tag_id', tagId)
    refresh()
  }

  if (loading || !contact) {
    return (
      <div className="p-12 max-w-4xl">
        <Link
          to="/crm"
          className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" strokeWidth={2} />
          Back to CRM
        </Link>
        <div className="text-sm text-ink-500 py-12 text-center">
          {loading ? 'Loading contact…' : 'Contact not found.'}
        </div>
      </div>
    )
  }

  const availableLists = allLists.filter(
    (l) => !memberships.some((m) => m.list.id === l.id),
  )

  return (
    <div className="p-12 max-w-4xl">
      <Link
        to="/crm"
        className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-3 h-3" strokeWidth={2} />
        Back to CRM
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-4xl text-ink-900 leading-[1.1] mb-3">
          {formatName(contact) || (
            <span className="text-ink-400 italic">Unnamed contact</span>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600">
          {contact.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.75} />
              <a
                href={`mailto:${contact.email}`}
                className="font-mono text-xs hover:text-ink-900"
              >
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.75} />
              <a
                href={`tel:${contact.phone}`}
                className="font-mono text-xs hover:text-ink-900"
              >
                {contact.phone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Stage + subscription */}
      <section className="mb-10">
        <SectionLabel>Status</SectionLabel>
        <div className="bg-white border border-ink-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Lifecycle stage
            </div>
            <select
              value={contact.lifecycle_stage}
              onChange={(e) =>
                updateField('lifecycle_stage', e.target.value as LifecycleStage)
              }
              className="w-full border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-ink-900 transition-colors bg-white"
            >
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Email subscription
            </div>
            <select
              value={contact.email_subscription_status}
              onChange={(e) =>
                updateField(
                  'email_subscription_status',
                  e.target.value as EmailSubscriptionStatus,
                )
              }
              className="w-full border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-ink-900 transition-colors bg-white"
            >
              {EMAIL_SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Lists */}
      <section className="mb-10">
        <SectionLabel>Lists</SectionLabel>
        <div className="bg-white border border-ink-100 p-6">
          {memberships.length === 0 && (
            <div className="text-sm text-ink-500 mb-4">Not on any lists yet.</div>
          )}
          {memberships.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {memberships.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-2 border border-ink-200 px-3 py-1.5 text-sm group"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: m.list.color || '#91a1ba' }}
                  />
                  <Link
                    to={`/crm/lists/${m.list.id}`}
                    className="text-ink-700 hover:text-ink-900"
                  >
                    {m.list.name}
                  </Link>
                  <button
                    onClick={() => removeMembership(m.id)}
                    className="text-ink-300 hover:text-red-600 transition-colors"
                    title="Remove from list"
                  >
                    <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {availableLists.length > 0 && (
            <>
              {!listPickerOpen ? (
                <button
                  onClick={() => setListPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 transition-colors"
                >
                  <Plus className="w-3 h-3" strokeWidth={2} />
                  Add to list
                </button>
              ) : (
                <div className="border-t border-ink-100 pt-4 mt-2">
                  <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
                    Add to list
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableLists.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => addToList(l.id)}
                        className="inline-flex items-center gap-2 border border-ink-200 px-3 py-1.5 text-sm hover:border-ink-900 transition-colors"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: l.color || '#91a1ba' }}
                        />
                        {l.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setListPickerOpen(false)}
                      className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors px-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Tags */}
      <section className="mb-10">
        <SectionLabel>Tags</SectionLabel>
        <div className="bg-white border border-ink-100 p-6">
          {tags.length === 0 && (
            <div className="text-sm text-ink-500 mb-4">No tags applied.</div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((t) => (
                <div
                  key={t.id}
                  className="inline-flex items-center gap-2 border border-ink-200 px-3 py-1.5 text-sm"
                >
                  <TagIcon className="w-3 h-3 text-ink-400" strokeWidth={1.75} />
                  <span className="text-ink-700">{t.name}</span>
                  <button
                    onClick={() => removeTag(t.id)}
                    className="text-ink-300 hover:text-red-600 transition-colors"
                    title="Remove tag"
                  >
                    <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addTag(newTagInput)
            }}
            className="flex gap-2 items-center"
          >
            <input
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="Add tag…"
              disabled={tagBusy}
              className="flex-1 max-w-xs border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-ink-900 transition-colors"
            />
            <button
              type="submit"
              disabled={tagBusy || !newTagInput.trim()}
              className="inline-flex items-center gap-1.5 border border-ink-200 px-3 py-2 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 transition-colors disabled:opacity-40"
            >
              {tagBusy ? (
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />
              ) : (
                <Plus className="w-3 h-3" strokeWidth={2} />
              )}
              Add
            </button>
          </form>
        </div>
      </section>

      {/* Notes */}
      <section className="mb-10">
        <SectionLabel>Notes</SectionLabel>
        <div className="bg-white border border-ink-100 p-6">
          <textarea
            value={notesBuffer}
            onChange={(e) => setNotesBuffer(e.target.value)}
            rows={4}
            placeholder="Internal notes about this contact…"
            className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors resize-y"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={saveNotes}
              disabled={savingNotes || notesBuffer === (contact.notes || '')}
              className="bg-ink-900 text-cream px-4 py-2 text-2xs uppercase tracking-widest hover:bg-ink-800 transition-colors disabled:opacity-40"
            >
              {savingNotes ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section>
        <SectionLabel>Sources</SectionLabel>
        <div className="bg-white border border-ink-100 p-6">
          {sources.length === 0 ? (
            <div className="text-sm text-ink-500">No source records.</div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {sources.map((s) => (
                <li key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                  <div className="font-mono text-2xs uppercase tracking-widest text-ink-500 shrink-0 w-32 pt-0.5">
                    {s.source_kind}
                  </div>
                  <div className="flex-1 min-w-0">
                    {s.source_label && (
                      <div className="text-sm text-ink-700">{s.source_label}</div>
                    )}
                    <div className="text-xs text-ink-500 font-mono">
                      {new Date(s.occurred_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Danger zone */}
      <section className="mt-16 pt-8 border-t border-ink-100">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-4">
          Danger zone
        </div>
        <button
          onClick={async () => {
            if (!contact) return
            const ok = confirm(
              `Delete ${formatName(contact) || contact.email || 'this contact'} permanently? This cannot be undone.`,
            )
            if (!ok) return
            await supabase.from('contacts').delete().eq('id', contact.id)
            navigate('/crm')
          }}
          className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors"
        >
          <Trash2 className="w-3 h-3" strokeWidth={2} />
          Delete contact
        </button>
      </section>
    </div>
  )
}

// ===========================================================================
// MODALS
// ===========================================================================

function CreateListModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { currentTenant } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#91a1ba')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!currentTenant || !name.trim()) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase.from('contact_lists').insert({
      tenant_id: currentTenant.id,
      name: name.trim(),
      description: description.trim() || null,
      color,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onCreated()
  }

  return (
    <ModalShell title="New list" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Eichler homeowners"
            required
            autoFocus
            className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional. What's this list for?"
            className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors resize-none"
          />
        </Field>
        <Field label="Color">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        {err && (
          <div className="text-xs text-red-600 font-mono border border-red-200 bg-red-50 p-2">
            {err}
          </div>
        )}
        <ModalActions
          submitLabel={busy ? 'Creating…' : 'Create list'}
          submitDisabled={busy || !name.trim()}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  )
}

function CreateContactModal({
  allLists,
  initialListId,
  onClose,
  onCreated,
}: {
  allLists: ContactList[]
  initialListId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const { currentTenant, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>('new')
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set(initialListId ? [initialListId] : []),
  )
  const [tagInput, setTagInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!currentTenant) return
    if (!email.trim() && !firstName.trim() && !lastName.trim() && !phone.trim()) {
      setErr('Provide at least an email, name, or phone.')
      return
    }
    setBusy(true)
    setErr(null)

    // 1. Insert contact
    const normalizedEmail = email.trim().toLowerCase() || null
    const { data: created, error: insertErr } = await supabase
      .from('contacts')
      .insert({
        tenant_id: currentTenant.id,
        email: normalizedEmail,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        lifecycle_stage: lifecycleStage,
        created_by: profile?.id || null,
      })
      .select('*')
      .single()

    if (insertErr || !created) {
      setBusy(false)
      const code = (insertErr as any)?.code
      setErr(
        code === '23505'
          ? 'A contact with that email already exists.'
          : insertErr?.message || 'Failed to create contact.',
      )
      return
    }
    const contact = created as Contact

    // 2. List memberships
    const listIdsArr = [...selectedListIds]
    if (listIdsArr.length > 0) {
      await supabase.from('contact_list_memberships').insert(
        listIdsArr.map((listId) => ({
          tenant_id: currentTenant.id,
          list_id: listId,
          contact_id: contact.id,
          added_by: profile?.id || null,
        })),
      )
    }

    // 3. Tags (ensure each, then assign)
    const tagNames = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    for (const name of tagNames) {
      const { data: existing } = await supabase
        .from('contact_tags')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .ilike('name', name)
        .maybeSingle()
      let tag = existing as ContactTag | null
      if (!tag) {
        const { data: createdTag } = await supabase
          .from('contact_tags')
          .insert({ tenant_id: currentTenant.id, name })
          .select('*')
          .single()
        tag = createdTag as ContactTag
      }
      if (tag) {
        await supabase.from('contact_tag_assignments').upsert(
          {
            contact_id: contact.id,
            tag_id: tag.id,
            tenant_id: currentTenant.id,
            applied_by: profile?.id || null,
          },
          { onConflict: 'contact_id,tag_id' },
        )
      }
    }

    // 4. Source record
    await supabase.from('contact_sources').insert({
      tenant_id: currentTenant.id,
      contact_id: contact.id,
      source_kind: 'manual',
      source_label: 'Dashboard',
    })

    setBusy(false)
    onCreated()
  }

  function toggleList(id: string) {
    setSelectedListIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <ModalShell title="New contact" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah@example.com"
            autoFocus
            className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
            />
          </Field>
          <Field label="Last name">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
            />
          </Field>
          <Field label="Lifecycle stage">
            <select
              value={lifecycleStage}
              onChange={(e) => setLifecycleStage(e.target.value as LifecycleStage)}
              className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors bg-white"
            >
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {allLists.length > 0 && (
          <Field label="Add to lists">
            <div className="flex flex-wrap gap-2">
              {allLists.map((l) => {
                const active = selectedListIds.has(l.id)
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleList(l.id)}
                    className={`inline-flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? 'border-ink-900 bg-ink-900 text-cream'
                        : 'border-ink-200 text-ink-700 hover:border-ink-400'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: l.color || '#91a1ba' }}
                    />
                    {l.name}
                  </button>
                )
              })}
            </div>
          </Field>
        )}

        <Field label="Tags" hint="Comma-separated. New tags auto-created.">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="buyer, eichler, palo-alto"
            className="w-full border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors"
          />
        </Field>

        {err && (
          <div className="text-xs text-red-600 font-mono border border-red-200 bg-red-50 p-2">
            {err}
          </div>
        )}
        <ModalActions
          submitLabel={busy ? 'Creating…' : 'Create contact'}
          submitDisabled={busy}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  )
}

// ===========================================================================
// SHARED UI
// ===========================================================================

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 bg-ink-900/60 z-40 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-ink-100 sticky top-0 bg-white">
          <div className="font-display text-xl text-ink-900">{title}</div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ModalActions({
  submitLabel,
  submitDisabled,
  onCancel,
}: {
  submitLabel: string
  submitDisabled?: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end gap-2 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm text-ink-700 hover:text-ink-900 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitDisabled}
        className="bg-ink-900 text-cream px-4 py-2.5 text-sm hover:bg-ink-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitLabel}
      </button>
    </div>
  )
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2 flex items-baseline gap-2">
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {hint && (
          <span className="text-ink-400 normal-case tracking-normal text-xs">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const LIST_COLORS = [
  '#91a1ba',
  '#1a1f2e',
  '#5d7e69',
  '#a85d4d',
  '#7a6597',
  '#c4914d',
]

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2">
      {LIST_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full transition-all ${
            value === c ? 'ring-2 ring-offset-2 ring-ink-900' : 'opacity-80 hover:opacity-100'
          }`}
          style={{ background: c }}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  )
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`px-4 py-3 text-2xs uppercase tracking-widest text-ink-500 font-medium ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <td
      className={`px-4 py-3 text-sm text-ink-900 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </td>
  )
}

function LifecycleBadge({ stage }: { stage: LifecycleStage }) {
  return (
    <span className="inline-block text-2xs uppercase tracking-widest text-ink-700 border border-ink-200 px-2 py-0.5">
      {stage.replace('_', ' ')}
    </span>
  )
}

function TagPill({ tag, compact }: { tag: ContactTag; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border border-ink-200 text-ink-700 ${
        compact ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
    >
      {tag.name}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function formatName(c: Contact): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
}
