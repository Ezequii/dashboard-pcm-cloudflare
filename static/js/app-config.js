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
      maxPcmQueue: 40,
      maxCriticalQueue: 10
    },
    priorityWeights: {
      stage: 0.60,
      age: 0.20,
      value: 0.15,
      quantity: 0.05
    },
    slaByStage: {
      "SEM LANÇAMENTO": { attention: 3, critical: 5 },
      "SEM PEDIDO": { attention: 5, critical: 8 },
      "SEM NF": { attention: 8, critical: 11 }
    }
  });

  const appConfig = deepFreeze({
    appName: "Controle de Requisições PCM",
    version: "112.0.0",
    assetVersion: "11200",
    dataFiles: {
      executive: "/static/data/executive-data.json",
      operational: "/static/data/operational-data.json",
      version: "/static/data/version.json",
      publicationStatus: "/static/data/publication-status.json"
    },
    configFiles: {
      security: "/static/config/security-config.json",
      businessRules: "/static/config/business-rules.json"
    },
    runtime: {
      updateCheckIntervalMs: 300000,
      requestTimeoutMs: 30000,
      maxJsonPayloadBytes: 12582912,
      maxExecutiveRowsInMemory: 10000,
      maxOperationalRowsInMemory: 25000,
      preserveLastValidData: true
    },
    security: {
      environment: "production",
      accessRequired: true,
      dataClassification: "interno",
      allowedRoles: ["viewer", "leadership", "admin"],
      defaultRole: "viewer",
      showOriginalFilename: false,
      failClosed: true
    }
  });

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
      const errorTime = document.getElementById("dataErrorTimeV994a");
      const retry = document.getElementById("btnRetryData");

      if (banner) {
        banner.hidden = false;
        banner.className = "data-status-banner-v97 no-print tone-error";
      }
      if (title) title.textContent = "Não foi possível iniciar o dashboard";
      if (detail) detail.textContent = message;
      if (errorTime) {
        errorTime.textContent = `Falha registrada em ${new Date().toLocaleString("pt-BR")}`;
      }
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
    if (
      filename.includes("/static/js/")
      || /BUSINESS_RULES|PCM_APP_CONFIG/.test(String(event.message || ""))
    ) {
      renderRuntimeError(event.error || event.message);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    renderRuntimeError(event.reason);
  });
})();
