UPDATE public.admin_assets SET content = content || '|| '''')}" placeholder="e.g. Smith family — Pac Heights condo" /></div>
        <div class="f-row"><label>Client *</label><select name="client_id" required>${isNew ? ''<option value="">— Select client —</option>'' : ''''}${(clients || []).map(c => `<option value="${c.id}" ${d?.client_id === c.id ? ''selected'' : ''''}>${escapeHtml(c.name)}</option>`).join('''')}</select></div>
        <div class="f-row"><label>Property</label><select name="property_id"><option value="">— None —</option>${(properties || []).map(p => `<option value="${p.id}" ${d?.property_id === p.id ? ''selected'' : ''''}>${escapeHtml(p.name)}</option>`).join('''')}</select></div>
        <div class="f-row"><label>Type *</label><select name="deal_type" required>${types.map(t => `<option value="${t}" ${d?.deal_type === t ? ''selected'' : ''''}>${t}</option>`).join('''')}</select></div>
        <div class="f-row"><label>Stage</label><select name="stage">${stages.map(s => `<option value="${s}" ${(d?.stage || ''exploring'') === s ? ''selected'' : ''''}>${s}</option>`).join('''')}</select></div>
        <div class="f-row"><label>Estimated value ($)</label><input name="estimated_value" type="number" step="1000" value="${d?.estimated_value ?? ''''}" /></div>
        <div class="f-row"><label>Estimated commission ($)</label><input name="estimated_commission" type="number" step="100" value="${d?.estimated_commission ?? ''''}" /></div>
        <div class="f-row"><label>Target close date</label><input name="close_date" type="date" value="${d?.close_date || ''''}" /></div>
        <div class="f-row full"><label>Notes</label><textarea name="notes" rows="4">${escapeHtml(d?.notes || '''')}</textarea></div>
      </div>
    </form>
    <div class="modal-foot">
      ${isNew ? '''' : `<button class="btn-ghost" id="delete-deal" style="margin-right:auto;color:#d68080;border-color:#5a3535">Delete</button>`}
      <button class="btn-ghost" onclick="window.__closeModal()">Cancel</button>
      <button class="btn-solid" id="save-deal">${isNew ? ''Create deal'' : ''Save changes''}</button>
    </div>
  `)
  document.getElementById(''save-deal'').addEventListener(''click'', async () => {
    const fd = new FormData(document.getElementById(''deal-form''))
    const payload = {}
    fd.forEach((v, k) => {
      if (v === '''') payload[k] = null
      else if (k === ''estimated_value'' || k === ''estimated_commission'') payload[k] = Number(v)
      else payload[k] = v
    })
    if (!payload.client_id) { alert(''Pick a client''); return }
    try {
      const op = isNew ? sb.from(''deals'').insert(payload) : sb.from(''deals'').update(payload).eq(''id'', d.id)
      const { error } = await op; if (error) throw error
      window.__closeModal(); route()
    } catch (err) { alert(''Save failed: '' + err.message) }
  })
  if (!isNew) document.getElementById(''delete-deal'').addEventListener(''click'', async () => {
    if (!confirm(`Delete deal "${d.title || d.client?.name}"? This cannot be undone.`)) return
    try {
      const { error } = await sb.from(''deals'').delete().eq(''id'', d.id)
      if (error) throw error
      window.__closeModal(); route()
    } catch (err) { alert(''Delete failed: '' + err.message) }
  })
}

RENDERERS.warrooms = async (body) => {
  const { data, error } = await sb.from(''war_rooms'').select(''id, name, status, last_message_at, unread_agent, client:clients(name)'').order(''last_message_at'', { ascending: false, nullsLast: true })
  if (error) throw error
  if (!data.length) {
    body.innerHTML = `<div class="panel"><div class="empty"><h3>No war rooms yet</h3><p>A war room is the per-deal communication channel that connects you and a client. Create a war room from a deal record to start a thread that the client sees in their portal.</p><p class="hint">War rooms are designed for: offer strategy, escrow updates, document drops, milestones, decisions.</p></div></div>`
    return
  }
  body.innerHTML = `<div class="panel"><div class="panel-body tight"><table class="tbl"><thead><tr><th>Name</th><th>Client</th><th>Status</th><th>Last Activity</th><th>Unread</th></tr></thead><tbody>${data.map(w => `<tr><td class="primary">${escapeHtml(w.name)}</td><td class="muted">${escapeHtml(w.client?.name || ''—'')}</td><td><span class="tag ${w.status === ''active'' ? ''tag-active'' : ''tag-off''}">${w.status}</span></td><td class="muted num">${formatDate(w.last_message_at)}</td><td class="num">${w.unread_agent || 0}</td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.campaigns = async (body) => {
  const { data, error } = await sb.from(''email_blasts'').select(''id, subject, campaign_name, recipient_count, sent_count, failed_count, started_at, finished_at'').order(''started_at'', { ascending: false })
  if (error) throw error
  if (!data.length) return RENDERERS.placeholder(body, { label: ''Email Campaigns'' }, ''Past campaigns will appear here once email blasts are sent through worker infrastructure that writes to email_blasts.'')
  body.innerHTML = `<div class="panel"><div class="panel-body tight"><table class="tbl"><thead><tr><th>Campaign</th><th>Subject</th><th>Recipients</th><th>Sent</th><th>Failed</th><th>Started</th></tr></thead><tbody>${data.map(b => `<tr><td class="primary">${escapeHtml(b.campaign_name || ''—'')}</td><td>${escapeHtml(b.subject || ''—'')}</td><td class="num">${b.recipient_count || 0}</td><td class="num">${b.sent_count || 0}</td><td class="num">${b.failed_count || 0}</td><td class="muted num">${formatDate(b.started_at)}</td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.blog = async (body) => {
  const { data, error } = await sb.from(''blog_posts'').select(''id, name, slug, publish_date, created_at'').order(''created_at'', { ascending: false }).limit(50)
  if (error) throw error
  if (!data.length) return RENDERERS.placeholder(body, { label: ''Blog Posts'' }, ''No blog posts yet. ~686 posts can be backfilled from the Webflow Blog Posts collection via a sync worker in Sprint C.'')
  body.innerHTML = `<div class="panel"><div class="panel-body tight"><table class="tbl"><thead><tr><th>Title</th><th>Slug</th><th>Published</th></tr></thead><tbody>${data.map(p => `<tr><td class="primary">${escapeHtml(p.name)}</td><td class="muted">${escapeHtml(p.slug)}</td><td class="muted num">${formatDate(p.publish_date || p.created_at)}</td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.testimonials = async (body) => {
  const { data, error } = await sb.from(''testimonials'').select(''id, name, review, buyer_or_seller, display_order'').order(''display_order'')
  if (error) throw error
  body.innerHTML = `<div class="panel"><div class="panel-body tight"><table class="tbl"><thead><tr><th>Name</th><th>Side</th><th>Review</th></tr></thead><tbody>${data.map(t => `<tr><td class="primary">${escapeHtml(t.name)}</td><td>${escapeHtml(t.buyer_or_seller || ''—'')}</td><td class="muted">${escapeHtml((t.review || '''').slice(0, 120))}...</td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.activities = async (body) => {
  const { data, error } = await sb.from(''activities'').select(''id, activity_type, subject, occurred_at, client:clients(name)'').order(''occurred_at'', { ascending: false }).limit(100)
  if (error) throw error
  if (!data.length) return RENDERERS.placeholder(body, { label: ''Activities'' }, ''Activity log captures every call, email, meeting, showing, offer, and contract event. Populated automatically as you interact with clients in the system.'')
  body.innerHTML = `<div class="panel"><div class="panel-body tight"><table class="tbl"><thead><tr><th>Type</th><th>Subject</th><th>Client</th><th>When</th></tr></thead><tbody>${data.map(a => `<tr><td><span class="tag tag-active">${a.activity_type}</span></td><td>${escapeHtml(a.subject || ''—'')}</td><td>${escapeHtml(a.client?.name || ''—'')}</td><td class="muted num">${formatDate(a.occurred_at)}</td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.notifications = async (body) => RENDERERS.placeholder(body, { label: ''Notifications'' }, ''In-app notification feed for agent and client. Populated by event triggers (new message, price change, document uploaded, deal stage change). Ships with the realtime channel in a follow-up sprint.'')

RENDERERS.builder = async (body) => {
  body.innerHTML = `<div class="tools-grid">
    <a class="tool-card" href="https://cma-workerjs.tim-d10.workers.dev" target="_blank"><span class="badge">Generator</span><h4>CMA Generator</h4><p>Drop in an MLS PDF and build a branded Comparative Market Analysis page. Output renders inside this admin under CMAs.</p><span class="open">Open →</span></a>
    <div class="tool-card"><span class="badge">Coming</span><h4>Pool Estimator</h4><p>Bay Area pool installation estimator. Currently lives in a separate Webflow embed — will be ported in here in the next sprint.</p><span class="open">Pending →</span></div>
    <div class="tool-card"><span class="badge">Coming</span><h4>Label Sales Agent</h4><p>AI-powered label / lead generation tool. Will be migrated as a tab here.</p><span class="open">Pending →</span></div>
    <div class="tool-card"><span class="badge">Coming</span><h4>Bulk CSV Image Downloader</h4><p>Browser-based ZIP downloader for Webflow CDN images. Will live in this admin once migrated from sanfranciscocondomarket.com/tools.</p><span class="open">Pending →</span></div>
  </div>`
}

RENDERERS.import = async (body) => RENDERERS.placeholder(body, { label: ''Data Import'' }, ''Bulk upload via CSV / JSON for properties, clients, leads, and contacts. Maps fields automatically. Coming in Sprint C — interim uploads can run through Supabase Studio.'')

RENDERERS.reports = async (body) => RENDERERS.placeholder(body, { label: ''Reports'' }, ''Saved analytics views: pipeline value over time, conversion funnel, source attribution, time-on-market, list-to-sale ratio. Built on the pageviews + email_events + deals tables. Coming in Sprint C.'')

RENDERERS.settings = async (body) => {
  body.innerHTML = `<div class="panel">
    <div class="panel-head"><h2>Account</h2></div>
    <div class="panel-body">
      <dl class="dl">
        <dt>Signed in as</dt><dd>${escapeHtml(state.user.email)}</dd>
        <dt>User ID</dt><dd class="muted" style="font-family:var(--fm);font-size:11px">${escapeHtml(state.user.id)}</dd>
        <dt>Signed up</dt><dd class="muted">${formatDate(state.user.created_at)}</dd>
      </dl>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h2>Supabase</h2></div>
    <div class="panel-body">
      <dl class="dl">
        <dt>Project</dt><dd><a href="https://supabase.com/dashboard/project/kumfuludrhoqirxvaqja" target="_blank">kumfuludrhoqirxvaqja</a></dd>
        <dt>Region</dt><dd class="muted">us-west-1</dd>
        <dt>URL</dt><dd class="muted" style="font-family:var(--fm);font-size:11px">${SUPABASE_URL}</dd>
      </dl>
    </div>
  </div>`
}

RENDERERS.placeholder = async (body, tab, custom) => {
  body.innerHTML = `<div class="panel"><div class="empty"><h3>${escapeHtml(tab.label)}</h3><p>${escapeHtml(custom || ''This tab is scaffolded but not yet implemented.'')}</p></div></div>`
}

// ============ MODAL UTILS ============
function openModal(html) {
  const m = document.getElementById(''modal'')
  m.innerHTML = html
  document.getElementById(''modal-back'').classList.add(''open'')
}
window.__closeModal = () => document.getElementById(''modal-back'').classList.remove(''open'')
document.getElementById(''modal-back'').addEventListener(''click'', e => { if (e.target.id === ''modal-back'') window.__closeModal() })
document.addEventListener(''keydown'', e => { if (e.key === ''Escape'') window.__closeModal() })

// ============ HELPERS ============
function escapeHtml(s) { return String(s ?? '''').replace(/[&<>"'']/g, c => ({ ''&'': ''&amp;'', ''<'': ''&lt;'', ''>'': ''&gt;'', ''"'': ''&quot;'', "''": ''&#39;'' }[c])) }
function escapeAttr(s) { return escapeHtml(s) }
function formatDate(d) { if (!d) return ''—''; const dt = new Date(d); return dt.toLocaleDateString(''en-US'', { month: ''short'', day: ''numeric'', year: ''numeric'' }) }

// ============ GO ============
const initialHash = location.hash.slice(1)
if (initialHash && TAB_MAP[initialHash]) state.currentTab = initialHash
init()
</script>
</body>
</html>
' WHERE key = 'admin/index_v03.html';