"use strict";

(() => {
  const container = document.getElementById("appStatusV103");
  const offlineNotice = document.getElementById("offlineNoticeV103");
  const updateNotice = document.getElementById("updateNoticeV103");
  const updateButton = document.getElementById("applyUpdateV103");
  let refreshing = false;
  let waitingWorker = null;

  function syncConnectivity() {
    if (!offlineNotice) return;
    offlineNotice.hidden = navigator.onLine;
  }

  function revealUpdate(worker) {
    waitingWorker = worker;
    if (updateNotice) updateNotice.hidden = false;
  }

  function watchRegistration(registration) {
    if (registration.waiting) revealUpdate(registration.waiting);

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          revealUpdate(worker);
        }
      });
    });
  }

  window.addEventListener("online", syncConnectivity);
  window.addEventListener("offline", syncConnectivity);
  syncConnectivity();

  const isSecureContextForPwa = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!("serviceWorker" in navigator) || !isSecureContextForPwa) {
    if (container && !navigator.onLine) container.hidden = false;
    return;
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });

  updateButton?.addEventListener("click", () => {
    if (!waitingWorker) return;
    updateButton.disabled = true;
    updateButton.textContent = "Atualizando…";
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      watchRegistration(registration);
      await registration.update();
    } catch (error) {
      console.warn("[PWA] Não foi possível registrar o service worker.", error);
    }
  });
})();
