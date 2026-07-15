(() => {
  "use strict";

  const STORAGE_KEY = "pcm-dashboard-ui-v2";
  const tableWrap = document.querySelector(".table-wrap");

  function readPreferences() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writePreferences(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The UI remains fully functional when storage is unavailable.
    }
  }

  function setDensity(density) {
    const safeDensity = density === "compact" ? "compact" : "comfortable";
    if (tableWrap) tableWrap.dataset.density = safeDensity;

    document.querySelectorAll(".density-btn-v2").forEach(button => {
      const active = button.dataset.density === safeDensity;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    writePreferences({ ...readPreferences(), density: safeDensity });
  }

  function initDensity() {
    const preference = readPreferences().density || "comfortable";
    setDensity(preference);
    document.querySelectorAll(".density-btn-v2").forEach(button => {
      button.addEventListener("click", () => setDensity(button.dataset.density));
    });
  }

  function groupForField(label) {
    const normalized = String(label || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    if (/DATA|DIAS|RECEB|LANC|PEDIDO|NF|DANFE/.test(normalized)) return "Cronologia e documentos";
    if (/VALOR|MOEDA|CUSTO/.test(normalized)) return "Dados financeiros";
    if (/FORNECEDOR|SOLICITANTE|RESPONS|PCM|AREA|DONO/.test(normalized)) return "Responsáveis e partes";
    if (/ORC|OS|ORDEM|EQUIP|PREFIXO|ETAPA|STATUS/.test(normalized)) return "Identificação e status";
    return "Informações complementares";
  }

  function enhanceDetails() {
    const host = document.getElementById("detailsContentV99");
    if (!host || host.dataset.uiV2Enhanced === "true") return;

    const fields = Array.from(host.children).filter(element =>
      element.classList.contains("detail-field-v99")
    );
    if (!fields.length) return;

    const groups = new Map();
    fields.forEach(field => {
      const label = field.querySelector("span")?.textContent || "";
      const group = groupForField(label);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(field);
    });

    host.textContent = "";
    groups.forEach((items, title) => {
      const details = document.createElement("details");
      details.className = "detail-accordion-v2 ui-v2-fade";
      details.open = title === "Identificação e status" || title === "Cronologia e documentos";

      const summary = document.createElement("summary");
      summary.textContent = title;
      const body = document.createElement("div");
      body.className = "detail-accordion-body-v2";
      items.forEach(item => body.appendChild(item));

      details.append(summary, body);
      host.appendChild(details);
    });

    host.dataset.uiV2Enhanced = "true";
  }

  function observeDetails() {
    const host = document.getElementById("detailsContentV99");
    if (!host) return;

    const observer = new MutationObserver(() => {
      if (host.querySelector(":scope > .detail-field-v99")) {
        delete host.dataset.uiV2Enhanced;
        requestAnimationFrame(enhanceDetails);
      }
    });
    observer.observe(host, { childList: true });
  }

  function animateMetric(element) {
    const text = element.textContent?.trim() || "";
    const match = text.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
    if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = Number(match[1].replace(".", "").replace(",", "."));
    if (!Number.isFinite(target) || target <= 0 || target > 100000) return;

    const suffix = match[2];
    const duration = 420;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      element.textContent = `${Math.round(current).toLocaleString("pt-BR")}${suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
      else element.textContent = text;
    }
    requestAnimationFrame(frame);
  }

  function observeMetrics() {
    const ids = ["kPendencias", "kPctConcluido", "kFarolStatus"];
    ids.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      let previous = element.textContent;
      new MutationObserver(() => {
        if (element.textContent !== previous) {
          previous = element.textContent;
          animateMetric(element);
        }
      }).observe(element, { childList: true, characterData: true, subtree: true });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initDensity();
    observeDetails();
    observeMetrics();
    document.querySelectorAll("main > section").forEach(section =>
      section.classList.add("ui-v2-fade")
    );
  });
})();
