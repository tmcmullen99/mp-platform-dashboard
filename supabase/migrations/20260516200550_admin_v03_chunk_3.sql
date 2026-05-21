UPDATE public.admin_assets SET content = content || 'ss="f-row full"><label>Slug</label><input name="slug" required value="${escapeAttr(p?.slug || '''')}" /></div>
        <div class="f-row"><label>Price ($)</label><input name="price" type="number" value="${p?.price ?? ''''}" /></div>
        <div class="f-row"><label>Postal Code</label><input name="pin_code" value="${escapeAttr(p?.pin_code || '''')}" /></div>
        <div class="f-row"><label>Bedrooms</label><input name="bedrooms" type="number" step="0.5" value="${p?.bedrooms ?? ''''}" /></div>
        <div class="f-row"><label>Bathrooms</label><input name="bathrooms" type="number" step="0.5" value="${p?.bathrooms ?? ''''}" /></div>
        <div class="f-row"><label>Area (sq ft)</label><input name="area_sqft" type="number" value="${p?.area_sqft ?? ''''}" /></div>
        <div class="f-row"><label>Year Built</label><input name="built_year" type="number" value="${p?.built_year ?? ''''}" /></div>
        <div class="f-row"><label>Parking</label><input name="parking_description" value="${escapeAttr(p?.parking_description || '''')}" /></div>
        <div class="f-row"><label>HOA Fee</label><input name="monthly_hoa_fee" value="${escapeAttr(p?.monthly_hoa_fee || '''')}" /></div>
        <div class="f-row"><label>Neighborhood</label><select name="neighborhood_id"><option value="">—</option>${neighborhoods.map(n => `<option value="${n.id}" ${p?.neighborhood?.name === n.name ? ''selected'' : ''''}>${escapeHtml(n.name)}</option>`).join('''')}</select></div>
        <div class="f-row"><label>Property Type</label><select name="property_type_id"><option value="">—</option>${types.map(n => `<option value="${n.id}" ${p?.property_type?.name === n.name ? ''selected'' : ''''}>${escapeHtml(n.name)}</option>`).join('''')}</select></div>
        <div class="f-row full"><label>Status</label><select name="status_id"><option value="">—</option>${statuses.map(n => `<option value="${n.id}" ${p?.status?.name === n.name ? ''selected'' : ''''}>${escapeHtml(n.name)}</option>`).join('''')}</select></div>
        <div class="f-row full"><label>Description (HTML)</label><textarea name="description_html" rows="6">${escapeHtml(p?.description_html || '''')}</textarea></div>
      </div>
    </form>
    <div class="modal-foot">
      ${isNew ? '''' : `<button class="btn-ghost" id="delete-prop" style="margin-right:auto;color:#d68080;border-color:#5a3535">Delete</button>`}
      <button class="btn-ghost" onclick="window.__closeModal()">Cancel</button>
      <button class="btn-solid" id="save-prop">${isNew ? ''Create listing'' : ''Save changes''}</button>
    </div>
  `)
  document.getElementById(''save-prop'').addEventListener(''click'', async () => {
    const form = document.getElementById(''prop-form'')
    const fd = new FormData(form)
    const payload = {}
    fd.forEach((v, k) => { payload[k] = v === '''' ? null : v })
    if (payload.price) payload.price = Number(payload.price)
    if (payload.bedrooms) payload.bedrooms = Number(payload.bedrooms)
    if (payload.bathrooms) payload.bathrooms = Number(payload.bathrooms)
    if (payload.area_sqft) payload.area_sqft = Number(payload.area_sqft)
    if (payload.built_year) payload.built_year = Number(payload.built_year)
    try {
      if (isNew) {
        const { error } = await sb.from(''properties'').insert(payload)
        if (error) throw error
      } else {
        const { error } = await sb.from(''properties'').update(payload).eq(''id'', p.id)
        if (error) throw error
      }
      window.__closeModal()
      route()
    } catch (err) { alert(''Save failed: '' + err.message) }
  })
  if (!isNew) {
    document.getElementById(''delete-prop'').addEventListener(''click'', async () => {
      if (!confirm(`Delete ${p.name}? This cannot be undone.`)) return
      try {
        const { error } = await sb.from(''properties'').delete().eq(''id'', p.id)
        if (error) throw error
        window.__closeModal()
        route()
      } catch (err) { alert(''Delete failed: '' + err.message) }
    })
  }
}

RENDERERS.neighborhoods = async (body) => {
  const { data, error } = await sb.from(''neighborhoods'').select(''id, name, slug, description, display_order'').order(''display_order'')
  if (error) throw error
  body.innerHTML = `<div class="panel"><div class="panel-head"><h2>${data.length} neighborhoods</h2><span class="meta">CRUD coming in v2</span></div><div class="panel-body tight"><table class="tbl"><thead><tr><th>Name</th><th>Slug</th><th>Order</th></tr></thead><tbody>${data.map(n => `<tr><td class="primary">${escapeHtml(n.name)}</td><td class="muted">${escapeHtml(n.slug)}</td><td class="num">${n.display_order ?? 0}</td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.cmas = async (body) => {
  const { data, error } = await sb.from(''cmas'').select(''id, slug, name, property_address, list_price, published_at, created_at'').order(''created_at'', { ascending: false })
  if (error) throw error
  body.innerHTML = `<div class="panel"><div class="panel-head"><h2>${data.length} CMAs published</h2><span class="meta">Each row renders at /cmas/{slug}</span></div><div class="panel-body tight"><table class="tbl"><thead><tr><th>Property</th><th>List Price</th><th>Slug</th><th>Created</th><th></th></tr></thead><tbody>${data.map(c => `<tr><td class="primary">${escapeHtml(c.property_address || c.name)}</td><td class="price">${escapeHtml(c.list_price || ''—'')}</td><td class="muted">${escapeHtml(c.slug)}</td><td class="muted num">${formatDate(c.created_at)}</td><td class="row-actions"><a class="btn-ghost" href="https://www.mcmullen.properties/cmas/${c.slug}" target="_blank">Open</a></td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.leads = async (body) => {
  const { data, error } = await sb.from(''leads'').select(''id, source, name, email, phone, message, created_at'').order(''created_at'', { ascending: false }).limit(200)
  if (error) throw error
  if (!data.length) return RENDERERS.placeholder(body, { label: ''Leads'' }, ''Inbound form submissions will appear here once the contact + property-inquiry forms are wired up to write to the leads table (Sprint D).'')
  body.innerHTML = `<div class="panel"><div class="panel-body tight"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Source</th><th>Message</th><th>When</th></tr></thead><tbody>${data.map(l => `<tr><td class="primary">${escapeHtml(l.name || ''—'')}</td><td>${escapeHtml(l.email || ''—'')}</td><td class="muted">${escapeHtml(l.phone || ''—'')}</td><td><span class="tag tag-active">${escapeHtml(l.source || ''—'')}</span></td><td class="muted">${escapeHtml((l.message || '''').slice(0, 80))}</td><td class="muted num">${formatDate(l.created_at)}</td></tr>`).join('''')}</tbody></table></div></div>`
}

RENDERERS.clients = async (body) => {
  document.getElementById(''top-actions'').innerHTML = ''<button class="btn-solid" id="new-client">+ New Client</button>''
  const { data, error } = await sb.from(''clients'').select(''id, name, email, phone, client_type, stage, created_at'').order(''created_at'', { ascending: false })
  if (error) throw error
  document.getElementById(''new-client'').addEventListener(''click'', () => editClient())
  if (!data.length) {
    body.innerHTML = `<div class="panel"><div class="empty"><h3>No clients yet</h3><p>Promote leads into clients to start tracking deals, activities, and to invite them into the portal with their own war room.</p><button class="btn-solid" onclick="document.getElementById(''new-client'').click()">Add your first client</button></div></div>`
    return
  }
  body.innerHTML = `<div class="panel"><div class="panel-body tight"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Stage</th><th>Added</th><th></th></tr></thead><tbody>${data.map(c => `<tr><td class="primary">${escapeHtml(c.name)}</td><td>${escapeHtml(c.email || ''—'')}</td><td class="muted">${escapeHtml(c.phone || ''—'')}</td><td>${escapeHtml(c.client_type || ''—'')}</td><td><span class="tag tag-active">${escapeHtml(c.stage || ''—'')}</span></td><td class="muted num">${formatDate(c.created_at)}</td><td class="row-actions"><button data-edit-client="${c.id}">Edit</button></td></tr>`).join('''')}</tbody></table></div></div>`
  body.querySelectorAll(''[data-edit-client]'').forEach(b => b.addEventListener(''click'', () => editClient(data.find(d => d.id === b.dataset.editClient))))
}

async function editClient(c) {
  const isNew = !c
  openModal(`
    <div class="modal-head"><div><div class="sub">${isNew ? ''New client'' : ''Edit client''}</div><h3>${isNew ? ''Add a client'' : escapeHtml(c.name)}</h3></div><button class="btn-ghost" onclick="window.__closeModal()">Cancel</button></div>
    <form class="modal-body" id="client-form">
      <div class="form-grid">
        <div class="f-row full"><label>Name</label><input name="name" required value="${escapeAttr(c?.name || '''')}" /></div>
        <div class="f-row"><label>Email</label><input name="email" type="email" value="${escapeAttr(c?.email || '''')}" /></div>
        <div class="f-row"><label>Phone</label><input name="phone" value="${escapeAttr(c?.phone || '''')}" /></div>
        <div class="f-row"><label>Type</label><select name="client_type">${[''buyer'',''seller'',''both'',''investor'',''referral_partner'',''other''].map(t => `<option value="${t}" ${c?.client_type === t ? ''selected'' : ''''}>${t}</option>`).join('''')}</select></div>
        <div class="f-row"><label>Stage</label><select name="stage">${[''lead'',''qualified'',''active'',''under_contract'',''closed'',''dormant''].map(t => `<option value="${t}" ${c?.stage === t ? ''selected'' : ''''}>${t}</option>`).join('''')}</select></div>
        <div class="f-row full"><label>Notes</label><textarea name="notes" rows="4">${escapeHtml(c?.notes || '''')}</textarea></div>
      </div>
    </form>
    <div class="modal-foot">
      ${isNew ? '''' : `<button class="btn-ghost" id="delete-client" style="margin-right:auto;color:#d68080;border-color:#5a3535">Delete</button>`}
      <button class="btn-ghost" onclick="window.__closeModal()">Cancel</button>
      <button class="btn-solid" id="save-client">${isNew ? ''Add client'' : ''Save changes''}</button>
    </div>
  `)
  document.getElementById(''save-client'').addEventListener(''click'', async () => {
    const fd = new FormData(document.getElementById(''client-form''))
    const payload = {}; fd.forEach((v, k) => payload[k] = v === '''' ? null : v)
    try {
      if (isNew) { const { error } = await sb.from(''clients'').insert(payload); if (error) throw error }
      else { const { error } = await sb.from(''clients'').update(payload).eq(''id'', c.id); if (error) throw error }
      window.__closeModal(); route()
    } catch (err) { alert(''Save failed: '' + err.message) }
  })
  if (!isNew) document.getElementById(''delete-client'').addEventListener(''click'', async () => {
    if (!confirm(`Delete ${c.name}?`)) return
    const { error } = await sb.from(''clients'').delete().eq(''id'', c.id)
    if (error) return alert(err.message)
    window.__closeModal(); route()
  })
}

RENDERERS.deals = async (body) => {
  document.getElementById(''top-actions'').innerHTML = ''<button class="btn-solid" id="new-deal">+ New Deal</button>''
  document.getElementById(''new-deal'').addEventListener(''click'', () => editDeal())
  const { data, error } = await sb.from(''deals'').select(''id, title, stage, deal_type, estimated_value, estimated_commission, close_date, notes, client_id, property_id, client:clients(name), property:properties(name)'').order(''created_at'', { ascending: false })
  if (error) throw error
  if (!data.length) {
    body.innerHTML = `<div class="panel"><div class="empty"><h3>No deals yet</h3><p>Deals are the pipeline objects that connect a client to a property and track them from exploring through close.</p><button class="btn-solid" onclick="document.getElementById(''new-deal'').click()">Create your first deal</button></div></div>`
    return
  }
  const stages = [''exploring'',''active'',''offer'',''accepted'',''escrow'',''closed'',''lost'']
  const byStage = Object.fromEntries(stages.map(s => [s, []]))
  data.forEach(d => byStage[d.stage]?.push(d))
  body.innerHTML = `<div class="pipeline">${stages.map(s => {
    const total = byStage[s].reduce((sum, d) => sum + (Number(d.estimated_value) || 0), 0)
    return `<div class="pipe-col" data-stage="${s}"><div class="pipe-head"><h4>${s}</h4><div class="v">${byStage[s].length} · $${total.toLocaleString()}</div></div><div class="pipe-cards">${byStage[s].map(d => `<div class="pipe-card" draggable="true" data-id="${d.id}" data-stage="${s}"><div class="name">${escapeHtml(d.title || d.client?.name || ''Untitled'')}</div>${d.property?.name ? `<div class="meta">${escapeHtml(d.property.name)}</div>` : ''''}<div class="price">$${Number(d.estimated_value || 0).toLocaleString()}</div></div>`).join('''') || ''<div class="pipe-drop-hint">Drop here</div>''}</div></div>`
  }).join('''')}</div>`
  // Click-to-edit on cards
  let suppressClick = false
  body.querySelectorAll(''.pipe-card'').forEach(card => {
    card.addEventListener(''click'', () => {
      if (suppressClick) { suppressClick = false; return }
      const d = data.find(x => x.id === card.dataset.id)
      if (d) editDeal(d)
    })
  })
  // Drag-and-drop
  let draggedId = null, draggedFromStage = null
  body.querySelectorAll(''.pipe-card'').forEach(card => {
    card.addEventListener(''dragstart'', e => {
      draggedId = card.dataset.id; draggedFromStage = card.dataset.stage
      card.classList.add(''dragging'')
      suppressClick = true
      e.dataTransfer.effectAllowed = ''move''
      e.dataTransfer.setData(''text/plain'', card.dataset.id)
    })
    card.addEventListener(''dragend'', () => { card.classList.remove(''dragging''); draggedId = null })
  })
  body.querySelectorAll(''.pipe-col'').forEach(col => {
    col.addEventListener(''dragover'', e => { e.preventDefault(); col.classList.add(''drag-over''); e.dataTransfer.dropEffect = ''move'' })
    col.addEventListener(''dragleave'', e => { if (!col.contains(e.relatedTarget)) col.classList.remove(''drag-over'') })
    col.addEventListener(''drop'', async e => {
      e.preventDefault()
      col.classList.remove(''drag-over'')
      const newStage = col.dataset.stage
      if (!draggedId || newStage === draggedFromStage) return
      const card = body.querySelector(`.pipe-card[data-id="${draggedId}"]`)
      const target = col.querySelector(''.pipe-cards'')
      if (card && target) { card.dataset.stage = newStage; target.appendChild(card) }
      try {
        const { error } = await sb.from(''deals'').update({ stage: newStage, updated_at: new Date().toISOString() }).eq(''id'', draggedId)
        if (error) throw error
        route()
      } catch (err) {
        alert(''Failed to move deal: '' + err.message)
        route()
      }
    })
  })
}

async function editDeal(d) {
  const isNew = !d
  const stages = [''exploring'',''active'',''offer'',''accepted'',''escrow'',''closed'',''lost'']
  const types = [''buyer_rep'',''seller_rep'',''dual'',''referral'',''investment'']
  const [{ data: clients }, { data: properties }] = await Promise.all([
    sb.from(''clients'').select(''id, name'').order(''name''),
    sb.from(''properties'').select(''id, name'').order(''name'')
  ])
  if (isNew && (!clients || !clients.length)) {
    alert(''Add a client first — every deal attaches to a client.'')
    return
  }
  openModal(`
    <div class="modal-head">
      <div>
        <div class="sub">${isNew ? ''New deal'' : ''Edit deal''}</div>
        <h3>${isNew ? ''Create a deal'' : escapeHtml(d.title || d.client?.name || ''Untitled'')}</h3>
      </div>
      <button class="btn-ghost" onclick="window.__closeModal()">Cancel</button>
    </div>
    <form class="modal-body" id="deal-form">
      <div class="form-grid">
        <div class="f-row full"><label>Title</label><input name="title" value="${escapeAttr(d?.title ' WHERE key = 'admin/index_v03.html';