/* =========================================================
   مهام المشرفين - زيارة موقع
   ========================================================= */

let VISIT_MODAL = null; // 'create' | {id}

function renderVisits(el) {
  const visits = dbGet("visits", []).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const users = dbGet("users", []);

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>زيارة موقع</h2><p>تكليف المشرفين بزيارات ميدانية ومتابعة نتائجها</p></div>
      <button class="btn primary" id="newVisitBtn">+ طلب زيارة جديد</button>
    </div>

    <div class="card">
      ${visits.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>العميل</th><th>الموقع</th><th>الوقت المطلوب</th><th>المشرف المكلف</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            ${visits.map(v => `
              <tr>
                <td>${v.clientName}</td>
                <td>${v.location}</td>
                <td>${v.requestedTime ? new Date(v.requestedTime).toLocaleString("ar-SA") : "-"}</td>
                <td>${v.assignedToName || "-"}</td>
                <td>${statusBadge(v.status)}</td>
                <td><button class="btn sm" data-open="${v.id}">فتح</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="ic">📍</div>لا توجد طلبات زيارة بعد</div>`}
    </div>
  `;

  document.getElementById("newVisitBtn").onclick = () => { VISIT_MODAL = "create"; openVisitModal(); };
  el.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { VISIT_MODAL = { id: b.dataset.open }; openVisitModal(); });
}

function statusBadge(status) {
  const map = { "جديدة": "gray", "قيد التنفيذ": "orange", "منتهية": "green" };
  return `<span class="badge ${map[status] || "gray"}">${status || "جديدة"}</span>`;
}

function closeModal() {
  const ov = document.getElementById("modalOverlay");
  if (ov) ov.remove();
}

function openModalShell(innerHtml, wide) {
  closeModal();
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.id = "modalOverlay";
  ov.innerHTML = `<div class="modal ${wide ? "wide" : ""}">${innerHtml}</div>`;
  ov.addEventListener("mousedown", (e) => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov);
  return ov;
}

function openVisitModal() {
  const users = dbGet("users", []).filter(u => u.role === "مراقب موقع");

  if (VISIT_MODAL === "create") {
    const html = `
      <div class="modal-head"><h3>طلب زيارة موقع جديد</h3><button class="modal-close" id="mClose">×</button></div>
      <div class="grid cols-2">
        <div class="field"><label>اسم العميل</label><input id="v_clientName"></div>
        <div class="field"><label>رقم جوال العميل</label><input id="v_clientPhone"></div>
        <div class="field" style="grid-column:span 2"><label>موقع الزيارة</label><input id="v_location"></div>
        <div class="field"><label>الوقت المطلوب للزيارة</label><input type="datetime-local" id="v_time"></div>
        <div class="field"><label>المشرف المكلف</label>
          <select id="v_assigned">${users.map(u => `<option value="${u.id}">${u.name}</option>`).join("") || `<option value="">لا يوجد مشرفون مسجلون</option>`}</select>
        </div>
        <div class="field" style="grid-column:span 2"><label>ملاحظات / تعليمات الزيارة</label><textarea id="v_notes"></textarea></div>
        <div class="field" style="grid-column:span 2">
          <label>رفع المخططات (AutoCAD أو PDF)</label>
          <input type="file" id="v_plans" multiple accept=".dwg,.dxf,.pdf,application/pdf">
          <div class="hint">يمكن اختيار أكثر من ملف</div>
          <div id="v_plansList" class="flex wrap"></div>
        </div>
        <div class="field" style="grid-column:span 2">
          <label>إضافة صور للزيارة (اختياري)</label>
          <input type="file" id="v_photos" multiple accept="image/*">
          <div id="v_photosList" class="photo-grid"></div>
        </div>
      </div>
      <div class="flex gap" style="margin-top:6px">
        <button class="btn primary" id="v_save">حفظ طلب الزيارة</button>
        <button class="btn" id="v_cancel">إلغاء</button>
      </div>
    `;
    const ov = openModalShell(html, true);
    let plans = [];
    let photos = [];

    ov.querySelector("#mClose").onclick = closeModal;
    ov.querySelector("#v_cancel").onclick = closeModal;

    ov.querySelector("#v_plans").onchange = async (e) => {
      for (const f of e.target.files) {
        plans.push({ name: f.name, type: f.type, size: f.size });
      }
      ov.querySelector("#v_plansList").innerHTML = plans.map((p, i) => `<span class="file-chip">📎 ${p.name}</span>`).join("");
    };
    ov.querySelector("#v_photos").onchange = async (e) => {
      for (const f of e.target.files) {
        const url = await fileToDataURL(f);
        photos.push({ url, caption: "" });
      }
      renderPhotoGrid(ov.querySelector("#v_photosList"), photos, false);
    };

    ov.querySelector("#v_save").onclick = () => {
      const clientName = ov.querySelector("#v_clientName").value.trim();
      const location = ov.querySelector("#v_location").value.trim();
      if (!clientName || !location) { toast("يرجى إدخال اسم العميل والموقع"); return; }
      const assignedSelect = ov.querySelector("#v_assigned");
      const assignedUser = users.find(u => u.id === assignedSelect.value);

      const visits = dbGet("visits", []);
      visits.push({
        id: uid("v"),
        clientName,
        clientPhone: ov.querySelector("#v_clientPhone").value.trim(),
        location,
        requestedTime: ov.querySelector("#v_time").value,
        assignedTo: assignedUser ? assignedUser.id : "",
        assignedToName: assignedUser ? assignedUser.name : "",
        notes: ov.querySelector("#v_notes").value.trim(),
        planFiles: plans,
        refPhotos: photos,
        status: "جديدة",
        visitResult: "",
        visitPhotos: [],
        receivedFiles: [],
        createdAt: new Date().toISOString(),
      });
      dbSet("visits", visits);
      toast("تم إرسال طلب الزيارة للمشرف");
      closeModal();
      router();
    };
    return;
  }

  // Open existing visit (supervisor fills result)
  const visits = dbGet("visits", []);
  const v = visits.find(x => x.id === VISIT_MODAL.id);
  if (!v) return;

  const html = `
    <div class="modal-head"><h3>زيارة موقع — ${v.clientName}</h3><button class="modal-close" id="mClose">×</button></div>
    <div class="grid cols-2">
      <div class="kv-row"><span class="k">العميل</span><span class="v">${v.clientName} (${v.clientPhone || "-"})</span></div>
      <div class="kv-row"><span class="k">الموقع</span><span class="v">${v.location}</span></div>
      <div class="kv-row"><span class="k">الوقت المطلوب</span><span class="v">${v.requestedTime ? new Date(v.requestedTime).toLocaleString("ar-SA") : "-"}</span></div>
      <div class="kv-row"><span class="k">المشرف المكلف</span><span class="v">${v.assignedToName || "-"}</span></div>
    </div>
    ${v.notes ? `<p class="text-muted" style="font-size:13px">ملاحظات الطلب: ${v.notes}</p>` : ""}
    ${v.planFiles && v.planFiles.length ? `<div class="field"><label>المخططات المرفقة</label>${v.planFiles.map(p => `<span class="file-chip">📎 ${p.name}</span>`).join("")}</div>` : ""}
    ${v.refPhotos && v.refPhotos.length ? `<div class="field"><label>صور مرفقة مع الطلب</label><div class="photo-grid">${v.refPhotos.map(p => `<div class="photo-item"><img src="${p.url}"></div>`).join("")}</div></div>` : ""}

    <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
    <h3>تسجيل نتيجة الزيارة الميدانية (المشرف)</h3>
    <div class="field">
      <label>حالة الزيارة</label>
      <select id="v_status">
        ${["جديدة", "قيد التنفيذ", "منتهية"].map(s => `<option value="${s}" ${v.status === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>
    <div class="field"><label>نتيجة الزيارة / الوضع الراهن</label><textarea id="v_result">${v.visitResult || ""}</textarea></div>
    <div class="field">
      <label>رفع صور الزيارة الميدانية</label>
      <input type="file" id="v_visitPhotos" multiple accept="image/*">
      <div id="v_visitPhotosList" class="photo-grid">${(v.visitPhotos || []).map((p, i) => `<div class="photo-item" data-vp="${i}"><img src="${p.url}"></div>`).join("")}</div>
    </div>
    <div class="field">
      <label>رفع الملفات/المخططات المستلمة من العميل أثناء الزيارة</label>
      <input type="file" id="v_receivedFiles" multiple accept=".dwg,.dxf,.pdf,application/pdf,image/*">
      <div id="v_receivedList" class="flex wrap">${(v.receivedFiles || []).map(f => `<span class="file-chip">📎 ${f.name}</span>`).join("")}</div>
    </div>

    <div class="flex gap" style="margin-top:6px">
      <button class="btn primary" id="v_saveResult">حفظ نتيجة الزيارة</button>
      <button class="btn" id="v_cancel2">إغلاق</button>
    </div>
  `;
  const ov = openModalShell(html, true);
  ov.querySelector("#mClose").onclick = closeModal;
  ov.querySelector("#v_cancel2").onclick = closeModal;

  let newVisitPhotos = (v.visitPhotos || []).slice();
  let newReceivedFiles = (v.receivedFiles || []).slice();

  ov.querySelector("#v_visitPhotos").onchange = async (e) => {
    for (const f of e.target.files) {
      const url = await fileToDataURL(f);
      newVisitPhotos.push({ url, caption: "" });
    }
    ov.querySelector("#v_visitPhotosList").innerHTML = newVisitPhotos.map(p => `<div class="photo-item"><img src="${p.url}"></div>`).join("");
  };
  ov.querySelector("#v_receivedFiles").onchange = (e) => {
    for (const f of e.target.files) newReceivedFiles.push({ name: f.name, type: f.type, size: f.size });
    ov.querySelector("#v_receivedList").innerHTML = newReceivedFiles.map(f => `<span class="file-chip">📎 ${f.name}</span>`).join("");
  };

  ov.querySelector("#v_saveResult").onclick = () => {
    v.status = ov.querySelector("#v_status").value;
    v.visitResult = ov.querySelector("#v_result").value.trim();
    v.visitPhotos = newVisitPhotos;
    v.receivedFiles = newReceivedFiles;
    dbSet("visits", visits);
    toast("تم حفظ نتيجة الزيارة");
    closeModal();
    router();
  };
}

function renderPhotoGrid(container, photos, withCaption) {
  container.className = "photo-grid";
  container.innerHTML = photos.map((p, i) => `
    <div class="photo-item">
      <img src="${p.url}">
      ${withCaption ? `<div class="cap"><input placeholder="تعليق على الصورة" value="${p.caption || ""}" data-capidx="${i}"></div>` : ""}
    </div>
  `).join("");
}
