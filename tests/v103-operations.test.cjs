"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V103 registra o PWA por arquivo externo compatível com CSP", () => {
  const html = read("index.html");
  assert.match(html, /static\/js\/pwa-v103\.js/);
  assert.doesNotMatch(html, /<script>\s*if \("serviceWorker"/);
});

test("V103 oferece avisos acessíveis de conexão e atualização", () => {
  const html = read("index.html");
  assert.match(html, /id="offlineNoticeV103"/);
  assert.match(html, /id="updateNoticeV103"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="applyUpdateV103"[^>]*type="button"/);
});

test("V103 não usa cache silencioso para dados operacionais", () => {
  const sw = read("sw.js");
  assert.match(sw, /pathname\.startsWith\("\/static\/data\/"\)/);
  assert.match(sw, /event\.respondWith\(fetch\(request\)\)/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(sw, /networkFirst/);
});

test("build inclui os novos artefatos operacionais da V103", () => {
  const build = read("tools/build-dist.cjs");
  assert.match(build, /static/);
  assert.match(read("static/js/pwa-v103.js"), /registration\.update/);
  assert.match(read("static/styles_v103_ops.css"), /app-status-v103/);
});
