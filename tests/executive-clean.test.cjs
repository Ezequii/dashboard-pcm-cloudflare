const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v100_executive_clean.css"),
  "utf8"
);

test("carrega somente a camada executiva consolidada", () => {
  assert.match(INDEX, /styles_v100_executive_clean\.css\?v=10200/);
  assert.doesNotMatch(INDEX, /styles_v100_executive_(?:composed|decision|final_polish|no_redundancy)\.css/);
  assert.match(INDEX, /v100-executive-clean/);
});

test("preserva marca, título e navegação", () => {
  assert.match(INDEX, /logo_amaggi\.png/);
  assert.match(INDEX, /Controle de Requisições PCM/);
  assert.match(INDEX, /data-tab="visao"/);
  assert.match(INDEX, /data-tab="base"/);
});

test("não usa altura fixa nem corte nos KPIs executivos", () => {
  const block = CSS.match(/\.executive-primary-v991 > button\s*\{([\s\S]*?)\n\}/);
  assert.ok(block);
  assert.match(block[1], /height:\s*auto/);
  assert.match(block[1], /overflow:\s*visible/);
  assert.doesNotMatch(block[1], /overflow:\s*hidden/);
});

test("remove o botão visual de filtros somente na visão executiva", () => {
  assert.match(
    CSS,
    /\.active-tab-visao \.filters-summary-button-v97\s*\{[\s\S]*display:\s*none/
  );
});

test("apresenta pipeline compacto sem cards visuais", () => {
  assert.match(CSS, /\.process-flow-v991::before/);
  assert.match(
    CSS,
    /\.process-card\s*\{[\s\S]*border:\s*0[\s\S]*background:\s*transparent/
  );
  assert.match(CSS, /\.process-foot\s*\{[\s\S]*display:\s*none/);
});

test("mantém três linhas de ranking sem clipping", () => {
  assert.match(CSS, /\.ranking-list-v991\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(CSS, /\.ranking-row-v88\s*\{[\s\S]*min-height:\s*55px/);
  assert.match(CSS, /\.ranking-grid-v991\s*\{[\s\S]*grid-template-columns:\s*repeat\(2/);
});

test("preserva foco visível e redução de movimento", () => {
  assert.match(CSS, /:focus-visible\s*\{[\s\S]*outline:\s*3px/);
  assert.match(CSS, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
