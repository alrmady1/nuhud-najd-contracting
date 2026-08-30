/* =========================================================
   نهوض نجد للمقاولات - التطبيق الرئيسي (التوجيه + الشاشة الرئيسية)
   ========================================================= */

const MENU = [
  { key: "dashboard", label: "لوحة التحكم", icon: "🏠" },
  { key: "clients", label: "العملاء", icon: "👤" },
  { key: "quotes", label: "عروض الأسعار", icon: "🧾" },
  {
    key: "supervisors", label: "مهام المشرفين", icon: "👷",
    children: [
      { key: "visits", label: "زيارة موقع" },
      { key: "reports", label: "تقارير المشرفين" },
    ],
  },
  {
    key: "accounting", label: "المحاسبة", icon: "💰",
    children: [
      { key: "acc_projects", label: "محاسبة المشاريع" },
      { key: "acc_general", label: "المحاسبة العامة" },
      { key: "acc_vat", label: "ضريبة القيمة المضافة" },
    ],
  },
  { key: "contracts", label: "العقود", icon: "📄" },
  { key: "settings", label: "الإعدادات", icon: "⚙️" },
];

const PAGE_TITLES = {
  dashboard: "لوحة التحكم",
  clients: "العملاء",
  quotes: "عروض الأسعار",
  visits: "زيارة موقع",
  reports: "تقارير المشرفين",
  acc_projects: "محاسبة المشاريع",
  acc_general: "المحاسبة العامة",
  acc_vat: "ضريبة القيمة المضافة",
  contracts: "العقود",
  settings: "الإعدادات",
};

function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function initials(name) {
  return (name || "").trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("");
}

/* ---------- تسجيل الدخول ---------- */
function renderLogin() {
  const users = dbGet("users", []);
  document.getElementById("root").innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">ن ن</div>
        <h1>نهوض نجد للمقاولات</h1>
        <p class="sub">نظام إدارة المشاريع والمقاولات</p>
        <div class="field" style="text-align:right">
          <label>اختر المستخدم لتسجيل الدخول</label>
          <select id="loginUser">
            ${users.map(u => `<option value="${u.id}">${u.name} — ${u.role}</option>`).join("")}
          </select>
        </div>
        <button id="loginBtn">تسجيل الدخول</button>
        <p class="sub" style="margin:14px 0 0">هذا عرض تجريبي: يتم محاكاة الدخول باختيار المستخدم وصلاحياته المرتبطة بمسماه الوظيفي.</p>
      </div>
    </div>`;
  document.getElementById("loginBtn").onclick = () => {
    const id = document.getElementById("loginUser").value;
    const u = users.find(x => x.id === id);
    setCurrentUser(u);
    location.hash = "#/dashboard";
    renderApp();
  };
}

/* ---------- الهيكل العام ---------- */
function renderApp() {
  const user = getCurrentUser();
  if (!user) { renderLogin(); return; }

  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="logo">ن ن</div>
          <div class="name">نهوض نجد للمقاولات<small>نظام إدارة المشاريع</small></div>
        </div>
        <nav class="sidebar-nav" id="sidebarNav"></nav>
        <div class="sidebar-footer">
          <div>${user.name}</div>
          <span class="role-badge">${user.role}</span>
          <div><span class="logout-btn" id="logoutBtn">تسجيل الخروج</span></div>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <h2 id="pageTitle">لوحة التحكم</h2>
          <div class="user-chip">
            <div class="avatar">${initials(user.name)}</div>
            <div>${user.name}<br><small class="text-muted">${user.role}</small></div>
          </div>
        </div>
        <div class="content" id="content"></div>
      </div>
    </div>`;

  document.getElementById("logoutBtn").onclick = () => {
    setCurrentUser(null);
    location.hash = "";
    renderLogin();
  };

  renderSidebar();
  router();
}

function renderSidebar() {
  const user = getCurrentUser();
  const nav = document.getElementById("sidebarNav");
  const currentRoute = (location.hash || "#/dashboard").replace("#/", "");

  let html = "";
  MENU.forEach(item => {
    if (item.children) {
      const visibleChildren = item.children.filter(c => canAccess(user.role, c.key));
      if (!visibleChildren.length) return;
      const isOpen = visibleChildren.some(c => c.key === currentRoute);
      html += `<div class="nav-group ${isOpen ? "open" : ""}">
        <div class="nav-link" data-group-toggle>
          <span class="ic">${item.icon}</span><span>${item.label}</span><span class="nav-caret">◀</span>
        </div>
        <div class="nav-sub">
          ${visibleChildren.map(c => `<div class="nav-link ${currentRoute === c.key ? "active" : ""}" data-route="${c.key}">${c.label}</div>`).join("")}
        </div>
      </div>`;
    } else {
      if (!canAccess(user.role, item.key)) return;
      html += `<div class="nav-link ${currentRoute === item.key ? "active" : ""}" data-route="${item.key}">
        <span class="ic">${item.icon}</span><span>${item.label}</span>
      </div>`;
    }
  });
  nav.innerHTML = html;

  nav.querySelectorAll("[data-route]").forEach(el => {
    el.onclick = () => { location.hash = "#/" + el.dataset.route; };
  });
  nav.querySelectorAll("[data-group-toggle]").forEach(el => {
    el.onclick = () => { el.parentElement.classList.toggle("open"); };
  });
}

function router() {
  const user = getCurrentUser();
  if (!user) { renderLogin(); return; }

  let route = (location.hash || "#/dashboard").replace("#/", "");
  if (!route) route = "dashboard";

  if (!canAccess(user.role, route)) {
    document.getElementById("content").innerHTML = `
      <div class="empty-state card"><div class="ic">🚫</div><h3>لا تملك صلاحية الوصول لهذه الصفحة</h3>
      <p>مسماك الوظيفي: <strong>${user.role}</strong></p></div>`;
    document.getElementById("pageTitle").textContent = "غير مصرح";
    return;
  }

  document.getElementById("pageTitle").textContent = PAGE_TITLES[route] || "نهوض نجد للمقاولات";
  renderSidebar();

  const renderers = {
    dashboard: renderDashboard,
    clients: renderClients,
    quotes: renderQuotes,
    visits: renderVisits,
    reports: renderReports,
    acc_projects: renderAccProjects,
    acc_general: renderAccGeneral,
    acc_vat: renderAccVat,
    contracts: renderContracts,
    settings: renderSettings,
  };

  const fn = renderers[route];
  if (fn) fn(document.getElementById("content"));
}

/* ---------- لوحة التحكم ---------- */
function renderDashboard(el) {
  const projects = dbGet("projects", []);
  const reports = dbGet("reports", []).slice().sort((a, b) => (b.date > a.date ? 1 : -1));
  const quotes = dbGet("quotes", []);
  const visits = dbGet("visits", []);

  const avgCompletion = projects.length ? Math.round(projects.reduce((s, p) => s + Number(p.completion || 0), 0) / projects.length) : 0;
  const openVisits = visits.filter(v => v.status !== "منتهية").length;

  el.innerHTML = `
    <div class="section-title-row">
      <div><h2>نظرة عامة</h2><p>ملخص أداء المشاريع والتقارير اليومية</p></div>
    </div>

    <div class="grid cols-4" style="margin-bottom:18px">
      <div class="stat-card"><div class="label">عدد المشاريع الجارية</div><div class="value">${projects.length}</div></div>
      <div class="stat-card"><div class="label">متوسط نسبة الإنجاز</div><div class="value success">${avgCompletion}%</div></div>
      <div class="stat-card"><div class="label">عروض أسعار محفوظة</div><div class="value">${quotes.length}</div></div>
      <div class="stat-card"><div class="label">زيارات مواقع مفتوحة</div><div class="value warning">${openVisits}</div></div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3>نسبة إنجاز المشاريع</h3>
        ${projects.length ? projects.map(p => `
          <div style="margin-bottom:14px">
            <div class="flex between" style="margin-bottom:6px">
              <div>
                <strong style="font-size:13px">${p.name}</strong>
                <div class="text-muted" style="font-size:11.5px">${p.location}</div>
              </div>
              <strong style="font-size:13px">${p.completion}%</strong>
            </div>
            <div class="progress-track"><div class="progress-fill ${p.completion >= 80 ? "success" : p.completion < 40 ? "warning" : ""}" style="width:${p.completion}%"></div></div>
          </div>`).join("") : `<div class="empty-state"><div class="ic">📁</div>لا توجد مشاريع بعد</div>`}
      </div>

      <div class="card">
        <h3>آخر التقارير اليومية المرفوعة من المشرفين</h3>
        ${reports.length ? reports.slice(0, 6).map(r => `
          <div class="timeline-item">
            <div class="dot"></div>
            <div class="body">
              <div class="meta">${fmtDate(r.date)} — ${r.supervisor} — ${r.projectName}</div>
              <div style="font-size:13px">نسبة الإنجاز: <strong>${r.progress}%</strong></div>
              <div class="text-muted" style="font-size:12px">${(r.notes || "").slice(0, 90)}${(r.notes || "").length > 90 ? "…" : ""}</div>
            </div>
          </div>`).join("") : `<div class="empty-state"><div class="ic">📋</div>لا توجد تقارير مرفوعة بعد</div>`}
      </div>
    </div>
  `;
}

/* ---------- بدء التشغيل ---------- */
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  seedIfEmpty();
  migrateClients();
  migratePriceCatalog();
  migrateProfitMargin();
  renderApp();
});
