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
const VISUAL_CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v994a2_visual.css"),
  "utf8"
);
const PACKAGE = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
);

test("V120 mantém marcação semântica dos oito campos prioritários do drawer", () => {
  for (const field of [
    "DATA DE RECEBIMENTO",
    "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA",
    "Nº PEDIDO",
    "SOLICITANTE",
    "PREFIXO",
    "FORNECEDOR",
    "Nº ORÇAMENTO FINAL",
    "ETAPA",
  ]) {
    assert.match(
      PRODUCTIVITY,
      new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }
  assert.match(PRODUCTIVITY, /const PRIORITY_DETAIL_FIELDS = new Set/);
  assert.match(PRODUCTIVITY, /data-detail-priority="true"/);
  assert.match(PRODUCTIVITY, /isPriorityDetailField\(field\)/);
});

test("V120 consolida o destaque no CSS visual definitivo e remove a camada experimental", () => {
  assert.match(
    VISUAL_CSS,
    /\.detail-field-v994a2\[data-detail-priority="true"\]/
  );
  assert.match(VISUAL_CSS, /box-shadow:inset 3px 0 0 #0069C9/);
  assert.match(VISUAL_CSS, />strong\.is-empty/);

  assert.doesNotMatch(INDEX, /styles_v119_drawer_priority_preview\.css/);
  assert.doesNotMatch(INDEX, /v119-drawer-priority-preview/);
  assert.equal(
    fs.existsSync(
      path.join(ROOT, "static", "styles_v119_drawer_priority_preview.css")
    ),
    false
  );
});

test("V120 preserva a estrutura original do drawer", () => {
  assert.match(INDEX, /id="detailsDrawerV99"/);
  assert.match(INDEX, /id="detailsContentV99"/);
  assert.match(INDEX, /id="btnPreviousDetailV99"/);
  assert.match(INDEX, /id="btnNextDetailV99"/);
  assert.match(INDEX, /id="btnCopyRowV99"/);
  assert.match(INDEX, /id="btnCopyRowSummaryV99"/);
});

test("V120 sincroniza pacote, runtime e cache-busting dos arquivos alterados", () => {
  assert.equal(PACKAGE.version, "120.0.0");
  assert.match(INDEX, />V120<\/span>/);
  assert.match(INDEX, /app-config\.js\?v=12000/);
  assert.match(INDEX, /core\.js\?v=12000/);
  assert.match(INDEX, /productivity-v99\.js\?v=12000/);
  assert.match(INDEX, /styles_v994a2_visual\.css\?v=12000/);
});
