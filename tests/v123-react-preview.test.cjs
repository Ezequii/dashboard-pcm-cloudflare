const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const PREVIEW = fs.readFileSync(path.join(ROOT, "preview-v123.html"), "utf8");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const VITE_CONFIG = fs.readFileSync(path.join(ROOT, "vite.config.mjs"), "utf8");
const PREPARE = fs.readFileSync(path.join(ROOT, "tools", "prepare-vite-public.cjs"), "utf8");
const POSTBUILD = fs.readFileSync(path.join(ROOT, "tools", "postbuild-vite.cjs"), "utf8");
const APP = fs.readFileSync(path.join(ROOT, "src-v123", "App.tsx"), "utf8");
const DRAWER = fs.readFileSync(path.join(ROOT, "src-v123", "components", "DetailDrawer.tsx"), "utf8");
const DATA = fs.readFileSync(path.join(ROOT, "src-v123", "lib", "data.ts"), "utf8");

test("V123 mantém o pipeline Vite para Cloudflare Pages e adiciona React como prévia paralela", () => {
  assert.equal(PACKAGE.version, "123.0.0");
  assert.equal(PACKAGE.type, "module");
  assert.match(PACKAGE.devDependencies.vite, /^\^8\./);
  assert.equal(PACKAGE.devDependencies["@cloudflare/vite-plugin"], undefined);
  assert.ok(PACKAGE.devDependencies["@vitejs/plugin-react"]);
  assert.equal(PACKAGE.devDependencies.wrangler, undefined);
  assert.equal(PACKAGE.dependencies.react, "18.3.1");
  assert.equal(PACKAGE.dependencies["react-dom"], "18.3.1");
  assert.equal(PACKAGE.scripts["build:legacy"], "node tools/build-dist.cjs");
  assert.match(PACKAGE.scripts["build:vite"], /vite build/);
});

test("V123 mantém staging pública isolada e build multipágina", () => {
  assert.match(VITE_CONFIG, /publicDir:\s*"\.vite-public"/);
  assert.match(VITE_CONFIG, /outDir:\s*"dist-vite"/);
  assert.match(VITE_CONFIG, /react\(\)/);
  assert.doesNotMatch(VITE_CONFIG, /@cloudflare\/vite-plugin|cloudflare\(/);
  assert.match(VITE_CONFIG, /preview-v123\.html/);
  assert.match(PREPARE, /ALLOWED_STATIC_EXTENSIONS/);
  assert.match(PREPARE, /FORBIDDEN_EXTENSIONS/);
});

test("V123 Pages não exige runtime Workers no build Vite", () => {
  assert.doesNotMatch(VITE_CONFIG, /@cloudflare\/vite-plugin|cloudflare\(/);
  assert.doesNotMatch(POSTBUILD, /makeWranglerConfigPortable/);
  assert.equal(PACKAGE.devDependencies["@cloudflare/vite-plugin"], undefined);
  assert.equal(PACKAGE.devDependencies.wrangler, undefined);
});

test("V123 preserva scripts clássicos do dashboard legado na mesma ordem", () => {
  const scripts = [...INDEX.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g)]
    .map((match) => match[1]);
  assert.deepEqual(scripts, [
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
    "/static/js/pwa-v103.js?v=10300",
  ]);
  assert.doesNotMatch(INDEX, /src="\/src-v123\//);
});

test("V123 expõe a prévia React em HTML separado sem substituir a produção", () => {
  assert.match(PREVIEW, /id="root"/);
  assert.match(PREVIEW, /src="\/src-v123\/main\.tsx"/);
  assert.match(APP, /Arquitetura visual experimental/);
  assert.match(APP, /loadDashboardData/);
  assert.match(APP, /Visão Executiva/);
  assert.match(APP, /Base de Tratativa/);
});

test("V123 drawer React mantém os oito campos prioritários definidos na V120", () => {
  [
    "DATA DE RECEBIMENTO",
    "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA",
    "SOLICITANTE",
    "PREFIXO",
    "FORNECEDOR",
    "Nº ORÇAMENTO FINAL",
    "ETAPA",
  ].forEach((field) => assert.match(DRAWER, new RegExp(field)));
  assert.match(DRAWER, /is-priority/);
});


test("V123 React preserva validação fail-closed do Cloudflare Access antes dos dados", () => {
  assert.match(DATA, /security-config\.json/);
  assert.match(DATA, /identityEndpoint/);
  assert.match(DATA, /failClosed/);
  assert.match(DATA, /await verifyCorporateAccess\(\)/);
  assert.match(DATA, /allowedRoles/);
});

test("V123 pós-build preserva precache e manifesto de integridade", () => {
  assert.match(POSTBUILD, /expandServiceWorkerPrecache/);
  assert.match(POSTBUILD, /writeIntegrityManifest/);
  assert.match(POSTBUILD, /pipeline:\s*"vite"/);
  assert.match(POSTBUILD, /build-manifest\.json/);
});

test("V123 mantém versão, token e service worker sincronizados", () => {
  const appConfig = fs.readFileSync(path.join(ROOT, "static", "js", "app-config.js"), "utf8");
  const core = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

  assert.match(INDEX, />V123<\/span>/);
  assert.match(INDEX, /app-config\.js\?v=12300/);
  assert.match(INDEX, /core\.js\?v=12300/);
  assert.match(appConfig, /version: "123\.0\.0"/);
  assert.match(appConfig, /assetVersion: "12300"/);
  assert.match(core, /!== "12300"/);
  assert.match(sw, /const VERSION = "v123"/);
});
