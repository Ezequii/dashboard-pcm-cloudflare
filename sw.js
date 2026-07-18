"use strict";

const VERSION = "v119";
const SHELL_CACHE = `dashboard-pcm-${VERSION}-shell`;
// BUILD_PRECACHE: o build amplia esta lista com todos os recursos locais referenciados no HTML.
const SHELL = [
  "/",
  "/index.html",
  "/404.html",
  "/manifest.webmanifest",
  "/static/favicon.png",
  "/static/logo_amaggi.png",
  "/static/styles_v103_ops.css",
  "/static/js/pwa-v103.js"
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
