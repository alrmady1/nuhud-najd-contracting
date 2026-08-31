/* =========================================================
   صفحة الإعدادات
   ========================================================= */

let SETTINGS_TAB = "users"; // users | permissions | catalog | company

function renderSettings(el) {
  el.innerHTML = `
    <div class="section-title-row"><div><h2>الإعدادات</h2><p>إدارة المستخدمين والصلاحيات وبنود عروض الأسعار وبيانات المؤسسة</p></div></div>
    <div class="tabs">
      <div class="tab-btn ${SETTINGS_TAB === "users" ? "active" : ""}" data-tab="users">١. التحكم بالمستخدمين</div>
      <div class="tab-btn ${SETTINGS_TAB === "permissions" ? "active" : ""}" data-tab="permissions">٢. الصلاحيات</div>
      <div class="tab-btn ${SETTINGS_TAB === "catalog" ? "active" : ""}" data-tab="catalog">٣. بنود عروض الأسعار</div>
      <div class="tab-btn ${SETTINGS_TAB === "company" ? "active" : ""}" data-tab="company">٤. بيانات المؤسسة والشعار</div>
    </div>
    <div id="settingsBody"></div>
  `;
  el.querySelectorAll("[data-tab]").forEach(t => t.onclick = () => { SETTINGS_TAB = t.dataset.tab; renderSettings(el); });

  const body = document.getElementById("settingsBody");
  if (SETTINGS_TAB === "users") renderUsersTab(body);
  else if (SETTINGS_TAB === "permissions") renderPermissionsTab(body);
  else if (SETTINGS_TAB === "catalog") renderCatalogTab(body);
  else renderCompanyTab(body);
}

/* ---------- تبويب الصلاحيات ---------- */
function renderPermissionsTab(el) {
  const matrix = getPermMatrix();
  el.innerHTML = `
    <div class="card">
      <div class="flex between" style="align-items:center">
        <div>
          <h3 class="mt-0">مصفوفة الصلاحيات</h3>
          <p class="text-muted" style="font-size:12.5px;margin-top:-8px">حدد الصلاحيات المتاحة لكل مسمى وظيفي بوضع علامة صح — يتم الحفظ تلقائياً عند كل تغيير</p>
        </div>
        <button class="btn sm" id="permResetBtn" type="button">إعادة الافتراضي</button>
      </div>
      <div class="table-wrap">
        <table class="data-table perm-matrix">
          <thead>
            <tr>
              <th>الصلاحية</th>
              ${ROLES.map(r => `<th style="text-align:center">${r}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${PERMISSION_GROUPS.map(g => `
              <tr class="perm-group-row"><td colspan="${ROLES.length + 1}">${g.group}</td></tr>
              ${g.perms.map(p => `
                <tr>
                  <td>${p.label}</td>
                  ${ROLES.map(r => `
                    <td style="text-align:center">
                      <input type="checkbox" data-permkey="${p.key}" data-permrole="${r}" ${matrix[p.key] && matrix[p.key][r] ? "checked" : ""} style="width:auto">
                    </td>
                  `).join("")}
                </tr>
              `).join("")}
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  el.querySelectorAll("[data-permkey]").forEach(chk => chk.onchange = () => {
    const m = getPermMatrix();
    const key = chk.dataset.permkey, role = chk.dataset.permrole;
    if (!m[key]) m[key] = {};
    m[key][role] = chk.checked;
    setPermMatrix(m);
    const cur = getCurrentUser();
    if (cur && cur.role === role && !chk.checked && !canAccess(role, "settings")) {
      toast("تم حفظ الصلاحيات — تنبيه: تم سحب صلاحية الوصول للإعدادات عن مسماك الوظيفي الحالي");
    } else {
      toast("تم حفظ الصلاحيات");
    }
  });

  document.getElementById("permResetBtn").onclick = () => {
    if (!confirm("إعادة جميع الصلاحيات إلى الإعدادات الافتراضية؟")) return;
    setPermMatrix(defaultPermMatrix());
    toast("تم استعادة الصلاحيات الافتراضية");
    renderSettings(el.parentElement);
  };
}

/* ---------- تبويب بيانات المؤسسة ---------- */
function renderCompanyTab(el) {
  const profile = getCompanyProfile();
  const users = dbGet("users", []);
  el.innerHTML = `
    <div class="card">
      <h3>بيانات المؤسسة وشعارها</h3>
      <p class="text-muted" style="font-size:12.5px;margin-top:-6px">تظهر هذه البيانات في ترويسة عرض السعر النهائي المرسل للعميل (يمكن إظهارها أو إخفاؤها لكل عرض سعر على حدة عند إنشائه).</p>

      <div class="company-logo-preview" id="logoPreview">${profile.logo ? `<img src="${profile.logo}">` : "الشعار"}</div>
      <div class="field" style="max-width:340px">
        <label>رفع شعار المؤسسة (صورة)</label>
        <input type="file" id="cp_logo" accept="image/*">
        ${profile.logo ? `<button type="button" class="btn sm danger" id="cp_removeLogo" style="margin-top:8px">إزالة الشعار</button>` : ""}
      </div>

      <div class="grid cols-2">
        <div class="field" style="grid-column:span 2"><label>اسم المؤسسة</label><input id="cp_name" value="${profile.name || ""}"></div>
        <div class="field"><label>رقم الجوال</label><input id="cp_phone" value="${profile.phone || ""}"></div>
        <div class="field"><label>البريد الإلكتروني</label><input id="cp_email" value="${profile.email || ""}"></div>
        <div class="field"><label>الرقم الضريبي</label><input id="cp_tax" value="${profile.taxNumber || ""}"></div>
        <div class="field"><label>رقم السجل التجاري</label><input id="cp_cr" value="${profile.crNumber || ""}"></div>
        <div class="field" style="grid-column:span 2"><label>العنوان</label><input id="cp_address" value="${profile.address || ""}"></div>
        <div class="field" style="grid-column:span 2">
          <label>اسم المسؤول</label>
          <select id="cp_contact">
            <option value="">— بدون تحديد —</option>
            ${users.map(u => `<option value="${u.id}" ${profile.contactUserId === u.id ? "selected" : ""}>${u.name} — ${u.role}</option>`).join("")}
          </select>
          <div class="hint">يُختار من المستخدمين المسجلين في صفحة الإعدادات ← التحكم بالمستخدمين</div>
        </div>
      </div>
      <button class="btn primary" id="cp_save">💾 حفظ بيانات المؤسسة</button>
    </div>
  `;

  let pendingLogo = profile.logo || null;

  document.getElementById("cp_logo").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingLogo = await fileToDataURL(file);
    document.getElementById("logoPreview").innerHTML = `<img src="${pendingLogo}">`;
  };

  const removeBtn = document.getElementById("cp_removeLogo");
  if (removeBtn) removeBtn.onclick = () => {
    pendingLogo = null;
    document.getElementById("logoPreview").innerHTML = "الشعار";
  };

  document.getElementById("cp_save").onclick = () => {
    setCompanyProfile({
      name: document.getElementById("cp_name").value.trim(),
      phone: document.getElementById("cp_phone").value.trim(),
      email: document.getElementById("cp_email").value.trim(),
      taxNumber: document.getElementById("cp_tax").value.trim(),
      crNumber: document.getElementById("cp_cr").value.trim(),
      address: document.getElementById("cp_address").value.trim(),
      contactUserId: document.getElementById("cp_contact").value,
      logo: pendingLogo,
    });
    toast("تم حفظ بيانات المؤسسة");
    renderSettings(el.parentElement);
  };
}

/* ---------- تبويب المستخدمين ---------- */
function renderUsersTab(el) {
  const users = dbGet("users", []);
  el.innerHTML = `
    <div class="card">
      <div class="flex between"><h3 class="mt-0">إضافة مستخدم جديد</h3></div>
      <div class="grid cols-3">
        <div class="field"><label>الاسم الكامل</label><input id="u_name"></div>
        <div class="field"><label>اسم المستخدم</label><input id="u_username"></div>
        <div class="field"><label>المسمى الوظيفي</label><select id="u_role">${ROLES.map(r => `<option value="${r}">${r}</option>`).join("")}</select></div>
      </div>
      <button class="btn primary" id="addUserBtn">+ إضافة مستخدم</button>
    </div>

    <div class="card">
      <h3>المستخدمون الحاليون (${users.length})</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>المسمى الوظيفي</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.name}</td>
                <td class="text-muted">${u.username}</td>
                <td>
                  <select data-rolesel="${u.id}" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12.5px">
                    ${ROLES.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}
                  </select>
                </td>
                <td><button class="btn sm danger" data-deluser="${u.id}">حذف</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("addUserBtn").onclick = () => {
    const name = document.getElementById("u_name").value.trim();
    const username = document.getElementById("u_username").value.trim();
    const role = document.getElementById("u_role").value;
    if (!name || !username) { toast("يرجى إدخال الاسم واسم المستخدم"); return; }
    const list = dbGet("users", []);
    list.push({ id: uid("u"), name, username, role });
    dbSet("users", list);
    toast("تم إضافة المستخدم");
    renderSettings(el.parentElement);
  };

  el.querySelectorAll("[data-rolesel]").forEach(sel => sel.onchange = () => {
    const list = dbGet("users", []);
    const u = list.find(x => x.id === sel.dataset.rolesel);
    u.role = sel.value;
    dbSet("users", list);
    toast("تم تحديث المسمى الوظيفي");
    const cur = getCurrentUser();
    if (cur && cur.id === u.id) setCurrentUser(u);
  });

  el.querySelectorAll("[data-deluser]").forEach(b => b.onclick = () => {
    const cur = getCurrentUser();
    if (cur && cur.id === b.dataset.deluser) { toast("لا يمكن حذف المستخدم الحالي المسجل دخوله"); return; }
    if (!confirm("هل تريد حذف هذا المستخدم؟")) return;
    dbSet("users", dbGet("users", []).filter(u => u.id !== b.dataset.deluser));
    renderSettings(el.parentElement);
  });
}

/* ---------- تبويب بنود عروض الأسعار ---------- */
function renderCatalogTab(el) {
  const catalog = dbGet("priceCatalog", []);
  el.innerHTML = `
    <div class="card">
      <div class="flex between"><h3 class="mt-0">التصنيفات والبنود</h3>
        <button class="btn sm" id="addCatBtn">+ إضافة تصنيف جديد</button>
      </div>
      <p class="text-muted" style="font-size:12.5px;margin-top:-6px">لكل بند إمكانية تفعيل سعر توريد و/أو سعر تركيب بشكل مستقل — عند إنشاء عرض سعر يمكن اختيار توريد فقط، تركيب فقط، أو الاثنين معاً.</p>
      ${catalog.map(cat => `
        <div class="cat-block" data-catid="${cat.id}">
          <div class="cat-head">
            <strong>${cat.name}</strong>
            <button class="btn sm danger" data-delcat="${cat.id}">حذف التصنيف</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>اسم البند</th><th>الوحدة</th><th>توريد</th><th>سعر التوريد (تكلفة)</th><th>تركيب</th><th>سعر التركيب (تكلفة)</th><th>نسبة الربح %</th><th></th></tr></thead>
              <tbody>
                ${cat.items.map(it => `
                  <tr data-itemrow="${cat.id}:${it.id}">
                    <td><input value="${it.name}" data-editname="${cat.id}:${it.id}" style="border:1px solid var(--border);border-radius:6px;padding:5px 8px;width:100%;min-width:180px"></td>
                    <td><input value="${it.unit}" data-editunit="${cat.id}:${it.id}" style="border:1px solid var(--border);border-radius:6px;padding:5px 8px;width:70px"></td>
                    <td style="text-align:center"><input type="checkbox" ${it.supply && it.supply.enabled ? "checked" : ""} data-editsupchk="${cat.id}:${it.id}" style="width:auto"></td>
                    <td><input type="number" min="0" step="0.01" value="${it.supply ? it.supply.price : 0}" data-editsupprice="${cat.id}:${it.id}" ${it.supply && it.supply.enabled ? "" : "disabled"} style="border:1px solid var(--border);border-radius:6px;padding:5px 8px;width:90px"></td>
                    <td style="text-align:center"><input type="checkbox" ${it.install && it.install.enabled ? "checked" : ""} data-editinschk="${cat.id}:${it.id}" style="width:auto"></td>
                    <td><input type="number" min="0" step="0.01" value="${it.install ? it.install.price : 0}" data-editinsprice="${cat.id}:${it.id}" ${it.install && it.install.enabled ? "" : "disabled"} style="border:1px solid var(--border);border-radius:6px;padding:5px 8px;width:90px"></td>
                    <td><input type="number" min="0" step="0.1" value="${it.profitMargin !== undefined ? it.profitMargin : 30}" data-editmargin="${cat.id}:${it.id}" style="border:1px solid var(--border);border-radius:6px;padding:5px 8px;width:80px"></td>
                    <td><button class="btn sm danger" data-delitem="${cat.id}:${it.id}">حذف</button></td>
                  </tr>`).join("")}
                <tr>
                  <td><input placeholder="اسم بند جديد" data-newname="${cat.id}"></td>
                  <td><input placeholder="الوحدة" data-newunit="${cat.id}" style="width:70px"></td>
                  <td style="text-align:center"><input type="checkbox" data-newsupchk="${cat.id}" style="width:auto"></td>
                  <td><input type="number" min="0" step="0.01" placeholder="سعر التوريد" data-newsupprice="${cat.id}" style="width:90px"></td>
                  <td style="text-align:center"><input type="checkbox" data-newinschk="${cat.id}" style="width:auto"></td>
                  <td><input type="number" min="0" step="0.01" placeholder="سعر التركيب" data-newinsprice="${cat.id}" style="width:90px"></td>
                  <td><input type="number" min="0" step="0.1" value="30" data-newmargin="${cat.id}" style="width:80px"></td>
                  <td><button class="btn sm primary" data-additem="${cat.id}">+ إضافة</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `).join("") || `<div class="empty-state"><div class="ic">🗂️</div>لا توجد تصنيفات بعد</div>`}
    </div>
  `;

  document.getElementById("addCatBtn").onclick = () => {
    openNewCategoryModal((name) => {
      const cats = dbGet("priceCatalog", []);
      cats.push({ id: uid("cat"), name, items: [] });
      dbSet("priceCatalog", cats);
      renderSettings(el.parentElement);
    });
  };

  el.querySelectorAll("[data-delcat]").forEach(b => b.onclick = () => {
    if (!confirm("حذف هذا التصنيف وجميع بنوده؟")) return;
    dbSet("priceCatalog", dbGet("priceCatalog", []).filter(c => c.id !== b.dataset.delcat));
    renderSettings(el.parentElement);
  });

  function getItem(compositeId) {
    const [catId, itemId] = compositeId.split(":");
    const cats = dbGet("priceCatalog", []);
    const cat = cats.find(c => c.id === catId);
    const item = cat.items.find(i => i.id === itemId);
    return { cats, cat, item };
  }
  function saveField(compositeId, field, value) {
    const { cats, item } = getItem(compositeId);
    item[field] = value;
    dbSet("priceCatalog", cats);
  }

  el.querySelectorAll("[data-editname]").forEach(inp => inp.onchange = () => { saveField(inp.dataset.editname, "name", inp.value); toast("تم الحفظ"); });
  el.querySelectorAll("[data-editunit]").forEach(inp => inp.onchange = () => { saveField(inp.dataset.editunit, "unit", inp.value); toast("تم الحفظ"); });

  el.querySelectorAll("[data-editsupchk]").forEach(chk => chk.onchange = () => {
    const { cats, item } = getItem(chk.dataset.editsupchk);
    item.supply.enabled = chk.checked;
    dbSet("priceCatalog", cats);
    const priceInput = el.querySelector(`[data-editsupprice="${chk.dataset.editsupchk}"]`);
    if (priceInput) priceInput.disabled = !chk.checked;
    toast("تم الحفظ");
  });
  el.querySelectorAll("[data-editinschk]").forEach(chk => chk.onchange = () => {
    const { cats, item } = getItem(chk.dataset.editinschk);
    item.install.enabled = chk.checked;
    dbSet("priceCatalog", cats);
    const priceInput = el.querySelector(`[data-editinsprice="${chk.dataset.editinschk}"]`);
    if (priceInput) priceInput.disabled = !chk.checked;
    toast("تم الحفظ");
  });
  el.querySelectorAll("[data-editsupprice]").forEach(inp => inp.onchange = () => { const { cats, item } = getItem(inp.dataset.editsupprice); item.supply.price = Number(inp.value) || 0; dbSet("priceCatalog", cats); toast("تم الحفظ"); });
  el.querySelectorAll("[data-editinsprice]").forEach(inp => inp.onchange = () => { const { cats, item } = getItem(inp.dataset.editinsprice); item.install.price = Number(inp.value) || 0; dbSet("priceCatalog", cats); toast("تم الحفظ"); });
  el.querySelectorAll("[data-editmargin]").forEach(inp => inp.onchange = () => { const { cats, item } = getItem(inp.dataset.editmargin); item.profitMargin = Number(inp.value) || 0; dbSet("priceCatalog", cats); toast("تم الحفظ"); });

  el.querySelectorAll("[data-delitem]").forEach(b => b.onclick = () => {
    const [catId, itemId] = b.dataset.delitem.split(":");
    const cats = dbGet("priceCatalog", []);
    const cat = cats.find(c => c.id === catId);
    cat.items = cat.items.filter(i => i.id !== itemId);
    dbSet("priceCatalog", cats);
    renderSettings(el.parentElement);
  });

  el.querySelectorAll("[data-additem]").forEach(b => b.onclick = () => {
    const catId = b.dataset.additem;
    const name = el.querySelector(`[data-newname="${catId}"]`).value.trim();
    const unit = el.querySelector(`[data-newunit="${catId}"]`).value.trim() || "م²";
    const supEnabled = el.querySelector(`[data-newsupchk="${catId}"]`).checked;
    const supPrice = Number(el.querySelector(`[data-newsupprice="${catId}"]`).value) || 0;
    const insEnabled = el.querySelector(`[data-newinschk="${catId}"]`).checked;
    const insPrice = Number(el.querySelector(`[data-newinsprice="${catId}"]`).value) || 0;
    const margin = Number(el.querySelector(`[data-newmargin="${catId}"]`).value);
    if (!name) { toast("يرجى إدخال اسم البند"); return; }
    if (!supEnabled && !insEnabled) { toast("يرجى تفعيل توريد أو تركيب على الأقل"); return; }
    const cats = dbGet("priceCatalog", []);
    const cat = cats.find(c => c.id === catId);
    cat.items.push({
      id: uid("it"), name, unit,
      supply: { enabled: supEnabled, price: supPrice },
      install: { enabled: insEnabled, price: insPrice },
      profitMargin: isNaN(margin) ? 30 : margin,
    });
    dbSet("priceCatalog", cats);
    toast("تم إضافة البند");
    renderSettings(el.parentElement);
  });
}
