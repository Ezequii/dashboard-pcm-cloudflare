"use strict";

const VERSION = "v123";
const SHELL_CACHE = `dashboard-pcm-${VERSION}-shell`;
// BUILD_PRECACHE: o build amplia esta lista com todos os recursos locais referenciados no HTML.
const SHELL = [
  "/",
  "/index.html",
  "/404.html",
  "/manifest.webmanifest",
  "/static/favicon.png",
  "/static/styles_v50_corrigido.css?v=9946",
  "/static/styles_v991_faithful.css?v=9946",
  "/static/styles_v992_polished.css?v=9946",
  "/static/styles_v99_productivity.css?v=9946",
  "/static/styles_v994a_hardening.css?v=9946",
  "/static/styles_v994a2_audit.css?v=9946",
  "/static/styles_v994a2_visual.css?v=12000",
  "/static/styles_v994a3_operational_fix.css?v=9946",
  "/static/styles_v994a4_top_base_flow.css?v=9946",
  "/static/styles_v994a5_lapidacao.css?v=9946",
  "/static/styles_v994a6_clean_rankings.css?v=9946",
  "/static/styles_v100_quick_filters.css?v=10002",
  "/static/styles_v100_empty_states.css?v=10020",
  "/static/styles_v100_global_context.css?v=10040",
  "/static/styles_v100_base_table.css?v=10050",
  "/static/styles_v100_executive_composed.css?v=10100",
  "/static/styles_v100_1_usability.css?v=10010",
  "/static/styles_v101_resilience.css?v=10100",
  "/static/styles_v102_delivery.css?v=10200",
  "/static/styles_v103_ops.css?v=10300",
  "/static/styles_v107_base_cleanup.css?v=10700",
  "/static/styles_v108_layout_flow.css?v=10800",
  "/static/styles_v109_professional_responsive.css?v=10900",
  "/static/styles_v110_header_kpi.css?v=12300",
  "/static/styles_v111_kpi_system.css?v=11100",
  "/static/styles_v112_kpi_refinement.css?v=11200",
  "/static/styles_v113_kpi_content_alignment.css?v=11300",
  "/static/styles_v115_context_base.css?v=11500",
  "/static/styles_v121_consolidated_preview.css?v=12100",
  "/static/logo_amaggi.png",
  "/static/js/app-config.js?v=12300",
  "/static/js/state.js?v=9946",
  "/static/js/utils.js?v=9946",
  "/static/js/security-v994a.js?v=9946",
  "/static/js/api.js?v=9946",
  "/static/js/filters.js?v=10040",
  "/static/js/dashboard.js?v=9946",
  "/static/js/table.js?v=10050",
  "/static/js/xlsx-v99.js?v=9946",
  "/static/js/productivity-v99.js?v=12000",
  "/static/js/core.js?v=12300",
  "/static/js/main.js?v=10200",
  "/static/js/pwa-v103.js?v=10300"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("dashboard-pcm-") && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || (await caches.match("/index.html")) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async (response) => {
    if (response?.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Dados operacionais nunca usam uma cópia silenciosamente desatualizada.
  if (url.pathname.startsWith("/static/data/") || url.pathname.startsWith("/static/config/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
