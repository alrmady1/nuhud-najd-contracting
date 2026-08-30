/* =========================================================
   المشاريع
   ========================================================= */

let PROJECTS_VIEW = "list"; // list | builder | detail
let DRAFT_PROJECT = null;
let PROJECT_VIEW_ID = null;
let PROJECT_CLIENT_SEARCH = "";
let PROJECT_SHOW_ADD_CLIENT = false;

const PROJECT_STATUSES = ["قيد التنفيذ", "مكتمل", "متوقف"];

function newDraftProject() {
  return {
    id: null,
    name: "",
    clientId: "", client: "",
    location: "",
    projectType: "construction",
    startDate: "", endDate: "",
    status: "قيد التنفيذ",
    completion: 0,
    contractId: "",
    approvedQuoteId: "",
    teamUserIds: [],
    planFiles: [],
    notes: "",
  };
}

function projectTypeLabel(key) {
  const label = (CONTRACT_TYPES.find(t => t.key === key) || {}).label || key || "-";
  return label.replace("عقد ", "");
}

function renderProjects(el) {
  if (PROJECTS_VIEW === "builder") return renderProjectBuilder(el);
  if (PROJECTS_VIEW === "detail") return renderProjectDetail(el);
  renderProjectsList(el);
}

function renderProjectsList(el) {
  const projects = dbGet("projects", []).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>المشاريع</h2><p>إدارة مشاريع الشركة وربطها بالعملاء والعقود وجداول الكميات المعتمدة</p></div>
      <button class="btn primary" id="newProjectBtn"><span style="font-size:15px">➕</span> إضافة مشروع</button>
    </div>
    ${projects.length ? projects.map(p => `
      <div class="contract-row" data-openproj="${p.id}">
        <div class="contract-row-icon">🏗️</div>
        <div class="contract-row-info">
          <div class="contract-row-title">${p.name}</div>
          <div class="contract-row-sub">${p.client || "بدون عميل"} · ${projectTypeLabel(p.projectType)} · ${p.location || "-"} · ${statusBadge2(p.status)}</div>
        </div>
        <div style="min-width:110px">
          <div class="progress-track"><div class="progress-fill ${p.completion >= 80 ? "success" : p.completion < 40 ? "warning" : ""}" style="width:${p.completion || 0}%"></div></div>
          <div class="text-muted" style="font-size:11px;margin-top:3px">${p.completion || 0}% مكتمل</div>
        </div>
        <div class="contract-row-actions no-print">
          <button class="btn sm" data-openproj="${p.id}">فتح</button>
          <button class="btn sm danger" data-delproj="${p.id}">حذف</button>
        </div>
      </div>`).join("") : `<div class="card empty-state"><div class="ic">🏗️</div>لا توجد مشاريع بعد</div>`}
  `;

  document.getElementById("newProjectBtn").onclick = () => {
    DRAFT_PROJECT = newDraftProject();
    PROJECT_CLIENT_SEARCH = ""; PROJECT_SHOW_ADD_CLIENT = false;
    PROJECTS_VIEW = "builder"; router();
  };
  el.querySelectorAll("[data-openproj]").forEach(x => x.onclick = () => { PROJECT_VIEW_ID = x.dataset.openproj; PROJECTS_VIEW = "detail"; router(); });
  el.querySelectorAll("[data-delproj]").forEach(x => x.onclick = (e) => {
    e.stopPropagation();
    if (!confirm("حذف هذا المشروع؟")) return;
    dbSet("projects", dbGet("projects", []).filter(p => p.id !== x.dataset.delproj));
    router();
  });
}

function statusBadge2(status) {
  const map = { "قيد التنفيذ": "orange", "مكتمل": "green", "متوقف": "red" };
  return `<span class="badge ${map[status] || "gray"}">${status || "قيد التنفيذ"}</span>`;
}

/* ---------- منتقي العميل (نسخة خاصة بالمشاريع) ---------- */
function projectClientPickerHtml(d) {
  if (d.clientId) {
    return `
      <div class="flex between" style="align-items:center;background:#f8f9fb;border:1px solid var(--border);border-radius:8px;padding:12px 14px">
        <div><strong>${d.client}</strong></div>
        <button class="btn sm" id="pc_change" type="button">تغيير العميل</button>
      </div>`;
  }
  return `
    <div class="field" style="margin-bottom:10px">
      <label>البحث عن عميل (بالاسم أو رقم الجوال)</label>
      <input id="pc_search" placeholder="اكتب للبحث..." autocomplete="off" value="${PROJECT_CLIENT_SEARCH}">
      <div id="pc_results" class="client-suggest-box"></div>
    </div>
    <button class="btn sm" id="pc_toggleAdd" type="button">+ إضافة عميل جديد</button>
    <div id="pc_addInline">${PROJECT_SHOW_ADD_CLIENT ? `
      <div class="card" style="margin-top:12px;background:#fafbfc">
        <div class="grid cols-2">
          <div class="field" style="grid-column:span 2"><label>اسم العميل</label><input id="pc_name"></div>
          <div class="field"><label>رقم الجوال</label><input id="pc_phone"></div>
          <div class="field"><label>البريد الإلكتروني</label><input id="pc_email"></div>
        </div>
        <div class="flex gap"><button class="btn sm primary" id="pc_add" type="button">إضافة العميل واختياره</button><button class="btn sm" id="pc_cancel" type="button">إلغاء</button></div>
      </div>` : ""}</div>
  `;
}

function renderProjectClientResults(container, query) {
  if (!container) return;
  const q = (query || "").trim().toLowerCase();
  if (!q) { container.innerHTML = ""; return; }
  const clients = dbGet("clients", []).filter(c => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q));
  container.innerHTML = clients.length ? clients.slice(0, 8).map(c => `
    <div class="client-suggest" data-pick="${c.id}"><strong>${c.name}</strong> <span class="text-muted" style="font-size:11.5px">${c.phone || ""}</span></div>
  `).join("") : `<div class="text-muted" style="font-size:12px;padding:8px 4px">لا يوجد عملاء مطابقون</div>`;
  container.querySelectorAll("[data-pick]").forEach(row => row.onclick = () => {
    const client = dbGet("clients", []).find(x => x.id === row.dataset.pick);
    DRAFT_PROJECT.clientId = client.id; DRAFT_PROJECT.client = client.name;
    PROJECT_CLIENT_SEARCH = "";
    renderProjectBuilder(document.getElementById("content"));
  });
}

function bindProjectClientPicker(el, d) {
  const changeBtn = document.getElementById("pc_change");
  if (changeBtn) { changeBtn.onclick = () => { d.clientId = ""; d.client = ""; renderProjectBuilder(el); }; return; }

  const search = document.getElementById("pc_search");
  if (search) {
    renderProjectClientResults(document.getElementById("pc_results"), PROJECT_CLIENT_SEARCH);
    search.oninput = () => { PROJECT_CLIENT_SEARCH = search.value; renderProjectClientResults(document.getElementById("pc_results"), PROJECT_CLIENT_SEARCH); };
  }
  const toggleBtn = document.getElementById("pc_toggleAdd");
  if (toggleBtn) toggleBtn.onclick = () => { PROJECT_SHOW_ADD_CLIENT = !PROJECT_SHOW_ADD_CLIENT; renderProjectBuilder(el); };

  if (PROJECT_SHOW_ADD_CLIENT) {
    document.getElementById("pc_add").onclick = () => {
      const name = document.getElementById("pc_name").value.trim();
      if (!name) { toast("يرجى إدخال اسم العميل"); return; }
      const clients = dbGet("clients", []);
      const newClient = { id: uid("cl"), name, phone: document.getElementById("pc_phone").value.trim(), email: document.getElementById("pc_email").value.trim(), taxNumber: "", address: "", notes: "", createdAt: new Date().toISOString() };
      clients.push(newClient);
      dbSet("clients", clients);
      d.clientId = newClient.id; d.client = newClient.name;
      PROJECT_SHOW_ADD_CLIENT = false; PROJECT_CLIENT_SEARCH = "";
      toast("تمت إضافة العميل");
      renderProjectBuilder(el);
    };
    document.getElementById("pc_cancel").onclick = () => { PROJECT_SHOW_ADD_CLIENT = false; renderProjectBuilder(el); };
  }
}

/* ---------- منشئ/محرر المشروع ---------- */
function renderProjectBuilder(el) {
  const d = DRAFT_PROJECT;
  const contracts = dbGet("contracts", []);
  const quotes = dbGet("quotes", []);
  const users = dbGet("users", []);

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>${d.id ? "تعديل مشروع" : "إضافة مشروع جديد"}</h2><p>اربط المشروع بالعميل والعقد وجدول الكميات المعتمد وأضف كافة التفاصيل</p></div>
      <button class="btn" id="backList">إلغاء والرجوع</button>
    </div>

    <div class="card">
      <h3>بيانات أساسية</h3>
      <div class="grid cols-2">
        <div class="field"><label>اسم المشروع</label><input id="p_name" value="${d.name}"></div>
        <div class="field"><label>موقع المشروع</label><input id="p_location" value="${d.location}"></div>
      </div>
      <div class="field"><label>نوع المشروع</label>
        <div class="pill-group">${CONTRACT_TYPES.map(t => `<div class="pill ${d.projectType === t.key ? "active" : ""}" data-ptype="${t.key}">${projectTypeLabel(t.key)}</div>`).join("")}</div>
      </div>
      <div class="grid cols-2">
        <div class="field"><label>تاريخ البدء</label><input type="date" id="p_start" value="${d.startDate}"></div>
        <div class="field"><label>تاريخ الانتهاء المتوقع</label><input type="date" id="p_end" value="${d.endDate}"></div>
        <div class="field"><label>الحالة</label>
          <select id="p_status">${PROJECT_STATUSES.map(s => `<option ${d.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div>
        <div class="field"><label>نسبة الإنجاز (%)</label><input type="number" min="0" max="100" id="p_completion" value="${d.completion}"></div>
      </div>
    </div>

    <div class="card">
      <h3>العميل</h3>
      ${projectClientPickerHtml(d)}
    </div>

    <div class="card">
      <h3>الربط بالعقد وجدول الكميات المعتمد</h3>
      <div class="grid cols-2">
        <div class="field"><label>العقد المرتبط</label>
          <select id="p_contract">
            <option value="">— بدون —</option>
            ${contracts.map(c => `<option value="${c.id}" ${d.contractId === c.id ? "selected" : ""}>${c.clientName} — ${projectTypeLabel(c.type)} — ${fmtMoney(c.totalAmount)}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>جدول الكميات المعتمد (عرض السعر)</label>
          <select id="p_quote">
            <option value="">— بدون —</option>
            ${quotes.map(q => `<option value="${q.id}" ${d.approvedQuoteId === q.id ? "selected" : ""}>${q.number} — ${q.client.name} — ${fmtMoney(quoteTotal(q))}</option>`).join("")}
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>الفنيون والمهندسون المتابعون للمشروع</h3>
      <div class="pill-group">
        ${users.map(u => `<label class="chk" style="border:1px solid var(--border);border-radius:20px;padding:7px 14px"><input type="checkbox" data-team="${u.id}" ${d.teamUserIds.includes(u.id) ? "checked" : ""}> ${u.name} <span class="text-muted" style="font-size:11px">(${u.role})</span></label>`).join("")}
      </div>
    </div>

    <div class="card">
      <h3>المخططات</h3>
      <input type="file" id="p_plans" multiple accept=".dwg,.dxf,.pdf,application/pdf">
      <div id="p_plansList" class="flex wrap" style="margin-top:8px">${d.planFiles.map(f => `<span class="file-chip">📎 ${f.name}</span>`).join("")}</div>
    </div>

    <div class="card">
      <h3>ملاحظات وتفاصيل إضافية</h3>
      <textarea id="p_notes" placeholder="أي تفاصيل أخرى متعلقة بالمشروع...">${d.notes}</textarea>
    </div>

    <div class="flex gap"><button class="btn primary" id="saveProjectBtn">💾 حفظ المشروع</button><button class="btn" id="cancelProjectBtn">إلغاء</button></div>
  `;

  bindProjectClientPicker(el, d);

  document.getElementById("backList").onclick = () => { PROJECTS_VIEW = "list"; router(); };
  document.getElementById("cancelProjectBtn").onclick = () => { PROJECTS_VIEW = "list"; router(); };

  el.querySelectorAll("[data-ptype]").forEach(p => p.onclick = () => { d.projectType = p.dataset.ptype; renderProjectBuilder(el); });

  document.getElementById("p_name").oninput = (e) => d.name = e.target.value;
  document.getElementById("p_location").oninput = (e) => d.location = e.target.value;
  document.getElementById("p_start").oninput = (e) => d.startDate = e.target.value;
  document.getElementById("p_end").oninput = (e) => d.endDate = e.target.value;
  document.getElementById("p_status").onchange = (e) => d.status = e.target.value;
  document.getElementById("p_completion").oninput = (e) => d.completion = Math.max(0, Math.min(100, Number(e.target.value) || 0));
  document.getElementById("p_contract").onchange = (e) => d.contractId = e.target.value;
  document.getElementById("p_quote").onchange = (e) => d.approvedQuoteId = e.target.value;
  document.getElementById("p_notes").oninput = (e) => d.notes = e.target.value;

  el.querySelectorAll("[data-team]").forEach(chk => chk.onchange = () => {
    const id = chk.dataset.team;
    if (chk.checked) { if (!d.teamUserIds.includes(id)) d.teamUserIds.push(id); }
    else { d.teamUserIds = d.teamUserIds.filter(x => x !== id); }
  });

  document.getElementById("p_plans").onchange = (e) => {
    for (const f of e.target.files) d.planFiles.push({ name: f.name, type: f.type, size: f.size });
    document.getElementById("p_plansList").innerHTML = d.planFiles.map(f => `<span class="file-chip">📎 ${f.name}</span>`).join("");
  };

  document.getElementById("saveProjectBtn").onclick = () => {
    if (!d.name.trim()) { toast("يرجى إدخال اسم المشروع"); return; }
    if (!d.clientId) { toast("يرجى اختيار العميل"); return; }

    const projects = dbGet("projects", []);
    if (d.id) {
      const idx = projects.findIndex(p => p.id === d.id);
      if (idx > -1) projects[idx] = d;
    } else {
      d.id = uid("p");
      d.createdAt = new Date().toISOString();
      projects.push(d);
    }
    dbSet("projects", projects);
    toast("تم حفظ المشروع بنجاح");
    PROJECT_VIEW_ID = d.id;
    PROJECTS_VIEW = "detail";
    router();
  };
}

/* ---------- تفاصيل المشروع ---------- */
function renderProjectDetail(el) {
  const projects = dbGet("projects", []);
  const p = projects.find(x => x.id === PROJECT_VIEW_ID);
  if (!p) { PROJECTS_VIEW = "list"; router(); return; }

  const client = p.clientId ? dbGet("clients", []).find(c => c.id === p.clientId) : null;
  const contract = p.contractId ? dbGet("contracts", []).find(c => c.id === p.contractId) : null;
  const quote = p.approvedQuoteId ? dbGet("quotes", []).find(q => q.id === p.approvedQuoteId) : null;
  const team = dbGet("users", []).filter(u => (p.teamUserIds || []).includes(u.id));

  const accEntries = dbGet("accProjects", []).filter(e => e.projectId === p.id);
  const revenue = accEntries.filter(e => e.type === "إيراد مشروع" || e.type === "فاتورة ضريبية").reduce((s, e) => s + Number(e.amount || 0), 0);
  const expenses = accEntries.filter(e => ["دفعة مشتريات", "مصروف مواد", "مصروف عمال", "مصروف نثرية"].includes(e.type)).reduce((s, e) => s + Number(e.amount || 0), 0);

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>${p.name}</h2><p>${projectTypeLabel(p.projectType)} · ${statusBadge2(p.status)}</p></div>
      <div class="flex gap">
        <button class="btn" id="backList2">رجوع لقائمة المشاريع</button>
        <button class="btn primary" id="editProjectBtn">✏️ تعديل المشروع</button>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3>بيانات العميل</h3>
        ${client ? `
          <div class="kv-row"><span class="k">الاسم</span><span class="v">${client.name}</span></div>
          <div class="kv-row"><span class="k">الجوال</span><span class="v">${client.phone || "-"}</span></div>
          <div class="kv-row"><span class="k">البريد</span><span class="v">${client.email || "-"}</span></div>
          <div class="kv-row"><span class="k">الرقم الضريبي</span><span class="v">${client.taxNumber || "-"}</span></div>
        ` : `<p class="text-muted" style="font-size:13px">لا يوجد عميل مرتبط</p>`}
      </div>

      <div class="card">
        <h3>تفاصيل المشروع</h3>
        <div class="kv-row"><span class="k">الموقع</span><span class="v">${p.location || "-"}</span></div>
        <div class="kv-row"><span class="k">تاريخ البدء</span><span class="v">${p.startDate ? fmtDate(p.startDate) : "-"}</span></div>
        <div class="kv-row"><span class="k">تاريخ الانتهاء المتوقع</span><span class="v">${p.endDate ? fmtDate(p.endDate) : "-"}</span></div>
        <div style="margin-top:10px">
          <div class="flex between" style="margin-bottom:4px"><span class="text-muted" style="font-size:12.5px">نسبة الإنجاز</span><strong style="font-size:12.5px">${p.completion || 0}%</strong></div>
          <div class="progress-track"><div class="progress-fill ${p.completion >= 80 ? "success" : p.completion < 40 ? "warning" : ""}" style="width:${p.completion || 0}%"></div></div>
        </div>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3>العقد المرتبط</h3>
        ${contract ? `
          <div class="kv-row"><span class="k">النوع</span><span class="v">${projectTypeLabel(contract.type)}</span></div>
          <div class="kv-row"><span class="k">القيمة الإجمالية</span><span class="v">${fmtMoney(contract.totalAmount)}</span></div>
          <button class="btn sm" id="openContractBtn" style="margin-top:10px">فتح العقد</button>
        ` : `<p class="text-muted" style="font-size:13px">لا يوجد عقد مرتبط</p>`}
      </div>
      <div class="card">
        <h3>جدول الكميات المعتمد</h3>
        ${quote ? `
          <div class="kv-row"><span class="k">رقم العرض</span><span class="v">${quote.number}</span></div>
          <div class="kv-row"><span class="k">الإجمالي</span><span class="v">${fmtMoney(quoteTotal(quote))}</span></div>
          <button class="btn sm" id="openQuoteBtn" style="margin-top:10px">فتح عرض السعر</button>
        ` : `<p class="text-muted" style="font-size:13px">لا يوجد جدول كميات معتمد مرتبط</p>`}
      </div>
    </div>

    <div class="card">
      <h3>الفنيون والمهندسون المتابعون</h3>
      ${team.length ? `<div class="pill-group">${team.map(u => `<span class="badge blue">${u.name} — ${u.role}</span>`).join("")}</div>` : `<p class="text-muted" style="font-size:13px">لم يتم تعيين فريق متابعة بعد</p>`}
    </div>

    <div class="card">
      <h3>المخططات</h3>
      ${p.planFiles && p.planFiles.length ? `<div class="flex wrap">${p.planFiles.map(f => `<span class="file-chip">📎 ${f.name}</span>`).join("")}</div>` : `<p class="text-muted" style="font-size:13px">لا توجد مخططات مرفوعة بعد</p>`}
    </div>

    <div class="card">
      <div class="flex between" style="align-items:center;margin-bottom:10px">
        <h3 class="mt-0">محاسبة المشروع</h3>
        <button class="btn sm primary" id="openProjectAcc">فتح محاسبة المشروع (إضافة فواتير ومصاريف)</button>
      </div>
      <div class="grid cols-3">
        <div class="stat-card"><div class="label">إجمالي الإيرادات</div><div class="value success">${fmtMoney(revenue)}</div></div>
        <div class="stat-card"><div class="label">إجمالي المصاريف</div><div class="value danger">${fmtMoney(expenses)}</div></div>
        <div class="stat-card"><div class="label">صافي الربح</div><div class="value ${revenue - expenses >= 0 ? "success" : "danger"}">${fmtMoney(revenue - expenses)}</div></div>
      </div>
    </div>

    ${p.notes ? `<div class="card"><h3>ملاحظات</h3><p style="font-size:13px;white-space:pre-wrap">${p.notes}</p></div>` : ""}
  `;

  document.getElementById("backList2").onclick = () => { PROJECTS_VIEW = "list"; router(); };
  document.getElementById("editProjectBtn").onclick = () => {
    DRAFT_PROJECT = Object.assign(newDraftProject(), JSON.parse(JSON.stringify(p)));
    PROJECT_CLIENT_SEARCH = ""; PROJECT_SHOW_ADD_CLIENT = false;
    PROJECTS_VIEW = "builder"; router();
  };
  const openContractBtn = document.getElementById("openContractBtn");
  if (openContractBtn) openContractBtn.onclick = () => { CONTRACT_VIEW_ID = contract.id; CONTRACTS_VIEW = "view"; location.hash = "#/contracts"; };
  const openQuoteBtn = document.getElementById("openQuoteBtn");
  if (openQuoteBtn) openQuoteBtn.onclick = () => { VIEW_QUOTE_ID = quote.id; QUOTES_VIEW = "view"; location.hash = "#/quotes"; };
  document.getElementById("openProjectAcc").onclick = () => { ACC_SELECTED_PROJECT = p.id; location.hash = "#/acc_projects"; };
}

/* ترحيل بسيط: يضيف الحقول الجديدة لمشاريع مزروعة مسبقاً بدون كسر أي بيانات موجودة */
function migrateProjectsSchema() {
  const projects = dbGet("projects", []);
  const clients = dbGet("clients", []);
  let changed = false;
  projects.forEach(p => {
    if (p.clientId === undefined) {
      const match = clients.find(c => sameClientName(c.name, p.client));
      p.clientId = match ? match.id : "";
      changed = true;
    }
    if (p.projectType === undefined) { p.projectType = "construction"; changed = true; }
    if (p.status === undefined) { p.status = "قيد التنفيذ"; changed = true; }
    if (p.startDate === undefined) { p.startDate = ""; changed = true; }
    if (p.endDate === undefined) { p.endDate = ""; changed = true; }
    if (p.contractId === undefined) { p.contractId = ""; changed = true; }
    if (p.approvedQuoteId === undefined) { p.approvedQuoteId = ""; changed = true; }
    if (p.teamUserIds === undefined) { p.teamUserIds = []; changed = true; }
    if (p.planFiles === undefined) { p.planFiles = []; changed = true; }
    if (p.notes === undefined) { p.notes = ""; changed = true; }
    if (p.createdAt === undefined) { p.createdAt = new Date().toISOString(); changed = true; }
  });
  if (changed) dbSet("projects", projects);
}
