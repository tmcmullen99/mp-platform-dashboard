// Supabase Edge Function: chat
//
// Streams a Claude conversation with tool calling support. Tools read/write
// tenant-scoped data from Supabase using the user's JWT, so RLS enforces
// isolation. Response is Server-Sent Events the browser consumes to render
// text deltas and tool-use indicators live.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4"

const SUPABASE_URL = 'https://kumfuludrhoqirxvaqja.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jUwV52QfqixUh_6VSfEbtg_gWZh-1XF'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 2048
const MAX_TOOL_ITERATIONS = 8

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: any[] = [
  {
    name: 'get_tenant_info',
    description:
      'Get full information about the current workspace tenant — display name, slug, custom domain, status, tier, plus all branding (palette, fonts, agent name, agent title, DRE license, brokerage affiliation, service areas, hero copy).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recent_activity',
    description:
      'Recent platform activity from the audit log for this tenant. Use this to answer "what has happened recently" or to explain platform state changes.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Number of entries (default 10)' },
      },
    },
  },
  {
    name: 'list_listings',
    description:
      'List property listings — active properties and coming soon listings combined.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max listings per category (default 10)' },
        include_coming_soon: { type: 'boolean', description: 'Include coming-soon listings (default true)' },
      },
    },
  },

  // --- CRM tools (P2) -----------------------------------------------------

  {
    name: 'list_contact_lists',
    description:
      'List all contact lists in this workspace with their active member counts. Use for "what lists do I have", "how many lists", or before asking the user which list to use.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max lists (default 50)' },
      },
    },
  },
  {
    name: 'list_contacts',
    description:
      'Query contacts with optional filters. Use for "show me my contacts", "who is in X list", "search for Sarah", "find contacts tagged buyer". Can filter by list, tag, search string, or lifecycle stage. Filters combine with AND.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max contacts (default 20)' },
        list_id: { type: 'string', description: 'Filter to contacts in a list (UUID)' },
        list_name: { type: 'string', description: 'Filter to contacts in a list by name (case-insensitive)' },
        tag_name: { type: 'string', description: 'Filter to contacts with this tag (case-insensitive)' },
        search: { type: 'string', description: 'Substring match on email, first name, last name' },
        lifecycle_stage: {
          type: 'string',
          enum: ['new', 'engaged', 'qualified', 'customer', 'former_customer'],
        },
      },
    },
  },
  {
    name: 'create_contact',
    description:
      'Create a new contact in the workspace CRM. Email is recommended for deliverability. Returns the created contact plus any lists/tags applied. Tags are auto-created if they do not exist.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email (lowercased + deduplicated per tenant)' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone: { type: 'string' },
        lifecycle_stage: {
          type: 'string',
          enum: ['new', 'engaged', 'qualified', 'customer', 'former_customer'],
        },
        notes: { type: 'string', description: 'Internal agent notes' },
        list_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lists to add the contact to (must exist; missing lists are silently skipped)',
        },
        tag_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to apply (created automatically if missing)',
        },
      },
    },
  },
  {
    name: 'add_contact_to_list',
    description:
      'Add or remove a contact from a list. Identify the contact by email or contact_id. Identify the list by name or list_id. Use action="remove" to remove; default is add.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'Contact UUID' },
        contact_email: { type: 'string', description: 'Contact email (alternative to contact_id)' },
        list_id: { type: 'string', description: 'List UUID' },
        list_name: { type: 'string', description: 'List name (alternative to list_id)' },
        action: { type: 'string', enum: ['add', 'remove'], description: 'Default: add' },
      },
    },
  },
  {
    name: 'tag_contact',
    description:
      'Add or remove tags from a contact. Identify the contact by email or contact_id. Tags are auto-created on add if they do not exist.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'Contact UUID' },
        contact_email: { type: 'string', description: 'Contact email (alternative to contact_id)' },
        tag_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag names to apply or remove',
        },
        action: { type: 'string', enum: ['add', 'remove'], description: 'Default: add' },
      },
      required: ['tag_names'],
    },
  },

  // --- Campaign tools (P3) ------------------------------------------------

  {
    name: 'list_campaigns',
    description:
      'List email campaigns in this workspace with status, recipient counts, and engagement stats (opens, clicks). Use this to answer "what campaigns have I sent" or "how did my last blast perform".',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'queued', 'sending', 'sent', 'failed', 'canceled'],
          description: 'Filter by status (optional)',
        },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Default 20' },
      },
    },
  },
  {
    name: 'send_campaign_to_list',
    description:
      'Compose and send an email campaign to a contact list in one shot. Creates a draft campaign row and immediately invokes the send pipeline. Respects email_subscription_status (skips unsubscribed/bounced/complained) and the 200-recipient cap. Use merge tags {{first_name}}, {{last_name}}, {{full_name}}, {{email}}, and {{unsubscribe_url}} for personalization.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Internal campaign name (e.g., "Spring market update")' },
        list_name: { type: 'string', description: 'Name of the contact list to send to (case-insensitive)' },
        list_id: { type: 'string', description: 'Contact list UUID (alternative to list_name)' },
        subject: { type: 'string', description: 'Email subject line' },
        from_name: { type: 'string', description: 'Sender display name (default: workspace agent name)' },
        from_email: { type: 'string', description: 'Sender email address (default: workspace agent email)' },
        reply_to: { type: 'string', description: 'Reply-to address (default: same as from_email)' },
        html_body: { type: 'string', description: 'HTML email body (preferred). Can include merge tags.' },
        plain_body: { type: 'string', description: 'Plain text fallback body' },
        send_now: { type: 'boolean', description: 'If true, send immediately. If false, save as draft only. Default true.' },
      },
      required: ['name', 'subject'],
    },
  },

  {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: 3,
  },
]

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'Server missing ANTHROPIC_API_KEY' }, 500)

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return jsonResponse({ error: 'Missing Authorization: Bearer <jwt> header' }, 401)
  const jwt = authHeader.slice(7)

  let body: { messages?: any[]; tenant_id?: string }
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400) }
  const { messages, tenant_id } = body
  if (!Array.isArray(messages) || messages.length === 0 || !tenant_id) {
    return jsonResponse({ error: 'messages (non-empty array) and tenant_id are required' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data: userResult, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !userResult?.user) return jsonResponse({ error: 'Invalid or expired session' }, 401)
  const user = userResult.user

  const [{ data: tenant }, { data: branding }, { data: profile }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenant_id).maybeSingle(),
    supabase.from('tenant_branding').select('*').eq('tenant_id', tenant_id).maybeSingle(),
    supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
  ])

  if (!tenant) return jsonResponse({ error: 'Tenant not found or not accessible' }, 403)

  const systemPrompt = buildSystemPrompt(tenant, branding, profile)
  const ctx: ToolContext = {
    tenant_id,
    user_id: user.id,
    auth_header: authHeader,
    from_name: branding?.agent_name || tenant.display_name,
    from_email: branding?.agent_email || 'tim@mcmullen.properties',
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const emit = async (event: object) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  ;(async () => {
    try {
      let convo = messages.slice()
      for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const result = await streamClaude(convo, TOOLS, systemPrompt, apiKey, emit)
        if (result.stopReason !== 'tool_use') break

        const toolBlocks = result.content.filter((b: any) => b.type === 'tool_use')
        if (toolBlocks.length === 0) break

        const toolResults: any[] = []
        for (const block of toolBlocks) {
          await emit({ type: 'tool_run_start', name: block.name, id: block.id, input: block.input })
          try {
            const data = await runTool(block.name, block.input || {}, supabase, ctx)
            await emit({ type: 'tool_run_end', id: block.id, ok: true, summary: summarize(data) })
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(data),
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            await emit({ type: 'tool_run_end', id: block.id, ok: false, error: msg })
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: msg }),
              is_error: true,
            })
          }
        }
        convo.push({ role: 'assistant', content: result.content })
        convo.push({ role: 'user', content: toolResults })
      }
      await emit({ type: 'done' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await emit({ type: 'error', message: msg })
    } finally {
      try { await writer.close() } catch {}
    }
  })()

  return new Response(readable, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(tenant: any, branding: any, profile: any): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const lines: string[] = []
  lines.push(`You are the AI assistant inside the McMullen Platform — the operating system for ${tenant.display_name}, a real estate brokerage workspace.`)
  if (branding) {
    const idParts: string[] = []
    if (branding.agent_name) idParts.push(branding.agent_name)
    if (branding.dre_license) idParts.push(`DRE ${branding.dre_license}`)
    if (branding.brokerage_affiliation) idParts.push(branding.brokerage_affiliation)
    if (idParts.length) lines.push(`Workspace identity: ${idParts.join(' · ')}.`)
    if (branding.service_areas?.length) lines.push(`Service areas: ${branding.service_areas.join(', ')}.`)
  }
  if (profile) {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
    const role = profile.is_brokerage_admin ? 'brokerage admin with cross-tenant access' : 'workspace member'
    lines.push(`Current user: ${name} (${profile.email}), ${role}.`)
  }
  lines.push(`Today's date: ${today}.`)
  lines.push('')
  lines.push('Tools available:')
  lines.push('- Read: get_tenant_info, get_recent_activity, list_listings')
  lines.push('- CRM (contacts, lists, tags): list_contact_lists, list_contacts, create_contact, add_contact_to_list, tag_contact')
  lines.push('- Campaigns (email): list_campaigns, send_campaign_to_list')
  lines.push('- Web: web_search (max 3 per conversation, for live external info)')
  lines.push('')
  lines.push('Guidelines:')
  lines.push('- Always use tools to fetch real data; never invent numbers, addresses, names, or emails.')
  lines.push('- For "what lists do I have" questions, call list_contact_lists.')
  lines.push('- When the user asks to add or tag a contact, do it (call the right tool) — do not just describe the steps.')
  lines.push('- For sending campaigns, use send_campaign_to_list. Confirm details (subject, list, body) once with the user before sending unless the user clearly already approved.')
  lines.push('- Use merge tags {{first_name}}, {{last_name}}, {{full_name}}, {{email}}, {{unsubscribe_url}} when composing email bodies.')
  lines.push('- Identify contacts by email when given (more reliable than partial names).')
  lines.push('- Be concise. Lead with the answer; add only the most relevant details.')
  lines.push('- Format dates as human-readable (e.g., "Tuesday, May 19, 2026").')
  lines.push('- When listing items, surface only the useful fields; never dump raw JSON or UUIDs the user did not ask for.')
  lines.push('- If a tool returns no data or an error, say so plainly and suggest a next step.')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Stream from Claude — accumulate content blocks while forwarding text deltas
// ---------------------------------------------------------------------------

async function streamClaude(
  messages: any[],
  tools: any[],
  system: string,
  apiKey: string,
  emit: (event: object) => Promise<void>,
): Promise<{ content: any[]; stopReason: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      tools,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    throw new Error(`Anthropic ${response.status}: ${text.slice(0, 400)}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const blocks: Record<number, any> = {}
  const content: any[] = []
  let stopReason = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const evt of events) {
      let dataStr = ''
      for (const line of evt.split('\n')) {
        if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
      }
      if (!dataStr) continue
      let data: any
      try { data = JSON.parse(dataStr) } catch { continue }

      switch (data.type) {
        case 'content_block_start': {
          const idx: number = data.index
          blocks[idx] = { ...data.content_block }
          if (data.content_block.type === 'text') blocks[idx].text = ''
          else if (data.content_block.type === 'tool_use') {
            blocks[idx].input = {}
            blocks[idx]._inputJson = ''
          }
          break
        }
        case 'content_block_delta': {
          const block = blocks[data.index]
          if (!block) break
          if (data.delta?.type === 'text_delta') {
            block.text += data.delta.text
            await emit({ type: 'text', delta: data.delta.text })
          } else if (data.delta?.type === 'input_json_delta') {
            block._inputJson += data.delta.partial_json
          }
          break
        }
        case 'content_block_stop': {
          const block = blocks[data.index]
          if (!block) break
          if (block.type === 'tool_use') {
            if (block._inputJson) {
              try { block.input = JSON.parse(block._inputJson) } catch { block.input = {} }
            }
            delete block._inputJson
          }
          content[data.index] = block
          break
        }
        case 'message_delta': {
          if (data.delta?.stop_reason) stopReason = data.delta.stop_reason
          break
        }
        case 'error': {
          throw new Error(`Anthropic stream error: ${data.error?.message || 'unknown'}`)
        }
      }
    }
  }
  return { content: content.filter(Boolean), stopReason }
}

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

type ToolContext = {
  tenant_id: string
  user_id: string
  auth_header: string
  from_name: string
  from_email: string
}

async function runTool(name: string, input: any, supabase: SupabaseClient, ctx: ToolContext): Promise<any> {
  switch (name) {
    case 'get_tenant_info': {
      const { data: tenants, error: tErr } = await supabase
        .from('tenants')
        .select('id,slug,display_name,status,tier,default_subdomain,custom_domain,created_at')
        .eq('id', ctx.tenant_id)
        .maybeSingle()
      if (tErr) throw new Error(`tenants: ${tErr.message}`)
      if (!tenants) return { error: 'tenant not accessible' }
      const { data: branding } = await supabase
        .from('tenant_branding')
        .select('agent_name,agent_title,agent_email,agent_phone,dre_license,brokerage_affiliation,service_areas,hero_title,hero_subtitle,primary_color,secondary_color,accent_color,heading_font,body_font')
        .eq('tenant_id', ctx.tenant_id)
        .maybeSingle()
      return { tenant: tenants, branding }
    }

    case 'get_recent_activity': {
      const limit = clamp(Number(input.limit) || 10, 1, 50)
      const { data, error } = await supabase
        .from('audit_log')
        .select('id,actor_kind,action,entity_kind,entity_id,metadata,happened_at')
        .order('happened_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(`audit_log: ${error.message}`)
      return { entries: data || [], count: data?.length || 0 }
    }

    case 'list_listings': {
      const limit = clamp(Number(input.limit) || 10, 1, 50)
      const includeComingSoon = input.include_coming_soon !== false
      const { data: properties, error: pErr } = await supabase
        .from('properties')
        .select('id,slug,name,price,price_per_sqft,bedrooms,bathrooms,area_sqft,built_year,monthly_hoa_fee,next_open_house_at,created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (pErr) throw new Error(`properties: ${pErr.message}`)
      let comingSoon: any[] = []
      if (includeComingSoon) {
        const { data: cs, error: csErr } = await supabase
          .from('coming_soon_listings')
          .select('id,slug,name,subtitle,neighborhood,property_type,bedrooms,bathrooms,area_sqft,price_estimate,expected_list_date,is_published')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (csErr) throw new Error(`coming_soon_listings: ${csErr.message}`)
        comingSoon = cs || []
      }
      return {
        properties: properties || [],
        coming_soon: comingSoon,
        properties_count: properties?.length || 0,
        coming_soon_count: comingSoon.length,
      }
    }

    // ---- CRM tools -----------------------------------------------------

    case 'list_contact_lists': {
      const limit = clamp(Number(input.limit) || 50, 1, 50)
      const { data: lists, error } = await supabase
        .from('contact_lists')
        .select('id,name,description,color,created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(`contact_lists: ${error.message}`)
      const listIds = (lists || []).map((l: any) => l.id)
      const counts: Record<string, number> = {}
      if (listIds.length > 0) {
        const { data: memberRows } = await supabase
          .from('contact_list_memberships')
          .select('list_id')
          .in('list_id', listIds)
          .is('removed_at', null)
        for (const row of memberRows || []) {
          counts[row.list_id] = (counts[row.list_id] || 0) + 1
        }
      }
      return {
        lists: (lists || []).map((l: any) => ({ ...l, member_count: counts[l.id] || 0 })),
        count: lists?.length || 0,
      }
    }

    case 'list_contacts': {
      const limit = clamp(Number(input.limit) || 20, 1, 50)
      let contactIdsFilter: string[] | null = null

      if (input.list_id || input.list_name) {
        const listId = input.list_id || await resolveListId(supabase, input.list_name)
        if (!listId) return { contacts: [], count: 0, note: 'list not found' }
        const { data: memRows } = await supabase
          .from('contact_list_memberships')
          .select('contact_id')
          .eq('list_id', listId)
          .is('removed_at', null)
        contactIdsFilter = (memRows || []).map((r: any) => r.contact_id)
        if (contactIdsFilter.length === 0) return { contacts: [], count: 0 }
      }

      if (input.tag_name) {
        const { data: tagRow } = await supabase
          .from('contact_tags')
          .select('id')
          .ilike('name', String(input.tag_name).trim())
          .maybeSingle()
        if (!tagRow) return { contacts: [], count: 0, note: 'tag not found' }
        const { data: assignRows } = await supabase
          .from('contact_tag_assignments')
          .select('contact_id')
          .eq('tag_id', tagRow.id)
        const tagContactIds = (assignRows || []).map((r: any) => r.contact_id)
        if (contactIdsFilter === null) contactIdsFilter = tagContactIds
        else contactIdsFilter = contactIdsFilter.filter((id) => tagContactIds.includes(id))
        if (contactIdsFilter.length === 0) return { contacts: [], count: 0 }
      }

      let q = supabase
        .from('contacts')
        .select('id,email,first_name,last_name,phone,lifecycle_stage,email_subscription_status,created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (contactIdsFilter !== null) q = q.in('id', contactIdsFilter)
      if (input.search) {
        const s = String(input.search).replace(/[%_]/g, '\\$&')
        q = q.or(`email.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`)
      }
      if (input.lifecycle_stage) q = q.eq('lifecycle_stage', input.lifecycle_stage)

      const { data, error } = await q
      if (error) throw new Error(`contacts: ${error.message}`)
      return { contacts: data || [], count: data?.length || 0 }
    }

    case 'create_contact': {
      const email = input.email ? String(input.email).toLowerCase().trim() : null
      const firstName = input.first_name ? String(input.first_name).trim() : null
      const lastName = input.last_name ? String(input.last_name).trim() : null
      const phone = input.phone ? String(input.phone).trim() : null
      if (!email && !firstName && !lastName && !phone) {
        throw new Error('At least one of email, first_name, last_name, or phone is required')
      }

      const { data: contact, error: cErr } = await supabase
        .from('contacts')
        .insert({
          tenant_id: ctx.tenant_id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          lifecycle_stage: input.lifecycle_stage || 'new',
          notes: input.notes || null,
          created_by: ctx.user_id,
        })
        .select('id,email,first_name,last_name,phone,lifecycle_stage,email_subscription_status,created_at')
        .single()

      if (cErr) {
        if (cErr.code === '23505') {
          throw new Error(`A contact with email ${email} already exists in this workspace`)
        }
        throw new Error(`contacts insert: ${cErr.message}`)
      }

      const appliedLists: string[] = []
      const skippedLists: string[] = []
      if (Array.isArray(input.list_names)) {
        for (const rawName of input.list_names) {
          const name = String(rawName).trim()
          if (!name) continue
          const { data: list } = await supabase
            .from('contact_lists')
            .select('id,name')
            .eq('tenant_id', ctx.tenant_id)
            .ilike('name', name)
            .maybeSingle()
          if (!list) { skippedLists.push(name); continue }
          const { error: mErr } = await supabase.from('contact_list_memberships').insert({
            tenant_id: ctx.tenant_id,
            list_id: list.id,
            contact_id: contact.id,
            added_by: ctx.user_id,
          })
          if (!mErr) appliedLists.push(list.name)
        }
      }

      const appliedTags: string[] = []
      if (Array.isArray(input.tag_names)) {
        for (const rawName of input.tag_names) {
          const name = String(rawName).trim()
          if (!name) continue
          const tagId = await ensureTag(supabase, ctx.tenant_id, name)
          if (!tagId) continue
          const { error: tErr } = await supabase.from('contact_tag_assignments').insert({
            contact_id: contact.id,
            tag_id: tagId,
            tenant_id: ctx.tenant_id,
            applied_by: ctx.user_id,
          })
          if (!tErr) appliedTags.push(name)
        }
      }

      await supabase.from('contact_sources').insert({
        tenant_id: ctx.tenant_id,
        contact_id: contact.id,
        source_kind: 'manual',
        source_label: 'Chat assistant',
      })

      return { contact, applied_lists: appliedLists, skipped_lists: skippedLists, applied_tags: appliedTags }
    }

    case 'add_contact_to_list': {
      const action = input.action === 'remove' ? 'remove' : 'add'
      const contactId = input.contact_id || await resolveContactId(supabase, input.contact_email)
      if (!contactId) throw new Error('Contact not found — provide contact_id or contact_email')
      const listId = input.list_id || await resolveListId(supabase, input.list_name)
      if (!listId) throw new Error('List not found — provide list_id or list_name')

      if (action === 'add') {
        const { data: existing } = await supabase
          .from('contact_list_memberships')
          .select('id')
          .eq('list_id', listId)
          .eq('contact_id', contactId)
          .is('removed_at', null)
          .maybeSingle()
        if (existing) return { ok: true, already_member: true, contact_id: contactId, list_id: listId }
        const { error } = await supabase.from('contact_list_memberships').insert({
          tenant_id: ctx.tenant_id,
          list_id: listId,
          contact_id: contactId,
          added_by: ctx.user_id,
        })
        if (error) throw new Error(`membership insert: ${error.message}`)
        return { ok: true, action: 'added', contact_id: contactId, list_id: listId }
      } else {
        const { data: updated, error } = await supabase
          .from('contact_list_memberships')
          .update({ removed_at: new Date().toISOString() })
          .eq('list_id', listId)
          .eq('contact_id', contactId)
          .is('removed_at', null)
          .select('id')
        if (error) throw new Error(`membership remove: ${error.message}`)
        return { ok: true, action: 'removed', removed_count: updated?.length || 0 }
      }
    }

    case 'tag_contact': {
      const action = input.action === 'remove' ? 'remove' : 'add'
      const tagNames: string[] = Array.isArray(input.tag_names) ? input.tag_names.map(String).map((s: string) => s.trim()).filter(Boolean) : []
      if (tagNames.length === 0) throw new Error('tag_names is required (non-empty array)')
      const contactId = input.contact_id || await resolveContactId(supabase, input.contact_email)
      if (!contactId) throw new Error('Contact not found — provide contact_id or contact_email')

      const applied: string[] = []
      if (action === 'add') {
        for (const name of tagNames) {
          const tagId = await ensureTag(supabase, ctx.tenant_id, name)
          if (!tagId) continue
          const { error } = await supabase
            .from('contact_tag_assignments')
            .upsert({
              contact_id: contactId,
              tag_id: tagId,
              tenant_id: ctx.tenant_id,
              applied_by: ctx.user_id,
            }, { onConflict: 'contact_id,tag_id' })
          if (!error) applied.push(name)
        }
        return { ok: true, action: 'added', tags: applied, contact_id: contactId }
      } else {
        for (const name of tagNames) {
          const { data: tagRow } = await supabase
            .from('contact_tags')
            .select('id')
            .eq('tenant_id', ctx.tenant_id)
            .ilike('name', name)
            .maybeSingle()
          if (!tagRow) continue
          const { error } = await supabase
            .from('contact_tag_assignments')
            .delete()
            .eq('contact_id', contactId)
            .eq('tag_id', tagRow.id)
          if (!error) applied.push(name)
        }
        return { ok: true, action: 'removed', tags: applied, contact_id: contactId }
      }
    }

    case 'list_campaigns': {
      let query = supabase
        .from('campaigns')
        .select('id, name, subject, from_name, from_email, list_id, status, recipient_count, sent_count, opened_count, clicked_count, bounced_count, unsubscribed_count, failed_count, sent_at, created_at')
        .eq('tenant_id', ctx.tenant_id)
        .order('created_at', { ascending: false })
        .limit(Math.min(input.limit || 20, 50))
      if (input.status) query = query.eq('status', input.status)
      const { data, error } = await query
      if (error) throw new Error(`list_campaigns: ${error.message}`)
      return { ok: true, count: data?.length || 0, campaigns: data || [] }
    }

    case 'send_campaign_to_list': {
      const listId = input.list_id || await resolveListId(supabase, input.list_name)
      if (!listId) throw new Error('List not found — provide list_id or list_name')

      const name: string = String(input.name || '').trim()
      const subject: string = String(input.subject || '').trim()
      if (!name) throw new Error('name is required')
      if (!subject) throw new Error('subject is required')

      const fromName: string = String(input.from_name || ctx.from_name || 'McMullen Properties').trim()
      const fromEmail: string = String(input.from_email || ctx.from_email || 'tim@mcmullen.properties').trim()
      const replyTo: string | null = input.reply_to ? String(input.reply_to).trim() : null
      const htmlBody: string = String(input.html_body || '')
      const plainBody: string = String(input.plain_body || '')
      const sendNow: boolean = input.send_now !== false

      if (!htmlBody && !plainBody) {
        throw new Error('Provide html_body or plain_body (or both)')
      }

      // Create draft campaign
      const { data: campaign, error: createErr } = await supabase
        .from('campaigns')
        .insert({
          tenant_id: ctx.tenant_id,
          name,
          subject,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo,
          html_body: htmlBody,
          plain_body: plainBody,
          list_id: listId,
          status: 'draft',
          created_by: ctx.user_id,
        })
        .select('id')
        .single()
      if (createErr) throw new Error(`campaign create: ${createErr.message}`)

      if (!sendNow) {
        return { ok: true, action: 'draft_saved', campaign_id: campaign.id, list_id: listId }
      }

      // Invoke send_campaign Edge Function
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const sendResp = await fetch(`${supabaseUrl}/functions/v1/send_campaign`, {
        method: 'POST',
        headers: {
          'Authorization': ctx.auth_header,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaign_id: campaign.id }),
      })
      const sendResult = await sendResp.json()
      if (!sendResp.ok) {
        return { ok: false, error: sendResult.error || 'send failed', campaign_id: campaign.id, status: 'draft' }
      }
      return {
        ok: true,
        action: 'sent',
        campaign_id: campaign.id,
        status: sendResult.status,
        recipient_count: sendResult.recipient_count,
        sent_count: sendResult.sent_count,
        failed_count: sendResult.failed_count,
        skipped: sendResult.skipped,
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ---------------------------------------------------------------------------
// Tool helpers
// ---------------------------------------------------------------------------

async function resolveListId(supabase: SupabaseClient, name: any): Promise<string | null> {
  if (!name) return null
  const { data } = await supabase
    .from('contact_lists')
    .select('id')
    .ilike('name', String(name).trim())
    .maybeSingle()
  return data?.id || null
}

async function resolveContactId(supabase: SupabaseClient, email: any): Promise<string | null> {
  if (!email) return null
  const { data } = await supabase
    .from('contacts')
    .select('id')
    .ilike('email', String(email).toLowerCase().trim())
    .maybeSingle()
  return data?.id || null
}

async function ensureTag(supabase: SupabaseClient, tenant_id: string, name: string): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const { data: existing } = await supabase
    .from('contact_tags')
    .select('id')
    .eq('tenant_id', tenant_id)
    .ilike('name', trimmed)
    .maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase
    .from('contact_tags')
    .insert({ tenant_id, name: trimmed })
    .select('id')
    .single()
  return created?.id || null
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function summarize(data: any): string {
  if (data?.error) return `error: ${data.error}`
  if (data?.note) return data.note
  const counts: string[] = []
  for (const k of ['count', 'properties_count', 'coming_soon_count']) {
    if (typeof data?.[k] === 'number') counts.push(`${k}=${data[k]}`)
  }
  if (counts.length) return counts.join(' ')
  if (data?.tenant?.display_name) return `tenant=${data.tenant.display_name}`
  if (data?.contact?.id) {
    const c = data.contact
    const label = c.email || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.id.slice(0, 8)
    return `created=${label}`
  }
  if (data?.action === 'sent' || data?.action === 'draft_saved') {
    const parts = [data.action]
    if (typeof data.sent_count === 'number') parts.push(`sent=${data.sent_count}`)
    if (typeof data.failed_count === 'number' && data.failed_count > 0) parts.push(`failed=${data.failed_count}`)
    if (typeof data.recipient_count === 'number') parts.push(`total=${data.recipient_count}`)
    return parts.join(' ')
  }
  if (Array.isArray(data?.campaigns)) return `campaigns=${data.campaigns.length}`
  if (data?.action) {
    const parts = [data.action]
    if (typeof data.removed_count === 'number') parts.push(`count=${data.removed_count}`)
    if (Array.isArray(data.tags)) parts.push(`tags=${data.tags.length}`)
    return parts.join(' ')
  }
  if (data?.already_member) return 'already member'
  if (data?.ok) return 'ok'
  return 'ok'
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, Math.floor(n)))
}

function jsonResponse(payload: object, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
