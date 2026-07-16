const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "static", "styles_v100_executive_composed.css"), "utf8");

test("atalhos não duplicam a visão executiva e permanecem no DOM", () => {
  assert.match(INDEX, /id="quickChips"/);
  assert.match(CSS, /active-tab-visao\s+#quickChips\s*\{[\s\S]*display:\s*none\s*!important/);
});

test("alertas redundantes permanecem compatíveis no DOM e ficam ocultos visualmente", () => {
  assert.match(INDEX, /class="executive-alerts-v991"/);
  assert.match(CSS, /\.executive-alerts-v991\s*\{[\s\S]*display:\s*none\s*!important/);
});

test("fluxo e rankings usam uma única composição visual", () => {
  assert.match(CSS, /\.operations-grid-v991\s*\{[\s\S]*display:\s*grid\s*!important/);
  assert.match(CSS, /\.ranking-grid-v991\s*\{[\s\S]*grid-template-columns:\s*1fr\s+1fr/);
});
