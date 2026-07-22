const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "static", "styles_v100_executive_composed.css"), "utf8");

test("camada consolidada substitui o empilhamento visual anterior", () => {
  assert.match(INDEX, /styles_v100_executive_composed\.css\?v=10100/);
  assert.doesNotMatch(INDEX, /styles_v100_executive_final_polish\.css/);
  assert.doesNotMatch(INDEX, /styles_v100_executive_no_redundancy\.css/);
});

test("fluxo é compacto e apresentado como pipeline", () => {
  assert.match(CSS, /\.process-flow-v991::before\s*\{[\s\S]*height:\s*2px/);
  assert.match(CSS, /\.flow-average-v994a2,[\s\S]*display:\s*none\s*!important/);
});

test("responsividade e redução de movimento permanecem cobertas", () => {
  assert.match(CSS, /@media\s*\(max-width:\s*900px\)/);
  assert.match(CSS, /@media\s*\(max-width:\s*680px\)/);
  assert.match(CSS, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
