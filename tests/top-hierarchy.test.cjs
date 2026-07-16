const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "static", "styles_v100_executive_composed.css"), "utf8");

test("logo e título permanecem no cabeçalho consolidado", () => {
  assert.match(INDEX, /logo_amaggi\.png/);
  assert.match(INDEX, /Controle de Requisições PCM/);
});

test("cabeçalho não sobrepõe o conteúdo ao rolar", () => {
  assert.match(CSS, /\.topbar-v994a4\s*\{[\s\S]*position:\s*relative\s*!important[\s\S]*top:\s*auto\s*!important/);
});

test("contexto e filtros formam uma única composição compacta", () => {
  assert.match(CSS, /\.global-context-v100\s*\{[\s\S]*grid-template-areas:/);
  assert.match(CSS, /\.global-context-v100 \.filters-row-v994a4\s*\{[\s\S]*grid-area:\s*filters/);
});

test("foco de ações principais permanece visível", () => {
  assert.match(CSS, /focus-visible[\s\S]*outline:\s*3px\s+solid\s+#1d4ed8/);
});
