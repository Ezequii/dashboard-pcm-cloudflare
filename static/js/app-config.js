(() => {
  "use strict";

  const deepFreeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return Object.freeze(value);
  };

  const businessRules = deepFreeze({
    aging: {
      attention: 15,
      high: 16,
      critical: 30,
      severe: 60
    },
    targets: {
      completionPercent: 95,
      maxPcmQueue: 40
    },
    priorityWeights: {
      stage: 0.60,
      age: 0.20,
      value: 0.15,
      quantity: 0.05
    },
    slaByStage: {
      "SEM LANÇAMENTO": {
        attention: 3,
        critical: 5
      },
      "SEM PEDIDO": {
        attention: 5,
        critical: 8
      },
      "SEM NF": {
        attention: 8,
        critical: 11
      }
    }
  });

  const appConfig = deepFreeze({
    appName: "Controle de Requisições PCM",
    version: "98",
    assetVersion: "98",
    dataVersionUrl: "/static/data/version.json",
    dataUrl: "/static/data/dashboard-data.json",
    updateCheckIntervalMs: 300000
  });

  // Propriedades do objeto global ficam disponíveis tanto como
  // window.BUSINESS_RULES quanto como BUSINESS_RULES em scripts clássicos.
  if (!window.BUSINESS_RULES) window.BUSINESS_RULES = businessRules;
  if (!window.PCM_APP_CONFIG) window.PCM_APP_CONFIG = appConfig;
  window.PCM_APP_VERSION = appConfig.version;

  const describeRuntimeError = (reason) => {
    if (reason instanceof Error) return reason.message || reason.name;
    if (typeof reason === "string") return reason;
    try {
      return JSON.stringify(reason);
    } catch (_) {
      return "Erro inesperado durante o carregamento.";
    }
  };

  const renderRuntimeError = (reason) => {
    const message = describeRuntimeError(reason);
    const apply = () => {
      document.body?.classList.remove("app-booting");
      document.body?.classList.add("app-error");

      const banner = document.getElementById("dataStatusBanner");
      const title = document.getElementById("dataStatusTitle");
      const detail = document.getElementById("dataStatusMessage");
      const retry = document.getElementById("btnRetryData");

      if (banner) {
        banner.hidden = false;
        banner.className = "data-status-banner-v97 no-print tone-error";
      }
      if (title) title.textContent = "Não foi possível iniciar o dashboard";
      if (detail) detail.textContent = message;
      if (retry && retry.dataset.bootRecoveryBound !== "1") {
        retry.dataset.bootRecoveryBound = "1";
        retry.addEventListener("click", () => window.location.reload());
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    } else {
      apply();
    }
  };

  window.PCM_RENDER_RUNTIME_ERROR = renderRuntimeError;

  window.addEventListener("error", (event) => {
    const filename = String(event.filename || "");
    if (filename.includes("/static/js/") || /BUSINESS_RULES|PCM_APP_CONFIG/.test(String(event.message || ""))) {
      renderRuntimeError(event.error || event.message);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    renderRuntimeError(event.reason);
  });
})();
