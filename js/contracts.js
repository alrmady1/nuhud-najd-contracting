/* =========================================================
   صفحة العقود
   ========================================================= */

let CONTRACTS_VIEW = "list"; // list | builder | view
let CONTRACT_VIEW_ID = null;
let DRAFT_CONTRACT = null;

const CONTRACT_TYPES = [
  { key: "construction", label: "عقد أعمال إنشائية" },
  { key: "renovation", label: "عقد أعمال ترميم" },
  { key: "finishing", label: "عقد أعمال تشطيبات" },
];

function contractTemplateText(typeKey, d) {
  const typeLabel = (CONTRACT_TYPES.find(t => t.key === typeKey) || {}).label || "عقد مقاولة";
  return `${typeLabel}

أبرم هذا العقد بتاريخ ${fmtDate(d.date)} بين كل من:
الطرف الأول: شركة نهوض نجد للمقاولات (ويشار إليها فيما يلي بـ "المقاول")
الطرف الثاني: ${d.clientName || "..............."} ، سجل/هوية رقم: ${d.clientId || "..............."} ، الرقم الضريبي: ${d.taxNumber || "..............."}
(ويشار إليه فيما يلي بـ "المالك")

وقد اتفق الطرفان على ما يلي:

المادة الأولى - موضوع العقد
يلتزم المقاول بتنفيذ أعمال ${typeLabel.replace("عقد ", "")} للمشروع الخاص بالمالك وفقاً للمواصفات والمخططات المعتمدة من الطرفين.

المادة الثانية - القيمة الإجمالية
يبلغ إجمالي قيمة العقد مبلغ ${fmtMoney(d.totalAmount || 0)} (شامل/غير شامل ضريبة القيمة المضافة حسب الاتفاق)، تُسدد على دفعات وفق الجدول التالي:
${d.paymentsText || ""}

المادة الثالثة - مدة التنفيذ
يتم تنفيذ الأعمال المذكورة خلال المدة المتفق عليها بين الطرفين، ويجوز تمديدها بموافقة خطية من الطرفين في حال وجود أعمال إضافية أو ظروف قاهرة.

المادة الرابعة - التزامات المقاول
1. تنفيذ الأعمال وفق الأصول الفنية والمواصفات المتفق عليها.
2. توفير العمالة والمواد اللازمة للتنفيذ ما لم يُتفق على خلاف ذلك.
3. الالتزام بجدول الدفعات المرتبط بمراحل الإنجاز.

المادة الخامسة - التزامات المالك
1. سداد الدفعات في مواعيدها المتفق عليها.
2. تمكين المقاول من الوصول إلى موقع العمل.

المادة السادسة - الضمان
يلتزم المقاول بضمان جودة الأعمال المنفذة لمدة سنة من تاريخ التسليم النهائي ضد عيوب التنفيذ.

المادة السابعة - فض النزاعات
في حال نشوء أي خلاف يتعذر حله ودياً، يُحال النزاع إلى الجهات القضائية المختصة في المملكة العربية السعودية.

توقيع الطرف الأول (المقاول)                توقيع الطرف الثاني (المالك)
.......................................                .......................................`;
}

function newDraftContract() {
  return {
    id: null, type: "construction", clientName: "", clientId: "", taxNumber: "",
    totalAmount: 0, paymentsCount: 2, payments: [{ percent: 50 }, { percent: 50 }],
    contractText: "", date: todayISO(),
  };
}

function renderContracts(el) {
  if (CONTRACTS_VIEW === "builder") return renderContractBuilder(el);
  if (CONTRACTS_VIEW === "view") return renderContractView(el);
  renderContractsList(el);
}

function renderContractsList(el) {
  const contracts = dbGet("contracts", []).slice().sort((a, b) => (b.date > a.date ? 1 : -1));
  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>العقود</h2><p>نماذج عقود جاهزة لمشاريع إنشائية أو ترميم أو تشطيبات</p></div>
      <button class="btn primary" id="newContractBtn">+ عقد جديد</button>
    </div>
    <div class="card">
      ${contracts.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>النوع</th><th>العميل</th><th>القيمة الإجمالية</th><th>عدد الدفعات</th><th>التاريخ</th><th></th></tr></thead>
          <tbody>
            ${contracts.map(c => `
              <tr>
                <td>${(CONTRACT_TYPES.find(t => t.key === c.type) || {}).label || c.type}</td>
                <td>${c.clientName}</td>
                <td><strong>${fmtMoney(c.totalAmount)}</strong></td>
                <td>${c.paymentsCount}</td>
                <td>${fmtDate(c.date)}</td>
                <td><button class="btn sm" data-viewc="${c.id}">فتح</button><button class="btn sm danger" data-delc="${c.id}">حذف</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="ic">📄</div>لا توجد عقود محفوظة بعد</div>`}
    </div>
  `;
  document.getElementById("newContractBtn").onclick = () => { DRAFT_CONTRACT = newDraftContract(); CONTRACTS_VIEW = "builder"; router(); };
  el.querySelectorAll("[data-viewc]").forEach(b => b.onclick = () => { CONTRACT_VIEW_ID = b.dataset.viewc; CONTRACTS_VIEW = "view"; router(); });
  el.querySelectorAll("[data-delc]").forEach(b => b.onclick = () => {
    if (!confirm("حذف هذا العقد؟")) return;
    dbSet("contracts", dbGet("contracts", []).filter(c => c.id !== b.dataset.delc));
    router();
  });
}

function paymentsSummaryText(d) {
  return d.payments.map((p, i) => `الدفعة ${i + 1}: ${p.percent}% = ${fmtMoney((d.totalAmount || 0) * p.percent / 100)}`).join("\n");
}

function renderContractBuilder(el) {
  const d = DRAFT_CONTRACT;
  const percentSum = d.payments.reduce((s, p) => s + Number(p.percent || 0), 0);

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>إنشاء عقد جديد</h2><p>اختر نموذج العقد وأدخل بيانات العميل والدفعات</p></div>
      <button class="btn" id="backList">إلغاء والرجوع</button>
    </div>

    <div class="card">
      <h3>نوع العقد</h3>
      <div class="pill-group">
        ${CONTRACT_TYPES.map(t => `<div class="pill ${d.type === t.key ? "active" : ""}" data-type="${t.key}">${t.label}</div>`).join("")}
      </div>
    </div>

    <div class="card">
      <h3>بيانات العميل</h3>
      <div class="grid cols-3">
        <div class="field"><label>اسم العميل</label><input id="c_name" value="${d.clientName}"></div>
        <div class="field"><label>رقم الهوية / السجل التجاري</label><input id="c_id" value="${d.clientId}"></div>
        <div class="field"><label>الرقم الضريبي</label><input id="c_tax" value="${d.taxNumber}"></div>
      </div>
    </div>

    <div class="card">
      <h3>القيمة الإجمالية والدفعات</h3>
      <div class="grid cols-2">
        <div class="field"><label>إجمالي قيمة المشروع (ر.س)</label><input type="number" min="0" id="c_total" value="${d.totalAmount}"></div>
        <div class="field"><label>عدد الدفعات</label><input type="number" min="1" max="12" id="c_count" value="${d.paymentsCount}"></div>
      </div>
      <div id="paymentsRows"></div>
      <div class="text-muted" style="font-size:12.5px;margin-top:6px" id="percentSumLabel">مجموع النسب: ${percentSum}% ${percentSum !== 100 ? "⚠️ يجب أن يساوي المجموع 100%" : "✅"}</div>
    </div>

    <div class="card">
      <div class="flex between">
        <h3 class="mt-0">نص العقد</h3>
        <button class="btn sm" id="regenBtn">تحديث نص العقد تلقائياً</button>
      </div>
      <div class="field"><textarea id="c_text" style="min-height:340px;font-family:'Cairo',sans-serif;white-space:pre-wrap;line-height:1.9">${d.contractText || contractTemplateText(d.type, { ...d, paymentsText: paymentsSummaryText(d) })}</textarea></div>
    </div>

    <div class="flex gap"><button class="btn primary" id="saveContractBtn">💾 حفظ العقد</button><button class="btn" id="cancelContractBtn">إلغاء</button></div>
  `;

  renderPaymentsRows();

  document.getElementById("backList").onclick = () => { CONTRACTS_VIEW = "list"; router(); };
  document.getElementById("cancelContractBtn").onclick = () => { CONTRACTS_VIEW = "list"; router(); };

  el.querySelectorAll("[data-type]").forEach(p => p.onclick = () => { d.type = p.dataset.type; renderContractBuilder(el); });

  document.getElementById("c_name").oninput = (e) => d.clientName = e.target.value;
  document.getElementById("c_id").oninput = (e) => d.clientId = e.target.value;
  document.getElementById("c_tax").oninput = (e) => d.taxNumber = e.target.value;
  document.getElementById("c_total").oninput = (e) => { d.totalAmount = Number(e.target.value) || 0; renderPaymentsRows(); };
  document.getElementById("c_count").onchange = (e) => {
    let n = Math.max(1, Math.min(12, Number(e.target.value) || 1));
    const even = Math.floor((100 / n) * 100) / 100;
    d.paymentsCount = n;
    d.payments = Array.from({ length: n }, (_, i) => ({ percent: i === n - 1 ? Math.round((100 - even * (n - 1)) * 100) / 100 : even }));
    renderPaymentsRows();
  };
  document.getElementById("c_text").oninput = (e) => d.contractText = e.target.value;

  document.getElementById("regenBtn").onclick = () => {
    d.contractText = contractTemplateText(d.type, { ...d, paymentsText: paymentsSummaryText(d) });
    document.getElementById("c_text").value = d.contractText;
  };

  function renderPaymentsRows() {
    const wrap = document.getElementById("paymentsRows");
    wrap.innerHTML = d.payments.map((p, i) => `
      <div class="item-row" style="grid-template-columns: 1fr 1fr 1fr">
        <div style="font-size:12.5px;font-weight:700">الدفعة ${i + 1}</div>
        <div class="flex" style="align-items:center;gap:6px">
          <input type="number" min="0" max="100" step="0.01" value="${p.percent}" data-pct="${i}" placeholder="النسبة" style="flex:1">
          <span class="text-muted" style="font-size:12.5px;font-weight:700">% (نسبة مئوية)</span>
        </div>
        <div style="font-size:12.5px" data-pctamt="${i}">${fmtMoney((d.totalAmount || 0) * p.percent / 100)}</div>
      </div>
    `).join("");
    wrap.querySelectorAll("[data-pct]").forEach(inp => inp.oninput = () => {
      const i = Number(inp.dataset.pct);
      d.payments[i].percent = Number(inp.value) || 0;
      document.querySelector(`[data-pctamt="${i}"]`).textContent = fmtMoney((d.totalAmount || 0) * d.payments[i].percent / 100);
      const sum = d.payments.reduce((s, p) => s + Number(p.percent || 0), 0);
      document.getElementById("percentSumLabel").textContent = `مجموع النسب: ${sum}% ${sum !== 100 ? "⚠️ يجب أن يساوي المجموع 100%" : "✅"}`;
    });
  }

  document.getElementById("saveContractBtn").onclick = () => {
    if (!d.clientName.trim()) { toast("يرجى إدخال اسم العميل"); return; }
    if (!d.totalAmount) { toast("يرجى إدخال قيمة المشروع"); return; }
    const sum = d.payments.reduce((s, p) => s + Number(p.percent || 0), 0);
    if (Math.round(sum) !== 100) { toast("مجموع نسب الدفعات يجب أن يساوي 100%"); return; }

    const contracts = dbGet("contracts", []);
    d.id = uid("c");
    d.contractText = document.getElementById("c_text").value;
    contracts.push(d);
    dbSet("contracts", contracts);
    toast("تم حفظ العقد بنجاح");
    CONTRACTS_VIEW = "list";
    router();
  };
}

function renderContractView(el) {
  const c = dbGet("contracts", []).find(x => x.id === CONTRACT_VIEW_ID);
  if (!c) { CONTRACTS_VIEW = "list"; router(); return; }
  el.innerHTML = `
    <div class="section-title-row no-print">
      <div><h2>${(CONTRACT_TYPES.find(t => t.key === c.type) || {}).label}</h2><p>${c.clientName}</p></div>
      <div class="flex gap"><button class="btn" id="backList2">رجوع</button><button class="btn primary" id="printContract">🖨️ طباعة</button></div>
    </div>
    <div class="card">
      <pre style="white-space:pre-wrap;font-family:'Cairo',sans-serif;line-height:1.9;font-size:13.5px;margin:0">${c.contractText}</pre>
    </div>
  `;
  document.getElementById("backList2").onclick = () => { CONTRACTS_VIEW = "list"; router(); };
  document.getElementById("printContract").onclick = () => window.print();
}
