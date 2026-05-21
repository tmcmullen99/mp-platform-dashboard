UPDATE public.admin_assets SET content = content || 'ullen <em>Properties</em></div>
    <div class="login-sub">Admin Console</div>
    <div class="login-tabs">
      <button class="login-tab active" data-mode="signin">Sign in</button>
      <button class="login-tab" data-mode="signup">Sign up</button>
    </div>
    <form id="login-form">
      <div class="field">
        <label>Email</label>
        <input type="email" id="login-email" autocomplete="email" required />
      </div>
      <div class="field">
        <label>Password</label>
        <input type="password" id="login-password" autocomplete="current-password" required minlength="6" />
      </div>
      <button type="submit" class="btn-primary" id="login-submit">Sign in</button>
      <div id="login-msg"></div>
    </form>
  </div>
</div>

<!-- ============== SHELL ============== -->
<div id="shell" class="shell" style="display:none">
  <aside class="side">
    <div class="side-brand">
      <div class="name">McMullen <em>Properties</em></div>
      <div class="role">Admin Console</div>
    </div>
    <nav class="side-nav" id="side-nav"></nav>
    <div class="side-foot">
      <div class="who" id="who-email">—</div>
      <button id="signout">Sign out</button>
    </div>
  </aside>

  <main class="main">
    <header class="topbar">
      <div>
        <div class="crumbs" id="crumbs">Dashboard</div>
        <h1 id="title">Overview</h1>
      </div>
      <div class="top-actions" id="top-actions"></div>
    </header>
    <section class="tab-body" id="tab-body">
      <div class="loading"><span class="spinner"></span> Loading...</div>
    </section>
  </main>
</div>

<!-- ============== MODAL ============== -->
<div class="modal-back" id="modal-back">
  <div class="modal" id="modal"></div>
</div>

<script type="module">
import { createClient } from ''https://esm.sh/@supabase/supabase-js@2.45.4''

const SUPABASE_URL = ''https://kumfuludrhoqirxvaqja.supabase.co''
const SUPABASE_KEY = ''sb_publishable_jUwV52QfqixUh_6VSfEbtg_gWZh-1XF''
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } })

// ============ TAB MANIFEST ============
const NAV = [
  { group: ''Dashboard'', tabs: [
    { id: ''overview'', label: ''Overview'', count: null }
  ]},
  { group: ''Content'', tabs: [
    { id: ''properties'', label: ''Properties'', count: ''properties'' },
    { id: ''neighborhoods'', label: ''Neighborhoods'', count: ''neighborhoods'' },
    { id: ''blog'', label: ''Blog Posts'', count: ''blog_posts'' },
    { id: ''cmas'', label: ''CMAs'', count: ''cmas'' },
    { id: ''testimonials'', label: ''Testimonials'', count: ''testimonials'' }
  ]},
  { group: ''CRM'', tabs: [
    { id: ''leads'', label: ''Leads'', count: ''leads'' },
    { id: ''clients'', label: ''Clients'', count: ''clients'' },
    { id: ''deals'', label: ''Deals'', count: ''deals'' },
    { id: ''activities'', label: ''Activities'', count: ''activities'' }
  ]},
  { group: ''Engagement'', tabs: [
    { id: ''warrooms'', label: ''War Rooms'', count: ''war_rooms'' },
    { id: ''campaigns'', label: ''Email Campaigns'', count: ''email_blasts'' },
    { id: ''notifications'', label: ''Notifications'', count: ''notifications'' }
  ]},
  { group: ''Tools'', tabs: [
    { id: ''builder'', label: ''Builder Tools'', count: null },
    { id: ''import'', label: ''Data Import'', count: null },
    { id: ''reports'', label: ''Reports'', count: null }
  ]},
  { group: ''System'', tabs: [
    { id: ''settings'', label: ''Settings'', count: null }
  ]}
]
const TAB_MAP = {}; NAV.forEach(g => g.tabs.forEach(t => TAB_MAP[t.id] = t))

// ============ STATE ============
const state = { user: null, currentTab: ''overview'', counts: {} }

// ============ AUTH ============
async function init() {
  const { data: { session } } = await sb.auth.getSession()
  if (session) { state.user = session.user; showShell() }
  else { showLogin() }
  sb.auth.onAuthStateChange((_event, session) => {
    if (session) { state.user = session.user; showShell() }
    else { showLogin() }
  })
}

function showLogin() {
  document.getElementById(''login'').style.display = ''flex''
  document.getElementById(''shell'').style.display = ''none''
}

function showShell() {
  document.getElementById(''login'').style.display = ''none''
  document.getElementById(''shell'').style.display = ''grid''
  document.getElementById(''who-email'').textContent = state.user.email
  renderNav()
  loadCounts().then(renderNav)
  route()
}

let signMode = ''signin''
document.querySelectorAll(''.login-tab'').forEach(b => b.addEventListener(''click'', e => {
  signMode = e.target.dataset.mode
  document.querySelectorAll(''.login-tab'').forEach(x => x.classList.toggle(''active'', x.dataset.mode === signMode))
  document.getElementById(''login-submit'').textContent = signMode === ''signin'' ? ''Sign in'' : ''Create account''
  document.getElementById(''login-password'').autocomplete = signMode === ''signin'' ? ''current-password'' : ''new-password''
  document.getElementById(''login-msg'').innerHTML = ''''
}))

document.getElementById(''login-form'').addEventListener(''submit'', async e => {
  e.preventDefault()
  const email = document.getElementById(''login-email'').value.trim()
  const password = document.getElementById(''login-password'').value
  const btn = document.getElementById(''login-submit'')
  const msg = document.getElementById(''login-msg'')
  btn.disabled = true; msg.innerHTML = ''<div class="login-msg info"><span class="spinner"></span> Working...</div>''
  try {
    let res
    if (signMode === ''signin'') {
      res = await sb.auth.signInWithPassword({ email, password })
    } else {
      res = await sb.auth.signUp({ email, password })
    }
    if (res.error) throw res.error
    if (signMode === ''signup'' && !res.data.session) {
      msg.innerHTML = ''<div class="login-msg success">Account created. Check your email to confirm, then sign in.</div>''
    }
  } catch (err) {
    msg.innerHTML = `<div class="login-msg error">${escapeHtml(err.message || ''Sign in failed'')}</div>`
  } finally {
    btn.disabled = false
  }
})

document.getElementById(''signout'').addEventListener(''click'', async () => {
  await sb.auth.signOut()
})

// ============ NAV ============
function renderNav() {
  const nav = document.getElementById(''side-nav'')
  nav.innerHTML = NAV.map(g => `
    <div class="side-group">${g.group}</div>
    ${g.tabs.map(t => `
      <a class="side-link ${state.currentTab === t.id ? ''active'' : ''''}" href="#${t.id}" data-tab="${t.id}">
        <span>${t.label}</span>
        ${t.count && state.counts[t.count] != null ? `<span class="count">${state.counts[t.count]}</span>` : ''''}
      </a>
    `).join('''')}
  `).join('''')
  nav.querySelectorAll(''[data-tab]'').forEach(a => a.addEventListener(''click'', e => {
    e.preventDefault()
    state.currentTab = e.currentTarget.dataset.tab
    location.hash = state.currentTab
    renderNav()
    route()
  }))
}

async function loadCounts() {
  const tables = [''properties'',''neighborhoods'',''blog_posts'',''cmas'',''testimonials'',''leads'',''clients'',''deals'',''activities'',''war_rooms'',''email_blasts'',''notifications'']
  const promises = tables.map(t => sb.from(t).select(''*'', { count: ''exact'', head: true }))
  const results = await Promise.allSettled(promises)
  results.forEach((r, i) => {
    if (r.status === ''fulfilled'' && r.value.count != null) state.counts[tables[i]] = r.value.count
  })
}

window.addEventListener(''hashchange'', () => {
  const h = location.hash.slice(1)
  if (h && TAB_MAP[h]) {
    state.currentTab = h
    renderNav()
    route()
  }
})

// ============ ROUTER ============
function route() {
  const tab = TAB_MAP[state.currentTab] || TAB_MAP.overview
  const groupName = NAV.find(g => g.tabs.includes(tab))?.group || ''''
  document.getElementById(''crumbs'').textContent = groupName
  document.getElementById(''title'').innerHTML = tab.label.replace(/^(\w+)/, ''$1'').replace('' '', '' '')
  document.getElementById(''top-actions'').innerHTML = ''''
  const body = document.getElementById(''tab-body'')
  body.innerHTML = ''<div class="loading"><span class="spinner"></span> Loading...</div>''
  ;(RENDERERS[tab.id] || RENDERERS.placeholder)(body, tab).catch(err => {
    body.innerHTML = `<div class="empty"><h3>Error</h3><p>${escapeHtml(err.message || String(err))}</p></div>`
  })
}

// ============ RENDERERS ============
const RENDERERS = {}

RENDERERS.overview = async (body) => {
  const c = state.counts
  body.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi"><div class="lbl">Properties</div><div class="val">${c.properties ?? ''—''}</div><div class="sub">Total listings in the catalog</div></div>
      <div class="kpi"><div class="lbl">Active Clients</div><div class="val">${c.clients ?? 0}</div><div class="sub">CRM contacts</div></div>
      <div class="kpi"><div class="lbl">Open Deals</div><div class="val">${c.deals ?? 0}</div><div class="sub">In pipeline</div></div>
      <div class="kpi"><div class="lbl">Leads</div><div class="val">${c.leads ?? 0}</div><div class="sub">Inbound, not yet converted</div></div>
      <div class="kpi"><div class="lbl">CMAs</div><div class="val">${c.cmas ?? 0}</div><div class="sub">Published market analyses</div></div>
      <div class="kpi"><div class="lbl">Email Campaigns</div><div class="val">${c.email_blasts ?? 0}</div><div class="sub">Blasts sent</div></div>
      <div class="kpi"><div class="lbl">Blog Posts</div><div class="val">${c.blog_posts ?? 0}</div><div class="sub">Published articles</div></div>
      <div class="kpi"><div class="lbl">Neighborhoods</div><div class="val">${c.neighborhoods ?? 0}</div><div class="sub">Coverage areas</div></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <h2>Quick actions</h2>
        <span class="meta">Shortcuts</span>
      </div>
      <div class="panel-body">
        <div class="tools-grid">
          <a class="tool-card" href="#properties"><span class="badge">Content</span><h4>Add a listing</h4><p>Create a new property card. Address, price, beds, baths, the works.</p><span class="open">Go →</span></a>
          <a class="tool-card" href="#clients"><span class="badge">CRM</span><h4>Add a client</h4><p>Bring a new buyer or seller into the CRM. Optionally invite to the portal.</p><span class="open">Go →</span></a>
          <a class="tool-card" href="#blog"><span class="badge">Content</span><h4>Write a blog post</h4><p>Publish editorial content, market updates, neighborhood deep dives.</p><span class="open">Go →</span></a>
          <a class="tool-card" href="#campaigns"><span class="badge">Engagement</span><h4>Send an email blast</h4><p>Draft a campaign. Draft-to-Tim approval first, 200 per blast cap.</p><span class="open">Go →</span></a>
          <a class="tool-card" href="#builder"><span class="badge">Tools</span><h4>Open Builder Tools</h4><p>CMA Generator, Pool Estimator, Label Sales Agent, Bulk CSV Downloader.</p><span class="open">Go →</span></a>
        </div>
      </div>
    </div>
  `
}

RENDERERS.properties = async (body) => {
  document.getElementById(''top-actions'').innerHTML = ''<button class="btn-solid" id="new-prop">+ New Listing</button>''
  document.getElementById(''new-prop'').addEventListener(''click'', () => editProperty())
  const { data, error } = await sb.from(''properties'').select(`
    id, webflow_id, slug, name, price, bedrooms, bathrooms, area_sqft, pin_code, built_year,
    status:statuses(name, color), neighborhood:neighborhoods(name), property_type:property_types(name)
  `).order(''price'', { ascending: false })
  if (error) throw error
  body.innerHTML = `
    <div class="panel">
      <div class="filter-bar">
        <input type="search" id="p-search" placeholder="Search address, neighborhood, status..." />
        <select id="p-status">
          <option value="">All statuses</option>
          ${[...new Set(data.map(p => p.status?.name).filter(Boolean))].map(s => `<option>${s}</option>`).join('''')}
        </select>
        <select id="p-type">
          <option value="">All types</option>
          ${[...new Set(data.map(p => p.property_type?.name).filter(Boolean))].map(s => `<option>${s}</option>`).join('''')}
        </select>
        <span class="count-label" id="p-count">${data.length} listings</span>
      </div>
      <div class="panel-body tight" style="overflow-x:auto">
        <table class="tbl" id="p-tbl">
          <thead><tr>
            <th>Address</th><th>Price</th><th>Beds/Baths</th><th>Area</th><th>Year</th><th>Neighborhood</th><th>Type</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>${data.map(rowProperty).join('''')}</tbody>
        </table>
      </div>
    </div>
  `
  bindPropertySearch(data)
}

function rowProperty(p) {
  const status = p.status?.name || ''''
  const stTag = status === ''Sold'' ? ''tag-sold'' : status === ''Active'' ? ''tag-active'' : status === ''Pending'' ? ''tag-pending'' : ''tag-off''
  return `<tr data-id="${p.id}" data-search="${escapeAttr([p.name, p.neighborhood?.name, p.status?.name].filter(Boolean).join('' '').toLowerCase())}" data-status="${escapeAttr(status)}" data-type="${escapeAttr(p.property_type?.name || '''')}">
    <td><div class="primary">${escapeHtml(p.name || '''')}</div><div class="muted">${escapeHtml(p.slug || '''')}</div></td>
    <td class="price">${p.price ? ''$'' + Number(p.price).toLocaleString() : ''—''}</td>
    <td class="num">${p.bedrooms ?? ''—''} / ${p.bathrooms ?? ''—''}</td>
    <td class="num">${p.area_sqft ? Number(p.area_sqft).toLocaleString() + '' sf'' : ''—''}</td>
    <td class="num">${p.built_year ?? ''—''}</td>
    <td class="muted">${escapeHtml(p.neighborhood?.name || ''—'')}</td>
    <td class="muted">${escapeHtml(p.property_type?.name || ''—'')}</td>
    <td>${status ? `<span class="tag ${stTag}">${status}</span>` : ''—''}</td>
    <td class="row-actions"><button data-edit="${p.id}">Edit</button></td>
  </tr>`
}

function bindPropertySearch(data) {
  const tbl = document.getElementById(''p-tbl'')
  const search = document.getElementById(''p-search'')
  const sel = document.getElementById(''p-status'')
  const typ = document.getElementById(''p-type'')
  const count = document.getElementById(''p-count'')
  function apply() {
    const q = search.value.toLowerCase()
    const s = sel.value
    const t = typ.value
    let n = 0
    tbl.querySelectorAll(''tbody tr'').forEach(tr => {
      const matchQ = !q || tr.dataset.search.includes(q)
      const matchS = !s || tr.dataset.status === s
      const matchT = !t || tr.dataset.type === t
      const ok = matchQ && matchS && matchT
      tr.style.display = ok ? '''' : ''none''
      if (ok) n++
    })
    count.textContent = `${n} listing${n === 1 ? '''' : ''s''}`
  }
  search.addEventListener(''input'', apply)
  sel.addEventListener(''change'', apply)
  typ.addEventListener(''change'', apply)
  tbl.addEventListener(''click'', e => {
    const id = e.target.dataset.edit
    if (id) editProperty(data.find(p => p.id === id))
  })
}

async function editProperty(p) {
  const [{ data: neighborhoods }, { data: types }, { data: statuses }] = await Promise.all([
    sb.from(''neighborhoods'').select(''id, name'').order(''name''),
    sb.from(''property_types'').select(''id, name'').order(''name''),
    sb.from(''statuses'').select(''id, name'').order(''display_order''),
  ])
  const isNew = !p
  openModal(`
    <div class="modal-head">
      <div>
        <div class="sub">${isNew ? ''New listing'' : ''Edit listing''}</div>
        <h3>${isNew ? ''Add a new property'' : escapeHtml(p.name)}</h3>
      </div>
      <button class="btn-ghost" onclick="window.__closeModal()">Cancel</button>
    </div>
    <form class="modal-body" id="prop-form">
      <div class="form-grid">
        <div class="f-row full"><label>Address / Name</label><input name="name" required value="${escapeAttr(p?.name || '''')}" /></div>
        <div cla' WHERE key = 'admin/index_v03.html';