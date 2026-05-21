UPDATE public.admin_assets SET content = content || '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>McMullen Properties — Admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #0f1218;
  --navy: #1a1f2e;
  --raised: #252b3d;
  --hover: #2f3650;
  --border: #2f3650;
  --bluegray: #91a1ba;
  --bluegray-dim: #6d7a91;
  --charcoal: #353535;
  --text: #e5e8ef;
  --text-dim: #9aa3b7;
  --text-faint: #5f6982;
  --success: #4a8266;
  --warn: #b8924a;
  --danger: #b35454;
  --accent: #91a1ba;
  --fh: ''Playfair Display'', Georgia, serif;
  --fb: ''DM Sans'', system-ui, sans-serif;
  --fm: ''JetBrains Mono'', ui-monospace, monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--fb); font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
a { color: var(--bluegray); text-decoration: none; }
a:hover { color: var(--text); }
button, input, select, textarea { font-family: inherit; font-size: inherit; color: inherit; }
button { cursor: pointer; background: none; border: none; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--hover); }

/* =========== LOGIN ============ */
.login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: linear-gradient(135deg, var(--bg) 0%, #161b26 100%); }
.login-card { width: 100%; max-width: 420px; background: var(--navy); border: 1px solid var(--border); border-radius: 4px; padding: 48px 44px; box-shadow: 0 24px 80px rgba(0,0,0,.4); }
.login-brand { font-family: var(--fh); font-size: 28px; font-weight: 600; letter-spacing: -.02em; color: var(--text); margin-bottom: 6px; }
.login-brand em { font-style: italic; color: var(--bluegray); font-weight: 400; }
.login-sub { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--bluegray-dim); margin-bottom: 36px; }
.login-tabs { display: flex; gap: 0; margin-bottom: 28px; border-bottom: 1px solid var(--border); }
.login-tab { flex: 1; padding: 10px 0; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-faint); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .15s; }
.login-tab.active { color: var(--text); border-bottom-color: var(--bluegray); }
.field { margin-bottom: 18px; }
.field label { display: block; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 8px; }
.field input { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 11px 14px; color: var(--text); transition: border-color .15s; }
.field input:focus { outline: none; border-color: var(--bluegray); }
.btn-primary { display: block; width: 100%; background: var(--bluegray); color: var(--navy); padding: 12px; border-radius: 3px; font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; transition: background .15s; }
.btn-primary:hover { background: var(--text); }
.btn-primary:disabled { background: var(--text-faint); cursor: not-allowed; }
.login-msg { font-size: 13px; margin-top: 14px; padding: 10px 12px; border-radius: 3px; }
.login-msg.error { background: rgba(179,84,84,.12); color: #d68080; border-left: 3px solid var(--danger); }
.login-msg.info { background: rgba(145,161,186,.12); color: var(--bluegray); border-left: 3px solid var(--bluegray); }
.login-msg.success { background: rgba(74,130,102,.12); color: #6db090; border-left: 3px solid var(--success); }

/* =========== SHELL ============ */
.shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.side { background: var(--navy); border-right: 1px solid var(--border); position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; }
.side-brand { padding: 28px 24px 22px; border-bottom: 1px solid var(--border); }
.side-brand .name { font-family: var(--fh); font-size: 19px; font-weight: 700; letter-spacing: -.01em; line-height: 1.1; color: var(--text); }
.side-brand .name em { color: var(--bluegray); font-style: italic; font-weight: 400; }
.side-brand .role { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-faint); margin-top: 6px; }
.side-nav { padding: 16px 0 24px; flex: 1; }
.side-group { padding: 14px 24px 6px; font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; }
.side-link { display: flex; align-items: center; justify-content: space-between; padding: 9px 24px; font-size: 13.5px; color: var(--text-dim); border-left: 2px solid transparent; transition: all .12s; cursor: pointer; }
.side-link:hover { background: var(--raised); color: var(--text); }
.side-link.active { background: var(--raised); color: var(--text); border-left-color: var(--bluegray); }
.side-link .count { font-family: var(--fm); font-size: 10.5px; color: var(--text-faint); }
.side-link.active .count { color: var(--bluegray); }
.side-foot { padding: 18px 24px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-faint); }
.side-foot .who { color: var(--text-dim); margin-bottom: 4px; }
.side-foot button { color: var(--bluegray); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; padding: 0; }
.side-foot button:hover { color: var(--text); }

.main { padding: 0; min-width: 0; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 32px; border-bottom: 1px solid var(--border); background: var(--bg); position: sticky; top: 0; z-index: 5; }
.topbar h1 { font-family: var(--fh); font-size: 22px; font-weight: 600; letter-spacing: -.01em; color: var(--text); }
.topbar h1 em { color: var(--bluegray); font-style: italic; font-weight: 400; }
.crumbs { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 4px; }
.top-actions { display: flex; gap: 10px; align-items: center; }
.btn-ghost { padding: 8px 14px; background: transparent; border: 1px solid var(--border); border-radius: 3px; font-size: 11.5px; letter-spacing: .06em; color: var(--text-dim); transition: all .12s; }
.btn-ghost:hover { border-color: var(--bluegray); color: var(--text); }
.btn-solid { padding: 8px 14px; background: var(--bluegray); color: var(--navy); border-radius: 3px; font-size: 11.5px; font-weight: 600; letter-spacing: .06em; }
.btn-solid:hover { background: var(--text); }

.tab-body { padding: 28px 32px 64px; }

/* === Overview === */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
.kpi { background: var(--navy); border: 1px solid var(--border); border-radius: 4px; padding: 18px 20px; }
.kpi .lbl { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 10px; }
.kpi .val { font-family: var(--fh); font-size: 32px; font-weight: 700; line-height: 1; color: var(--text); }
.kpi .val em { color: var(--bluegray); font-style: italic; font-weight: 400; font-size: 18px; margin-left: 4px; }
.kpi .sub { font-size: 11px; color: var(--text-faint); margin-top: 6px; }

.panel { background: var(--navy); border: 1px solid var(--border); border-radius: 4px; margin-bottom: 20px; }
.panel-head { padding: 16px 22px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: baseline; }
.panel-head h2 { font-family: var(--fh); font-size: 17px; font-weight: 600; color: var(--text); }
.panel-head .meta { font-size: 11px; color: var(--text-faint); letter-spacing: .08em; text-transform: uppercase; }
.panel-body { padding: 16px 22px; }
.panel-body.tight { padding: 0; }

/* === Tables === */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-faint); font-weight: 500; padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg); position: sticky; top: 0; }
.tbl td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: rgba(47,54,80,.3); }
.tbl .primary { color: var(--text); font-weight: 500; }
.tbl .muted { color: var(--text-faint); }
.tbl .num { font-family: var(--fm); font-size: 12.5px; }
.tbl .price { font-family: var(--fh); font-weight: 600; font-size: 14px; }
.row-actions { display: flex; gap: 8px; }
.row-actions button { font-size: 11px; padding: 4px 10px; border-radius: 3px; border: 1px solid var(--border); color: var(--text-dim); }
.row-actions button:hover { border-color: var(--bluegray); color: var(--text); }
.row-actions button.danger:hover { border-color: var(--danger); color: #d68080; }

.tag { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 2px; letter-spacing: .06em; text-transform: uppercase; font-weight: 500; }
.tag-sold { background: rgba(74,130,102,.18); color: #6db090; }
.tag-active { background: rgba(145,161,186,.18); color: var(--bluegray); }
.tag-pending { background: rgba(184,146,74,.18); color: #d4ad6a; }
.tag-off { background: rgba(120,120,120,.18); color: #b0b0b0; }

.filter-bar { padding: 14px 22px; border-bottom: 1px solid var(--border); display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.filter-bar input, .filter-bar select { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 7px 12px; font-size: 12.5px; color: var(--text); min-width: 0; }
.filter-bar input:focus, .filter-bar select:focus { outline: none; border-color: var(--bluegray); }
.filter-bar input[type=search] { flex: 1; min-width: 200px; }
.filter-bar .count-label { font-size: 11px; color: var(--text-faint); letter-spacing: .08em; text-transform: uppercase; }

/* === Empty state === */
.empty { padding: 60px 32px; text-align: center; }
.empty h3 { font-family: var(--fh); font-size: 22px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
.empty p { color: var(--text-dim); max-width: 480px; margin: 0 auto 22px; }
.empty .hint { font-size: 12px; color: var(--text-faint); font-style: italic; }

/* === Modal === */
.modal-back { position: fixed; inset: 0; background: rgba(15,18,24,.78); display: none; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
.modal-back.open { display: flex; }
.modal { background: var(--navy); border: 1px solid var(--border); border-radius: 4px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; }
.modal-head { padding: 22px 28px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: baseline; }
.modal-head h3 { font-family: var(--fh); font-size: 20px; font-weight: 600; color: var(--text); }
.modal-head .sub { font-size: 11px; color: var(--text-faint); letter-spacing: .08em; text-transform: uppercase; }
.modal-body { padding: 24px 28px; }
.modal-foot { padding: 18px 28px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-grid .full { grid-column: 1 / -1; }
.f-row { display: flex; flex-direction: column; }
.f-row label { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 6px; }
.f-row input, .f-row select, .f-row textarea { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 9px 12px; color: var(--text); }
.f-row textarea { resize: vertical; min-height: 80px; }
.f-row input:focus, .f-row select:focus, .f-row textarea:focus { outline: none; border-color: var(--bluegray); }

/* === Tool grid === */
.tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.tool-card { background: var(--navy); border: 1px solid var(--border); border-radius: 4px; padding: 20px 22px; transition: all .15s; cursor: pointer; display: block; color: inherit; }
.tool-card:hover { border-color: var(--bluegray); transform: translateY(-2px); }
.tool-card h4 { font-family: var(--fh); font-size: 17px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.tool-card p { font-size: 12.5px; color: var(--text-dim); line-height: 1.55; margin-bottom: 14px; }
.tool-card .open { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--bluegray); }
.tool-card .badge { display: inline-block; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 8px; }

/* === Spinner === */
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--bluegray); border-radius: 50%; animation: spin .8s linear infinite; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading { text-align: center; padding: 60px 20px; color: var(--text-dim); }

/* === Pipeline (deals) === */
.pipeline { display: grid; grid-template-columns: repeat(7, minmax(180px, 1fr)); gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.pipe-col { background: var(--navy); border: 1px solid var(--border); border-radius: 4px; min-height: 200px; }
.pipe-head { padding: 12px 14px; border-bottom: 1px solid var(--border); }
.pipe-head h4 { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; }
.pipe-head .v { font-family: var(--fh); font-size: 16px; font-weight: 600; color: var(--text); margin-top: 4px; }
.pipe-cards { padding: 8px; }
.pipe-card { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px; cursor: grab; transition: transform .15s ease, opacity .15s ease, border-color .15s ease; }
.pipe-card:hover { border-color: var(--bluegray); }
.pipe-card:active { cursor: grabbing; }
.pipe-card.dragging { opacity: .4; transform: scale(.96); }
.pipe-card .name { color: var(--text); font-weight: 500; }
.pipe-card .price { font-family: var(--fh); font-size: 13px; color: var(--bluegray); margin-top: 3px; }
.pipe-card .meta { font-size: 10px; color: var(--text-faint); margin-top: 4px; letter-spacing: .04em; }
.pipe-col.drag-over { border-color: var(--bluegray); background: rgba(145,161,186,.08); }
.pipe-col.drag-over .pipe-cards { background: rgba(145,161,186,.04); }
.pipe-drop-hint { font-size: 10px; color: var(--text-faint); padding: 6px 4px; font-style: italic; text-align: center; }

/* === Detail page === */
.detail-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
.detail-grid > .full { grid-column: 1 / -1; }
.dl { display: grid; grid-template-columns: 140px 1fr; gap: 6px 18px; font-size: 13px; }
.dl dt { color: var(--text-faint); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; padding-top: 4px; }
.dl dd { color: var(--text); }

/* === Misc === */
.hint { color: var(--text-faint); font-size: 12px; font-style: italic; }
@media (max-width: 900px) {
  .shell { grid-template-columns: 1fr; }
  .side { position: relative; height: auto; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<!-- ============== LOGIN ============== -->
<div id="login" class="login-wrap" style="display:none">
  <div class="login-card">
    <div class="login-brand">McM' WHERE key = 'admin/index_v03.html';