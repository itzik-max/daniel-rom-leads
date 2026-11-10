// דשבורד הלידים של דניאל רום.
// כל ליד נשמר כאובייקט אחד (data). כדי להוסיף שדה: מוסיפים אותו לטופס ב־index.html,
// לטבלה ולכרטיס כאן, וזהו. אין צורך לשנות את המסד.
(function () {
  "use strict";

  const CFG = window.DR_CONFIG;
  const STATUS = Object.fromEntries(CFG.statuses.map((s, i) => [s.key, { ...s, i }]));
  const LOCAL_KEY = "dr_leads_v1";
  const CODE_KEY = "dr_code";
  const remote = !!(CFG.supabaseUrl && CFG.supabaseKey);

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD לפי שעון מקומי

  let leads = [];          // [{id, data, created_at}]
  let filterStatus = "";   // מפתח סטטוס, או "stage:open" וכו'
  let editingId = null;
  let code = "";

  // ---------- שכבת שמירה ----------
  const store = {
    async list() {
      if (!remote) return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      return rpc("dr_list", { p_code: code });
    },
    async save(id, data) {
      if (!remote) {
        const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
        const now = new Date().toISOString();
        let row = all.find((r) => r.id === id);
        if (row) { row.data = data; row.updated_at = now; }
        else { row = { id: crypto.randomUUID(), data, created_at: now, updated_at: now }; all.push(row); }
        localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
        return row;
      }
      return rpc("dr_save", { p_code: code, p_id: id, p_data: data });
    },
    async remove(id) {
      if (!remote) {
        const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]").filter((r) => r.id !== id);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
        return;
      }
      return rpc("dr_delete", { p_code: code, p_id: id });
    }
  };

  async function rpc(fn, args) {
    const res = await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CFG.supabaseKey, Authorization: `Bearer ${CFG.supabaseKey}` },
      body: JSON.stringify(args)
    });
    const txt = await res.text();
    const body = txt ? JSON.parse(txt) : null;
    if (!res.ok) {
      const err = new Error((body && body.message) || `שגיאה ${res.status}`);
      err.code = body && body.code;
      throw err;
    }
    return body;
  }

  // ---------- עזרים ----------
  const fullName = (d) => [d.first_name, d.last_name].filter(Boolean).join(" ");
  const fmtDate = (s) => (s ? s.split("-").reverse().join(".") : "");
  function waLink(phone) {
    let p = String(phone || "").replace(/\D/g, "");
    if (!p) return "";
    if (p.startsWith("0")) p = "972" + p.slice(1);
    return `https://wa.me/${p}`;
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 1800);
  }
  function showErr(msg) { const b = $("#errBanner"); b.textContent = msg; b.hidden = !msg; }
  function statusOptions(sel) {
    return CFG.statuses.map((s) => `<option value="${s.key}"${s.key === sel ? " selected" : ""}>${esc(s.label)}</option>`).join("");
  }
  const stageOf = (key) => (STATUS[key] ? STATUS[key].stage : "open");

  // ---------- תצוגה ----------
  function visible() {
    const q = $("#q").value.trim().toLowerCase();
    const dom = $("#fDomain").value;
    let out = leads.filter((r) => {
      const d = r.data;
      if (filterStatus.startsWith("stage:") ? stageOf(d.status) !== filterStatus.slice(6) : filterStatus && d.status !== filterStatus) return false;
      if (dom && d.domain !== dom) return false;
      if (q) {
        const hay = [fullName(d), d.phone, String(d.phone || "").replace(/\D/g, ""), d.notes, d.domain].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sort = $("#fSort").value;
    const byDate = (a, b) => (a.data.date || "").localeCompare(b.data.date || "") || (a.created_at || "").localeCompare(b.created_at || "");
    if (sort === "date_desc") out.sort((a, b) => byDate(b, a));
    if (sort === "date_asc") out.sort(byDate);
    if (sort === "name") out.sort((a, b) => fullName(a.data).localeCompare(fullName(b.data), "he"));
    if (sort === "status") out.sort((a, b) => (STATUS[a.data.status]?.i ?? 99) - (STATUS[b.data.status]?.i ?? 99) || byDate(b, a));
    return out;
  }

  function renderKpis() {
    const month = today().slice(0, 7);
    const n = leads.length;
    const cnt = (st) => leads.filter((r) => stageOf(r.data.status) === st).length;
    const thisMonth = leads.filter((r) => (r.data.date || "").startsWith(month)).length;
    const meetings = cnt("meeting") + cnt("won"); // מי שהגיע לפגישה או נסגר
    const won = cnt("won");
    const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");
    const k = [
      { l: "סה\"כ לידים", v: n },
      { l: "לידים החודש", v: thisMonth },
      { l: "בטיפול (לל\"מ)", v: cnt("open") },
      { l: "הגיעו לפגישה", v: meetings, s: `${pct(meetings, n)} מהלידים` },
      { l: "נסגרו", v: won, s: `${pct(won, meetings)} מהפגישות`, gold: true },
      { l: "לא רלוונטי", v: cnt("lost") }
    ];
    $("#kpis").innerHTML = k.map((x) => `<div class="kpi${x.gold ? " gold" : ""}"><div class="v">${x.v}</div><div class="l">${x.l}</div>${x.s ? `<div class="s">${x.s}</div>` : ""}</div>`).join("");
  }

  function renderPipeline() {
    const counts = {};
    leads.forEach((r) => (counts[r.data.status] = (counts[r.data.status] || 0) + 1));
    const openCount = leads.filter((r) => stageOf(r.data.status) === "open").length;
    const chips = [`<button class="chip${filterStatus === "" ? " on" : ""}" data-f="">הכול <b>${leads.length}</b></button>`,
      `<button class="chip st-open${filterStatus === "stage:open" ? " on" : ""}" data-f="stage:open"><span class="dot"></span>כל הלל"מ <b>${openCount}</b></button>`];
    CFG.statuses.forEach((s) => {
      chips.push(`<button class="chip st-${s.stage}${filterStatus === s.key ? " on" : ""}" data-f="${s.key}"><span class="dot"></span>${esc(s.label)} <b>${counts[s.key] || 0}</b></button>`);
    });
    $("#pipeline").innerHTML = chips.join("");
  }

  function renderRows() {
    const list = visible();
    $("#count").textContent = list.length === leads.length ? `${leads.length} לידים` : `${list.length} מתוך ${leads.length}`;
    $("#empty").hidden = list.length > 0;
    $("#empty").textContent = leads.length ? "אין לידים שמתאימים לסינון." : "אין עדיין לידים כאן. לוחצים על \"+ ליד חדש\" כדי להתחיל.";
    const phoneHtml = (p) => p ? `<span class="phone"><a href="tel:${esc(p)}">${esc(p)}</a><a class="wa" href="${waLink(p)}" target="_blank" rel="noopener">WhatsApp</a></span>` : "";
    const stSel = (r) => `<select class="st-select st-${stageOf(r.data.status)}" data-id="${r.id}" aria-label="סטטוס">${statusOptions(r.data.status)}</select>`;

    $("#rows").innerHTML = list.map((r) => {
      const d = r.data;
      return `<tr>
        <td class="name">${esc(fullName(d))}</td>
        <td>${phoneHtml(d.phone)}</td>
        <td class="date">${fmtDate(d.date)}</td>
        <td>${esc(d.domain)}</td>
        <td>${stSel(r)}</td>
        <td class="notes">${esc(d.notes)}</td>
        <td><button class="edit" data-edit="${r.id}">עריכה</button></td>
      </tr>`;
    }).join("");

    $("#cards").innerHTML = list.map((r) => {
      const d = r.data;
      return `<div class="card">
        <div class="row1"><span class="nm">${esc(fullName(d))}</span><button class="edit" data-edit="${r.id}">עריכה</button></div>
        <div class="meta"><span>${fmtDate(d.date)}</span>${d.domain ? `<span>${esc(d.domain)}</span>` : ""}</div>
        <div class="row2">${phoneHtml(d.phone)}${stSel(r)}</div>
        ${d.notes ? `<div class="nt">${esc(d.notes)}</div>` : ""}
      </div>`;
    }).join("");
  }

  function render() { renderKpis(); renderPipeline(); renderRows(); }

  // ---------- טופס ----------
  const form = $("#form");
  function openForm(id) {
    editingId = id || null;
    const d = id ? leads.find((r) => r.id === id).data : { date: today(), status: CFG.statuses[0].key };
    $("#dlgTitle").textContent = id ? "עריכת ליד" : "ליד חדש";
    $("#delBtn").hidden = !id;
    for (const el of form.elements) if (el.name) el.value = d[el.name] ?? "";
    if (!form.elements.domain.value) form.elements.domain.value = "";
    $("#dlg").showModal();
    if (!id) form.elements.first_name.focus();
  }

  async function saveForm() {
    const prev = editingId ? leads.find((r) => r.id === editingId).data : {};
    const data = { ...prev }; // שומר גם שדות שאין בטופס (אם נוספו בעתיד)
    for (const el of form.elements) if (el.name) data[el.name] = el.value.trim();
    $("#saveBtn").disabled = true;
    try {
      const row = await store.save(editingId, data);
      const i = leads.findIndex((r) => r.id === row.id);
      if (i >= 0) leads[i] = row; else leads.push(row);
      $("#dlg").close();
      render();
      toast("נשמר");
    } catch (e) { handleErr(e); }
    finally { $("#saveBtn").disabled = false; }
  }

  async function setStatus(id, status) {
    const row = leads.find((r) => r.id === id);
    const data = { ...row.data, status };
    try {
      const saved = await store.save(id, data);
      Object.assign(row, saved);
      render();
      toast(`הסטטוס עודכן: ${STATUS[status].label}`);
    } catch (e) { handleErr(e); render(); }
  }

  // ---------- ייצוא ----------
  function exportCsv() {
    const head = ["שם פרטי", "שם משפחה", "טלפון נייד", "תאריך", "תחום העסק", "סטטוס", "הערות"];
    const lines = visible().map((r) => {
      const d = r.data;
      return [d.first_name, d.last_name, d.phone, fmtDate(d.date), d.domain, STATUS[d.status]?.label || d.status, d.notes];
    });
    const csv = [head, ...lines].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `לידים-${today()}.csv`;
    a.click();
  }

  // ---------- שגיאות וקוד גישה ----------
  function handleErr(e) {
    if (e.code === "28000") { localStorage.removeItem(CODE_KEY); askCode(); return; }
    showErr("משהו השתבש: " + e.message);
  }
  function askCode() { $("#codeDlg").showModal(); }

  async function load() {
    try {
      leads = (await store.list()) || [];
      showErr("");
      render();
      if (remote) await migrateLocal();
    } catch (e) { handleErr(e); }
  }

  // לידים שהוזנו בדפדפן לפני החיבור ל־Supabase עוברים למסד פעם אחת
  async function migrateLocal() {
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    if (!local.length) return;
    if (!confirm(`יש בדפדפן הזה ${local.length} לידים מלפני החיבור למסד. להעביר אותם למסד?`)) return;
    for (const r of local) {
      const row = await store.save(r.id, r.data);
      if (!leads.some((x) => x.id === row.id)) leads.push(row);
    }
    localStorage.removeItem(LOCAL_KEY);
    render();
    toast(`${local.length} לידים הועברו למסד`);
  }

  // ---------- אתחול ----------
  function init() {
    form.elements.domain.innerHTML = `<option value="">בחירה…</option>` + CFG.domains.map((x) => `<option>${esc(x)}</option>`).join("");
    form.elements.status.innerHTML = statusOptions();
    $("#fDomain").innerHTML += CFG.domains.map((x) => `<option>${esc(x)}</option>`).join("");

    $("#addBtn").onclick = () => openForm();
    $("#exportBtn").onclick = exportCsv;
    $("#cancelBtn").onclick = () => $("#dlg").close();
    form.onsubmit = (e) => { e.preventDefault(); saveForm(); };
    $("#delBtn").onclick = async () => {
      const r = leads.find((x) => x.id === editingId);
      if (!confirm(`למחוק את ${fullName(r.data) || "הליד"}?`)) return;
      try {
        await store.remove(editingId);
        leads = leads.filter((x) => x.id !== editingId);
        $("#dlg").close(); render(); toast("נמחק");
      } catch (e) { handleErr(e); }
    };
    ["#q", "#fDomain", "#fSort"].forEach((s) => $(s).addEventListener("input", renderRows));
    $("#pipeline").onclick = (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      filterStatus = b.dataset.f; renderPipeline(); renderRows();
    };
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-edit]"); if (b) openForm(b.dataset.edit);
    });
    document.addEventListener("change", (e) => {
      if (e.target.matches(".st-select")) setStatus(e.target.dataset.id, e.target.value);
    });
    $("#codeForm").onsubmit = (e) => {
      e.preventDefault();
      code = e.target.elements.code.value.trim();
      localStorage.setItem(CODE_KEY, code);
      $("#codeDlg").close();
      load();
    };

    if (!remote) {
      $("#localBanner").hidden = false;
      load();
      return;
    }
    const fromUrl = new URLSearchParams(location.search).get("k");
    if (fromUrl) localStorage.setItem(CODE_KEY, fromUrl);
    code = fromUrl || localStorage.getItem(CODE_KEY) || "";
    if (!code) askCode(); else load();
    setInterval(() => { if (code && !document.querySelector("dialog[open]")) load(); }, 60000); // רענון כל דקה
  }

  init();
})();
