/* =========================================================
   المحاسبة: محاسبة المشاريع / المحاسبة العامة / ضريبة القيمة المضافة
   ========================================================= */

const VAT_RATE = 0.15;
let ACC_SELECTED_PROJECT = null;

const ACC_TYPES = ["إيراد مشروع", "دفعة مشتريات", "مصروف مواد", "مصروف عمال", "مصروف نثرية"];
const ACC_TYPE_BADGE = {
  "إيراد مشروع": "green", "فاتورة ضريبية": "green",
  "دفعة مشتريات": "blue", "مصروف مواد": "orange", "مصروف عمال": "orange", "مصروف نثرية": "gray",
};
const GENERAL_CATS = ["رواتب", "إقامات", "إيجار المكتب", "كهرباء", "مركبات"];

/* ================= محاسبة المشاريع ================= */
function renderAccProjects(el) {
  const projects = dbGet("projects", []);
  if (!ACC_SELECTED_PROJECT && projects.length) ACC_SELECTED_PROJECT = projects[0].id;
  const project = projects.find(p => p.id === ACC_SELECTED_PROJECT);
  const entries = dbGet("accProjects", []).filter(e => e.projectId === ACC_SELECTED_PROJECT).sort((a, b) => (b.date > a.date ? 1 : -1));

  const revenue = entries.filter(e => e.type === "إيراد مشروع" || e.type === "فاتورة ضريبية").reduce((s, e) => s + Number(e.amount || 0), 0);
  const expenses = entries.filter(e => ["دفعة مشتريات", "مصروف مواد", "مصروف عمال", "مصروف نثرية"].includes(e.type)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const net = revenue - expenses;

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>محاسبة المشاريع</h2><p>الإيرادات والمصاريف الخاصة بكل مشروع على حدة</p></div>
      <select id="accProjectSelect" style="padding:9px 14px;border:1px solid var(--border);border-radius:8px;font-weight:700">
        ${projects.map(p => `<option value="${p.id}" ${p.id === ACC_SELECTED_PROJECT ? "selected" : ""}>${p.name}</option>`).join("")}
      </select>
    </div>

    <div class="grid cols-3" style="margin-bottom:18px">
      <div class="stat-card"><div class="label">إجمالي الإيرادات</div><div class="value success">${fmtMoney(revenue)}</div></div>
      <div class="stat-card"><div class="label">إجمالي المصاريف</div><div class="value danger">${fmtMoney(expenses)}</div></div>
      <div class="stat-card"><div class="label">صافي الربح</div><div class="value ${net >= 0 ? "success" : "danger"}">${fmtMoney(net)}</div></div>
    </div>

    <div class="card">
      <div class="flex between wrap" style="margin-bottom:10px">
        <h3 class="mt-0">حركة الحساب — ${project ? project.name : ""}</h3>
        <div class="flex gap">
          <button class="btn sm" id="addEntryBtn">+ إضافة حركة</button>
          <button class="btn sm primary" id="addInvoiceBtn">+ إصدار فاتورة ضريبية</button>
        </div>
      </div>
      ${entries.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>النوع</th><th>المبلغ</th><th>ضريبة القيمة المضافة</th><th>التاريخ</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>
            ${entries.map(e => `
              <tr>
                <td><span class="badge ${ACC_TYPE_BADGE[e.type] || "gray"}">${e.type}</span></td>
                <td><strong>${fmtMoney(e.amount)}</strong></td>
                <td>${e.vatApplicable ? `<span class="badge blue">خاضع (${fmtMoney(e.vatAmount || Number(e.amount) * VAT_RATE)})</span>` : `<span class="badge gray">غير خاضع</span>`}</td>
                <td>${fmtDate(e.date)}</td>
                <td class="text-muted">${e.note || (e.invoiceNumber ? "فاتورة رقم " + e.invoiceNumber : "-")}</td>
                <td>
                  ${e.type === "فاتورة ضريبية" ? `<button class="btn sm" data-printinv="${e.id}">طباعة</button>` : ""}
                  <button class="btn sm danger" data-delentry="${e.id}">حذف</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="ic">💵</div>لا توجد حركات مالية لهذا المشروع بعد</div>`}
    </div>
  `;

  document.getElementById("accProjectSelect").onchange = (e) => { ACC_SELECTED_PROJECT = e.target.value; renderAccProjects(el); };
  document.getElementById("addEntryBtn").onclick = () => openAccEntryModal(el);
  document.getElementById("addInvoiceBtn").onclick = () => openInvoiceModal(el);
  el.querySelectorAll("[data-delentry]").forEach(b => b.onclick = () => {
    if (!confirm("حذف هذه الحركة؟")) return;
    dbSet("accProjects", dbGet("accProjects", []).filter(x => x.id !== b.dataset.delentry));
    renderAccProjects(el);
  });
  el.querySelectorAll("[data-printinv]").forEach(b => b.onclick = () => printInvoice(b.dataset.printinv));
}

function openAccEntryModal(el) {
  const html = `
    <div class="modal-head"><h3>إضافة حركة مالية للمشروع</h3><button class="modal-close" id="mClose">×</button></div>
    <div class="field"><label>نوع الحركة</label>
      <select id="e_type">${ACC_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}</select>
    </div>
    <div class="grid cols-2">
      <div class="field"><label>المبلغ (ر.س)</label><input type="number" min="0" step="0.01" id="e_amount"></div>
      <div class="field"><label>التاريخ</label><input type="date" id="e_date" value="${todayISO()}"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="e_vat" style="width:auto;display:inline-block"> خاضع لضريبة القيمة المضافة (15%)</label></div>
    <div class="field"><label>ملاحظات</label><textarea id="e_note"></textarea></div>
    <div class="flex gap"><button class="btn primary" id="e_save">حفظ</button><button class="btn" id="e_cancel">إلغاء</button></div>
  `;
  const ov = openModalShell(html);
  ov.querySelector("#mClose").onclick = closeModal;
  ov.querySelector("#e_cancel").onclick = closeModal;
  ov.querySelector("#e_save").onclick = () => {
    const amount = Number(ov.querySelector("#e_amount").value) || 0;
    if (amount <= 0) { toast("يرجى إدخال مبلغ صحيح"); return; }
    const vatApplicable = ov.querySelector("#e_vat").checked;
    const entries = dbGet("accProjects", []);
    entries.push({
      id: uid("ae"), projectId: ACC_SELECTED_PROJECT, type: ov.querySelector("#e_type").value,
      amount, vatApplicable, vatAmount: vatApplicable ? amount * VAT_RATE : 0,
      date: ov.querySelector("#e_date").value || todayISO(), note: ov.querySelector("#e_note").value.trim(),
    });
    dbSet("accProjects", entries);
    toast("تم إضافة الحركة المالية");
    closeModal();
    renderAccProjects(el);
  };
}

function openInvoiceModal(el) {
  const projects = dbGet("projects", []);
  const project = projects.find(p => p.id === ACC_SELECTED_PROJECT);
  const html = `
    <div class="modal-head"><h3>إصدار فاتورة ضريبية</h3><button class="modal-close" id="mClose">×</button></div>
    <div class="field"><label>اسم العميل</label><input id="i_client" value="${project ? project.client : ""}"></div>
    <div class="field"><label>الرقم الضريبي للعميل (اختياري)</label><input id="i_tax"></div>
    <div class="field"><label>وصف الفاتورة</label><input id="i_desc" placeholder="مثال: دفعة أعمال تشطيبات"></div>
    <div class="grid cols-2">
      <div class="field"><label>المبلغ قبل الضريبة (ر.س)</label><input type="number" min="0" step="0.01" id="i_amount"></div>
      <div class="field"><label>التاريخ</label><input type="date" id="i_date" value="${todayISO()}"></div>
    </div>
    <div class="flex gap"><button class="btn primary" id="i_save">إصدار الفاتورة</button><button class="btn" id="i_cancel">إلغاء</button></div>
  `;
  const ov = openModalShell(html);
  ov.querySelector("#mClose").onclick = closeModal;
  ov.querySelector("#i_cancel").onclick = closeModal;
  ov.querySelector("#i_save").onclick = () => {
    const amount = Number(ov.querySelector("#i_amount").value) || 0;
    if (amount <= 0) { toast("يرجى إدخال مبلغ صحيح"); return; }
    const vat = amount * VAT_RATE;
    const entries = dbGet("accProjects", []);
    const invoiceNumber = "INV-" + (2000 + entries.filter(x => x.type === "فاتورة ضريبية").length + 1);
    entries.push({
      id: uid("inv"), projectId: ACC_SELECTED_PROJECT, projectName: project ? project.name : "",
      type: "فاتورة ضريبية", client: ov.querySelector("#i_client").value.trim(),
      taxNumber: ov.querySelector("#i_tax").value.trim(), description: ov.querySelector("#i_desc").value.trim(),
      amountBeforeTax: amount, vatAmount: vat, amount: amount + vat, vatApplicable: true,
      invoiceNumber, date: ov.querySelector("#i_date").value || todayISO(),
    });
    dbSet("accProjects", entries);
    toast("تم إصدار الفاتورة الضريبية");
    closeModal();
    renderAccProjects(el);
    printInvoice(entries[entries.length - 1].id);
  };
}

function printInvoice(id) {
  const inv = dbGet("accProjects", []).find(x => x.id === id);
  if (!inv) return;
  const html = `
    <div class="modal-head no-print"><h3>فاتورة ضريبية</h3><button class="modal-close" id="mClose">×</button></div>
    <div style="text-align:center;margin-bottom:18px">
      <h2 style="margin:0">نهوض نجد للمقاولات</h2>
      <p class="text-muted">فاتورة ضريبية رقم ${inv.invoiceNumber}</p>
    </div>
    <div class="kv-row"><span class="k">المشروع</span><span class="v">${inv.projectName}</span></div>
    <div class="kv-row"><span class="k">العميل</span><span class="v">${inv.client}</span></div>
    <div class="kv-row"><span class="k">الرقم الضريبي للعميل</span><span class="v">${inv.taxNumber || "-"}</span></div>
    <div class="kv-row"><span class="k">التاريخ</span><span class="v">${fmtDate(inv.date)}</span></div>
    <div class="kv-row"><span class="k">الوصف</span><span class="v">${inv.description || "-"}</span></div>
    <hr style="margin:14px 0;border:none;border-top:1px solid var(--border)">
    <div class="kv-row"><span class="k">المبلغ قبل الضريبة</span><span class="v">${fmtMoney(inv.amountBeforeTax)}</span></div>
    <div class="kv-row"><span class="k">ضريبة القيمة المضافة (15%)</span><span class="v">${fmtMoney(inv.vatAmount)}</span></div>
    <div class="grand-total-box" style="margin-top:10px"><div>الإجمالي المستحق</div><div class="num">${fmtMoney(inv.amount)}</div></div>
    <div class="flex gap no-print" style="margin-top:16px"><button class="btn primary" id="printBtn">🖨️ طباعة</button><button class="btn" id="i_close">إغلاق</button></div>
  `;
  const ov = openModalShell(html);
  ov.querySelector("#mClose").onclick = closeModal;
  ov.querySelector("#i_close").onclick = closeModal;
  ov.querySelector("#printBtn").onclick = () => window.print();
}

/* ================= المحاسبة العامة ================= */
function renderAccGeneral(el) {
  const list = dbGet("accGeneral", []).slice().sort((a, b) => (b.date > a.date ? 1 : -1));
  const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCat = {};
  GENERAL_CATS.forEach(c => byCat[c] = 0);
  list.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0));

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>المحاسبة العامة</h2><p>المصاريف الإدارية العامة للشركة</p></div>
      <button class="btn primary" id="addGeneralBtn">+ إضافة مصروف</button>
    </div>

    <div class="grid cols-4" style="margin-bottom:18px">
      ${GENERAL_CATS.map(c => `<div class="stat-card"><div class="label">${c}</div><div class="value">${fmtMoney(byCat[c])}</div></div>`).join("")}
    </div>
    <div class="stat-card" style="margin-bottom:18px;max-width:320px"><div class="label">إجمالي المصاريف الإدارية</div><div class="value danger">${fmtMoney(total)}</div></div>

    <div class="card">
      <h3>سجل المصاريف الإدارية</h3>
      ${list.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>التصنيف</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>
            ${list.map(e => `
              <tr>
                <td><span class="badge gray">${e.category}</span></td>
                <td><strong>${fmtMoney(e.amount)}</strong></td>
                <td>${fmtDate(e.date)}</td>
                <td class="text-muted">${e.note || "-"}</td>
                <td><button class="btn sm danger" data-delgen="${e.id}">حذف</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="ic">🏢</div>لا توجد مصاريف إدارية مسجلة بعد</div>`}
    </div>
  `;

  document.getElementById("addGeneralBtn").onclick = () => openGeneralExpenseModal(el);
  el.querySelectorAll("[data-delgen]").forEach(b => b.onclick = () => {
    if (!confirm("حذف هذا المصروف؟")) return;
    dbSet("accGeneral", dbGet("accGeneral", []).filter(x => x.id !== b.dataset.delgen));
    renderAccGeneral(el);
  });
}

function openGeneralExpenseModal(el) {
  const html = `
    <div class="modal-head"><h3>إضافة مصروف إداري</h3><button class="modal-close" id="mClose">×</button></div>
    <div class="field"><label>التصنيف</label><select id="g_cat">${GENERAL_CATS.map(c => `<option value="${c}">${c}</option>`).join("")}</select></div>
    <div class="grid cols-2">
      <div class="field"><label>المبلغ (ر.س)</label><input type="number" min="0" step="0.01" id="g_amount"></div>
      <div class="field"><label>التاريخ</label><input type="date" id="g_date" value="${todayISO()}"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="g_vat" style="width:auto;display:inline-block"> يشمل فاتورة ضريبية (ضريبة قيمة مضافة قابلة للخصم)</label></div>
    <div class="field"><label>ملاحظات</label><textarea id="g_note"></textarea></div>
    <div class="flex gap"><button class="btn primary" id="g_save">حفظ</button><button class="btn" id="g_cancel">إلغاء</button></div>
  `;
  const ov = openModalShell(html);
  ov.querySelector("#mClose").onclick = closeModal;
  ov.querySelector("#g_cancel").onclick = closeModal;
  ov.querySelector("#g_save").onclick = () => {
    const amount = Number(ov.querySelector("#g_amount").value) || 0;
    if (amount <= 0) { toast("يرجى إدخال مبلغ صحيح"); return; }
    const vatApplicable = ov.querySelector("#g_vat").checked;
    const list = dbGet("accGeneral", []);
    list.push({
      id: uid("ge"), category: ov.querySelector("#g_cat").value, amount,
      vatApplicable, vatAmount: vatApplicable ? amount * VAT_RATE : 0,
      date: ov.querySelector("#g_date").value || todayISO(), note: ov.querySelector("#g_note").value.trim(),
    });
    dbSet("accGeneral", list);
    toast("تم إضافة المصروف الإداري");
    closeModal();
    renderAccGeneral(el);
  };
}

/* ================= ضريبة القيمة المضافة ================= */
function quarterOf(dateStr) {
  const m = new Date(dateStr).getMonth() + 1;
  return Math.ceil(m / 3);
}

function renderAccVat(el) {
  const now = new Date();
  if (!renderAccVat.year) renderAccVat.year = now.getFullYear();
  if (!renderAccVat.quarter) renderAccVat.quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = renderAccVat.year, quarter = renderAccVat.quarter;

  const projEntries = dbGet("accProjects", []).filter(e => e.vatApplicable && new Date(e.date).getFullYear() === year && quarterOf(e.date) === quarter);
  const genEntries = dbGet("accGeneral", []).filter(e => e.vatApplicable && new Date(e.date).getFullYear() === year && quarterOf(e.date) === quarter);

  const outputSales = projEntries.filter(e => e.type === "إيراد مشروع" || e.type === "فاتورة ضريبية").reduce((s, e) => s + Number(e.amountBeforeTax ?? e.amount), 0);
  const outputVat = projEntries.filter(e => e.type === "إيراد مشروع" || e.type === "فاتورة ضريبية").reduce((s, e) => s + Number(e.vatAmount || 0), 0);

  const inputPurchases = projEntries.filter(e => ["دفعة مشتريات", "مصروف مواد", "مصروف عمال", "مصروف نثرية"].includes(e.type)).reduce((s, e) => s + Number(e.amount), 0)
    + genEntries.reduce((s, e) => s + Number(e.amount), 0);
  const inputVat = projEntries.filter(e => ["دفعة مشتريات", "مصروف مواد", "مصروف عمال", "مصروف نثرية"].includes(e.type)).reduce((s, e) => s + Number(e.vatAmount || 0), 0)
    + genEntries.reduce((s, e) => s + Number(e.vatAmount || 0), 0);

  const net = outputVat - inputVat;

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>ضريبة القيمة المضافة</h2><p>احتساب ربع سنوي للمبيعات والمشتريات الخاضعة للضريبة</p></div>
    </div>

    <div class="card">
      <div class="flex gap wrap" style="align-items:flex-end">
        <div class="field" style="margin-bottom:0"><label>السنة</label><input type="number" id="vatYear" value="${year}" style="width:110px"></div>
        <div class="field" style="margin-bottom:0"><label>الربع</label>
          <select id="vatQuarter" style="width:150px">
            ${[1, 2, 3, 4].map(q => `<option value="${q}" ${q === quarter ? "selected" : ""}>الربع ${q} (${["يناير-مارس", "أبريل-يونيو", "يوليو-سبتمبر", "أكتوبر-ديسمبر"][q - 1]})</option>`).join("")}
          </select>
        </div>
        <button class="btn" id="vatGo">عرض</button>
      </div>
    </div>

    <div class="grid cols-2" style="margin-bottom:18px">
      <div class="card">
        <h3>ضريبة المخرجات (المبيعات)</h3>
        <div class="kv-row"><span class="k">إجمالي المبيعات الخاضعة للضريبة</span><span class="v">${fmtMoney(outputSales)}</span></div>
        <div class="kv-row"><span class="k">ضريبة المخرجات (15%)</span><span class="v">${fmtMoney(outputVat)}</span></div>
      </div>
      <div class="card">
        <h3>ضريبة المدخلات (المشتريات والمصاريف)</h3>
        <div class="kv-row"><span class="k">إجمالي المشتريات الخاضعة للضريبة</span><span class="v">${fmtMoney(inputPurchases)}</span></div>
        <div class="kv-row"><span class="k">ضريبة المدخلات (15%)</span><span class="v">${fmtMoney(inputVat)}</span></div>
      </div>
    </div>

    <div class="grand-total-box">
      <div>${net >= 0 ? "صافي الضريبة المستحقة للهيئة" : "صافي الضريبة القابلة للاسترداد"}</div>
      <div class="num">${fmtMoney(Math.abs(net))}</div>
    </div>
  `;

  document.getElementById("vatGo").onclick = () => {
    renderAccVat.year = Number(document.getElementById("vatYear").value) || year;
    renderAccVat.quarter = Number(document.getElementById("vatQuarter").value) || quarter;
    renderAccVat(el);
  };
}
