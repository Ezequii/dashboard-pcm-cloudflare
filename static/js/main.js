(async () => {
  "use strict";

  try {
    if (typeof window.init !== "function") {
      throw new Error("O módulo principal não foi carregado.");
    }
    await window.init();
  } catch (error) {
    console.error("Falha fatal ao iniciar o dashboard:", error);
    if (typeof window.PCM_RENDER_RUNTIME_ERROR === "function") {
      window.PCM_RENDER_RUNTIME_ERROR(error);
    }
    if (typeof window.showToast === "function") {
      window.showToast(error?.message || "Não foi possível iniciar o dashboard.", true);
    }
  }
})();
