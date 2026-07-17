const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "static", "styles_v101_resilience.css"), "utf8");

test("V101 é carregada e preservada nas versões posteriores", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const major = Number(String(pkg.version).split(".")[0]);
  assert.ok(major >= 101);
  assert.match(html, /styles_v101_resilience\.css\?v=10100/);
  assert.match(html, new RegExp(`>V${major}<\\/span>`));
});

test("ações de navegação possuem tipo explícito e nomes acessíveis", () => {
  assert.match(html, /class="tab-btn active" type="button"/);
  assert.match(html, /id="prevPage" type="button"[^>]+aria-label=/);
  assert.match(html, /id="nextPage" type="button"[^>]+aria-label=/);
});

test("seções principais recebem nomes semânticos", () => {
  assert.match(html, /operations-grid-v991"[^>]+aria-label="Indicadores operacionais"/);
  assert.match(html, /executive-lower-v100"[^>]+aria-label="Análises executivas complementares"/);
  assert.match(html, /id="baseTableRegion"[^>]+aria-labelledby="basePanelTitle"/);
});

test("camada V101 cobre mobile, contraste forçado e impressão", () => {
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /@media print/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /focus-visible/);
});
