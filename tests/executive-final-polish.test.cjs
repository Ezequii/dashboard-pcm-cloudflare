const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v100_executive_final_polish.css"),
  "utf8"
);

test("carrega o acabamento final após as camadas executivas anteriores", () => {
  assert.match(
    INDEX,
    /styles_v100_executive_no_redundancy\.css\?v=10080"[\s\S]*styles_v100_executive_final_polish\.css\?v=10090"/
  );
  assert.match(INDEX, /v100-executive-final-polish/);
});

test("fila prioritária foi movida para o núcleo visual ao lado do fluxo", () => {
  const operations = INDEX.match(
    /<section class="operations-grid-v991"[\s\S]*?<\/section>/
  )?.[0] || "";
  assert.match(operations, /flow-panel-v991/);
  assert.match(operations, /queue-panel-v991/);
  assert.equal((INDEX.match(/queue-panel-v991/g) || []).length, 1);
});

test("fluxo compacto oculta apenas a média e preserva etapa, métricas e status", () => {
  assert.match(CSS, /\.flow-average-v994a2\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.match(CSS, /\.flow-main-metrics-v994a2\s*\{/);
  assert.match(CSS, /\.flow-context-v994a2\s*\{/);
  assert.match(CSS, /\.flow-step-v994a2 mark\s*\{/);
});

test("rankings permanecem em duas colunas e fila ganha protagonismo", () => {
  assert.match(
    CSS,
    /\.executive-lower-v100 > \.ranking-grid-v991\s*\{[\s\S]*grid-template-columns:\s*1fr 1fr/
  );
  assert.match(
    CSS,
    /\.operations-grid-v991\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.55fr\)\s+minmax\(300px,\s*\.85fr\)/
  );
});

test("preserva foco visível e reduced motion", () => {
  assert.match(CSS, /outline:\s*3px solid #1d4ed8\s*!important/);
  assert.match(CSS, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(CSS, /transition:\s*none\s*!important/);
});
