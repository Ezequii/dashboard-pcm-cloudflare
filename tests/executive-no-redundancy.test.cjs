const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v100_executive_no_redundancy.css"),
  "utf8"
);

test("mantém marca e título do produto", () => {
  assert.match(INDEX, /logo_amaggi\.png/);
  assert.match(INDEX, /Controle de Requisições PCM/);
});

test("integra filtros ao contexto sem duplicar IDs", () => {
  assert.equal((INDEX.match(/id="mainFilters"/g) || []).length, 1);
  assert.equal((INDEX.match(/id="btnOpenFilters"/g) || []).length, 1);
  assert.match(
    INDEX,
    /id="globalContextBar"[\s\S]*id="mainFilters"[\s\S]*id="globalContextClearAll"/
  );
});

test("mantém atalhos no DOM e os oculta somente na visão executiva", () => {
  assert.match(INDEX, /id="quickChips"/);
  assert.match(
    CSS,
    /active-tab-visao\s+#quickChips\s*\{[\s\S]*display:\s*none\s*!important/
  );
});

test("evita repetição executiva e promove a pendência mais antiga", () => {
  assert.match(
    INDEX,
    /class="executive-primary-v991"[\s\S]*id="kpiMaisParadoCard"[\s\S]*<\/section>/
  );
  assert.match(
    CSS,
    /\.executive-alerts-v991\s*\{[\s\S]*display:\s*none\s*!important/
  );
});

test("organiza fila e rankings na mesma região inferior", () => {
  assert.match(
    INDEX,
    /class="executive-lower-v100"[\s\S]*class="operations-panel-v991 queue-panel-v991"[\s\S]*class="ranking-grid-v991 ranking-grid-v994a6"/
  );
  assert.match(
    CSS,
    /\.executive-lower-v100\s*\{[\s\S]*grid-template-columns:/
  );
});

test("folha nova é carregada por último", () => {
  assert.match(
    INDEX,
    /styles_v100_executive_decision\.css\?v=10070" \/\>\s*<link rel="stylesheet" href="\/static\/styles_v100_executive_no_redundancy\.css\?v=10080"/
  );
});
