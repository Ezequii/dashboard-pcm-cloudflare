const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const PRODUCTIVITY = fs.readFileSync(
  path.join(ROOT, "static", "js", "productivity-v99.js"),
  "utf8"
);
const PREVIEW_CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v119_drawer_priority_preview.css"),
  "utf8"
);
const PACKAGE = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
);

test("V119 experimental marca semanticamente apenas os campos prioritários do drawer", () => {
  for (const field of [
    "DATA DE RECEBIMENTO",
    "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA",
    "SOLICITANTE",
    "PREFIXO",
  ]) {
    assert.match(PRODUCTIVITY, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(PRODUCTIVITY, /PRIORITY_DETAIL_FIELDS_V119/);
  assert.match(PRODUCTIVITY, /data-detail-priority="true"/);
  assert.match(PRODUCTIVITY, /isPriorityDetailFieldV119\(field\)/);
});

test("V119 mantém a estrutura do drawer e isola o destaque em uma folha experimental", () => {
  assert.match(INDEX, /styles_v119_drawer_priority_preview\.css\?v=11900/);
  assert.match(INDEX, /v119-drawer-priority-preview/);
  assert.match(INDEX, /id="detailsDrawerV99"/);
  assert.match(INDEX, /id="detailsContentV99"/);

  assert.doesNotMatch(PREVIEW_CSS, /grid-template-columns\s*:/);
  assert.doesNotMatch(PREVIEW_CSS, /\bwidth\s*:/);
  assert.doesNotMatch(PREVIEW_CSS, /\bheight\s*:/);
  assert.doesNotMatch(PREVIEW_CSS, /\bpadding\s*:/);
  assert.doesNotMatch(PREVIEW_CSS, /\bgap\s*:/);
  assert.doesNotMatch(PREVIEW_CSS, /\boverflow\s*:/);
});

test("V119 preserva valores vazios discretos dentro de campos prioritários", () => {
  assert.match(PREVIEW_CSS, /> strong\.is-empty/);
  assert.match(PREVIEW_CSS, /color:\s*#8996a3/);
  assert.match(PREVIEW_CSS, /font-weight:\s*600/);
});

test("V119 sincroniza versão do pacote experimental", () => {
  assert.equal(PACKAGE.version, "119.0.0");
  assert.match(INDEX, />V119<\/span>/);
  assert.match(INDEX, /app-config\.js\?v=11900/);
  assert.match(INDEX, /core\.js\?v=11900/);
  assert.match(INDEX, /productivity-v99\.js\?v=11900/);
});
