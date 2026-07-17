const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "static", "styles_v101_resilience.css"), "utf8");

test("V101 é carregada e identificada na interface", () => {
  assert.match(html, /styles_v101_resilience\.css\?v=10100/);
  assert.match(html, />V10[1-9]<\/span>/);
});

test("ações de navegação possuem tipo explícito e nomes acessíveis", () => {
  assert.match(html, /class="tab-btn active" type="button"/);
  assert.match(html, /id="prevPage" type="button"[^>]+aria-label=/);
  assert.match(html, /id="nextPage" type="button"[^>]+aria-label=/);
});

test("seções principais recebem nomes semânticos", () => {
  assert.match(html, /operations-grid-v991"[^>]+aria-label="Indicadores operacionais"/);
  assert.match(html, /executive-lower-v100"[^>]+aria-label="Análises executivas complementares"/);
  assert.match(html, /base-overview-v991"[^>]+aria-label="Resumo da base de tratativa"/);
});

test("camada V101 cobre mobile, contraste forçado e impressão", () => {
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /@media print/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /focus-visible/);
});
