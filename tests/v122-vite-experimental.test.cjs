const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const VITE_CONFIG = fs.readFileSync(path.join(ROOT, "vite.config.mjs"), "utf8");
const WRANGLER_VITE = fs.readFileSync(path.join(ROOT, "wrangler.vite.toml"), "utf8");
const PREPARE = fs.readFileSync(path.join(ROOT, "tools", "prepare-vite-public.cjs"), "utf8");
const POSTBUILD = fs.readFileSync(path.join(ROOT, "tools", "postbuild-vite.cjs"), "utf8");

test("V122 adota Vite e Cloudflare Vite plugin sem remover o pipeline legado", () => {
  assert.equal(PACKAGE.version, "122.0.0");
  assert.equal(PACKAGE.type, "module");
  assert.match(PACKAGE.devDependencies.vite, /^\^8\./);
  assert.ok(PACKAGE.devDependencies["@cloudflare/vite-plugin"]);
  assert.equal(PACKAGE.scripts["build:legacy"], "node tools/build-dist.cjs");
  assert.match(PACKAGE.scripts["build:vite"], /vite build/);
});

test("V122 usa staging pública isolada e não move os fontes originais", () => {
  assert.match(VITE_CONFIG, /publicDir:\s*"\.vite-public"/);
  assert.match(VITE_CONFIG, /outDir:\s*"dist-vite"/);
  assert.match(VITE_CONFIG, /cloudflare\(/);
  assert.match(VITE_CONFIG, /configPath:\s*"\.\/wrangler\.vite\.toml"/);
  assert.match(PREPARE, /ALLOWED_STATIC_EXTENSIONS/);
  assert.match(PREPARE, /FORBIDDEN_EXTENSIONS/);
});

test("V122 mantém a política 404 do Cloudflare no pipeline Vite", () => {
  assert.match(WRANGLER_VITE, /not_found_handling\s*=\s*"404-page"/);
  assert.match(WRANGLER_VITE, /compatibility_date\s*=\s*"2026-07-21"/);
});

test("V122 preserva scripts clássicos na mesma ordem nesta primeira fase", () => {
  const scripts = [...INDEX.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g)]
    .map((match) => match[1]);
  assert.deepEqual(scripts, [
    "/static/js/app-config.js?v=12200",
    "/static/js/state.js?v=9946",
    "/static/js/utils.js?v=9946",
    "/static/js/security-v994a.js?v=9946",
    "/static/js/api.js?v=9946",
    "/static/js/filters.js?v=10040",
    "/static/js/dashboard.js?v=9946",
    "/static/js/table.js?v=10050",
    "/static/js/xlsx-v99.js?v=9946",
    "/static/js/productivity-v99.js?v=12000",
    "/static/js/core.js?v=12200",
    "/static/js/main.js?v=10200",
    "/static/js/pwa-v103.js?v=10300",
  ]);
  assert.doesNotMatch(INDEX, /<script[^>]+type="module"[^>]+src="\/static\/js\//);
});

test("V122 pós-build preserva precache e manifesto de integridade", () => {
  assert.match(POSTBUILD, /expandServiceWorkerPrecache/);
  assert.match(POSTBUILD, /writeIntegrityManifest/);
  assert.match(POSTBUILD, /pipeline:\s*"vite"/);
  assert.match(POSTBUILD, /build-manifest\.json/);
});

test("V122 mantém versão, token e service worker sincronizados", () => {
  const appConfig = fs.readFileSync(path.join(ROOT, "static", "js", "app-config.js"), "utf8");
  const core = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

  assert.match(INDEX, />V122<\/span>/);
  assert.match(INDEX, /app-config\.js\?v=12200/);
  assert.match(INDEX, /core\.js\?v=12200/);
  assert.match(appConfig, /version: "122\.0\.0"/);
  assert.match(appConfig, /assetVersion: "12200"/);
  assert.match(core, /!== "12200"/);
  assert.match(sw, /const VERSION = "v122"/);
});
