const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const HTML_404 = fs.readFileSync(path.join(ROOT, "404.html"), "utf8");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const APP_CONFIG = fs.readFileSync(path.join(ROOT, "static", "js", "app-config.js"), "utf8");
const CORE = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
const SW = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const AUDIT = fs.readFileSync(path.join(ROOT, "tools", "audit-project.cjs"), "utf8");

function localRefs(source) {
  return new Set(
    [...source.matchAll(/\b(?:src|href)="([^"]+)"/g)]
      .map(match => match[1].split(/[?#]/)[0].replace(/^\/+/, ""))
      .filter(Boolean)
  );
}

function listFiles(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === extension)
    .map(entry => entry.name)
    .sort();
}

test("V116+ mantém versão, runtime e service worker sincronizados", () => {
  const [major] = String(PACKAGE.version).split(".");
  const assetVersion = `${major}00`;
  assert.ok(Number(major) >= 116);
  assert.match(INDEX, new RegExp(`>V${major}<\\/span>`));
  assert.match(INDEX, new RegExp(`app-config\\.js\\?v=${assetVersion}`));
  assert.match(INDEX, new RegExp(`core\\.js\\?v=${assetVersion}`));
  assert.match(APP_CONFIG, new RegExp(`version:\\s*"${major}\\.0\\.0"`));
  assert.match(APP_CONFIG, new RegExp(`assetVersion:\\s*"${assetVersion}"`));
  assert.match(CORE, new RegExp(`assetVersion \\|\\| ""\\) !== "${assetVersion}"`));
  assert.match(SW, new RegExp(`const VERSION = "v${major}"`));
});

test("todo CSS e JavaScript ativo está ligado ao HTML publicado", () => {
  const refs = new Set([...localRefs(INDEX), ...localRefs(HTML_404)]);
  const css = listFiles(path.join(ROOT, "static"), ".css")
    .map(name => `static/${name}`);
  const js = listFiles(path.join(ROOT, "static", "js"), ".js")
    .map(name => `static/js/${name}`);

  assert.deepEqual(css.filter(file => !refs.has(file)), []);
  assert.deepEqual(js.filter(file => !refs.has(file)), []);
});

test("componentes removidos não deixam vínculos mortos no HTML ou JavaScript", () => {
  const scripts = listFiles(path.join(ROOT, "static", "js"), ".js")
    .map(name => fs.readFileSync(path.join(ROOT, "static", "js", name), "utf8"))
    .join("\n");
  const activeSource = `${INDEX}\n${scripts}`;
  for (const marker of [
    "filterDrawer",
    "btnOpenFilters",
    "btnExportMenu",
    "exportDropdown",
    "btnUploadWorkbook",
    "workbookUpload",
    "processCardsBase",
    "getSelectedRowsCountV100",
  ]) {
    assert.doesNotMatch(activeSource, new RegExp(marker));
  }
});

test("funções mortas confirmadas não retornam ao runtime", () => {
  const scripts = listFiles(path.join(ROOT, "static", "js"), ".js")
    .map(name => fs.readFileSync(path.join(ROOT, "static", "js", name), "utf8"))
    .join("\n");
  for (const functionName of [
    "renderFarol",
    "renderExecutiveComment",
    "renderActionNow",
    "renderTopPriorities",
    "renderOwners",
    "renderInsights",
    "renderBaseStagesV991",
    "exportFile",
    "uploadWorkbook",
    "clearFilterEntry",
    "filterContextDescription",
  ]) {
    assert.doesNotMatch(
      scripts,
      new RegExp(`function\\s+${functionName}\\s*\\(`)
    );
  }
});

test("CSS legado fica fora de static e preservado no arquivo histórico", () => {
  const archive = path.join(ROOT, "archive", "legacy-css-v115");
  const archivedCss = listFiles(archive, ".css");
  assert.deepEqual(archivedCss, [
    "styles.css",
    "styles_v100_executive_decision.css",
    "styles_v100_executive_final_polish.css",
    "styles_v100_executive_no_redundancy.css",
    "styles_v100_top_hierarchy.css",
    "styles_v114_context_base.css",
    "styles_v985_integrated.css",
  ]);
  assert.ok(fs.existsSync(path.join(archive, "README.md")));
});

test("auditoria bloqueia ativos órfãos, IDs inexistentes e resíduos removidos", () => {
  assert.match(AUDIT, /Ativo órfão fora do arquivo histórico/);
  assert.match(AUDIT, /Referência a ID inexistente/);
  assert.match(AUDIT, /Resíduo de interface removida/);
});
