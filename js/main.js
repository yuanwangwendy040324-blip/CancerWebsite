// ===== State =====
let currentLang = "zh";
const chartRows = {}; // containerId -> [{ row, labelEl, valueEl, item }]

// ===== Bar chart construction (language-agnostic widths, language-aware text) =====
function resolveLabel(item, lang) {
  if (item.key) return I18N[lang][item.key] || item.key;
  if (item.label) return item.label[lang] || item.label.zh;
  return "";
}

function resolveDisplay(item, lang) {
  if (item.display) return item.display[lang] || item.display.zh;
  return String(item.value);
}

function buildBarChart(containerId, config) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const max = Math.max(...config.items.map((d) => d.value));
  const rows = [];

  config.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row" + (item.highlight ? " is-highlight" : "");

    const label = document.createElement("span");
    label.className = "bar-label";

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    const pct = max > 0 ? (item.value / max) * 100 : 0;
    fill.dataset.target = pct.toFixed(2) + "%";
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "bar-value";

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    container.appendChild(row);

    rows.push({ row, labelEl: label, valueEl: value, item });
  });

  chartRows[containerId] = rows;
}

function updateChartText(lang) {
  Object.values(chartRows).forEach((rows) => {
    rows.forEach(({ labelEl, valueEl, item }) => {
      labelEl.textContent = resolveLabel(item, lang);
      valueEl.textContent = resolveDisplay(item, lang);
    });
  });
}

function initBarCharts() {
  Object.entries(CHART_I18N).forEach(([id, config]) => buildBarChart(id, config));
  updateChartText(currentLang);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll(".bar-fill").forEach((fill) => {
          fill.style.width = fill.dataset.target;
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.25 }
  );

  document.querySelectorAll(".bar-chart").forEach((el) => observer.observe(el));
}

// ===== i18n =====
function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = I18N[lang][key];
    if (text === undefined) return;

    const attr = el.getAttribute("data-i18n-attr");
    if (attr) {
      el.setAttribute(attr, text);
    } else {
      el.innerHTML = text;
    }
  });

  updateChartText(lang);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  if (typeof chatRenderStarters === "function") chatRenderStarters();

  try {
    localStorage.setItem("cancerSiteLang", lang);
  } catch (e) {}
}

function initLangToggle() {
  const toggle = document.getElementById("langToggle");
  if (!toggle) return;

  toggle.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
  });

  let saved = "zh";
  try {
    saved = localStorage.getItem("cancerSiteLang") || "zh";
  } catch (e) {}
  applyLanguage(saved);
}

// ===== Tabs =====
function initTabs() {
  const tabsRoot = document.getElementById("drugTabs");
  if (!tabsRoot) return;

  const buttons = tabsRoot.querySelectorAll(".tab-btn");
  const panels = tabsRoot.querySelectorAll(".tab-panel");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === target));
    });
  });
}

// ===== Mobile nav toggle =====
function initNavToggle() {
  const toggle = document.getElementById("navToggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => nav.classList.remove("open"))
  );
}

// ===== Section progress dots + active nav highlighting =====
function initSectionTracking() {
  const sectionIds = ["hero", "incidence", "survival", "drugs", "market", "sources", "pageFooter"];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  const dots = document.querySelectorAll(".progress-dots .dot");
  const navLinks = document.querySelectorAll(".main-nav a");

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const target = document.getElementById(dot.dataset.target);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;

        dots.forEach((dot) => dot.classList.toggle("active", dot.dataset.target === id));

        navLinks.forEach((link) =>
          link.classList.toggle("active", link.getAttribute("href") === "#" + id)
        );
      });
    },
    { threshold: 0.6 }
  );

  sections.forEach((section) => observer.observe(section));
}

document.addEventListener("DOMContentLoaded", () => {
  initBarCharts();
  initLangToggle();
  initTabs();
  initNavToggle();
  initSectionTracking();
});
