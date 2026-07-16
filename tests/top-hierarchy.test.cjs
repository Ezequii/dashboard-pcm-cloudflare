const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v100_top_hierarchy.css"),
  "utf8"
);

test("marca e título da AMAGGI permanecem no topo", () => {
  assert.match(INDEX, /<img src="\/static\/logo_amaggi\.png" alt="AMAGGI"\s*\/>/);
  assert.match(INDEX, /<h1>Controle de Requisições PCM<\/h1>/);
});

test("contexto global antecede os atalhos de visão", () => {
  const contextIndex = INDEX.indexOf('id="globalContextBar"');
  const quickIndex = INDEX.indexOf('id="quickChips"');
  assert.ok(contextIndex >= 0);
  assert.ok(quickIndex >= 0);
  assert.ok(contextIndex < quickIndex);
});

test("folha de estilo e classe da hierarquia do topo estão ativas", () => {
  assert.match(INDEX, /styles_v100_top_hierarchy\.css\?v=10060/);
  assert.match(INDEX, /<body class="[^"]*\bv100-top-hierarchy\b/);
});

test("contexto recebe hierarquia dominante e atalhos permanecem compactos", () => {
  assert.match(CSS, /\.global-context-v100\s*\{[\s\S]*border-left:\s*5px solid/);
  assert.match(CSS, /\.global-context-v100::before\s*\{[\s\S]*content:\s*"Contexto atual"/);
  assert.match(CSS, /\.quick-filter-heading-v100 span\s*\{[\s\S]*display:\s*none/);
});

test("foco do botão Limpar tudo permanece visível", () => {
  assert.match(
    CSS,
    /\.global-context-clear-v100:focus-visible\s*\{[\s\S]*outline:\s*3px solid #1d4ed8/
  );
});
