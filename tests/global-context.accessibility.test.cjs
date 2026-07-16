
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const css = fs.readFileSync(
  path.join(__dirname, "..", "static", "styles_v100_global_context.css"),
  "utf8"
);

test("existe uma única região global informativa e sem controles", () => {
  assert.equal((html.match(/id="globalContextBar"/g) || []).length, 1);
  assert.equal((html.match(/id="globalContextList"/g) || []).length, 1);
  assert.match(html, /id="globalContextBar"[\s\S]*?aria-label="Contexto global aplicado"/);
  const start = html.lastIndexOf("<section", html.indexOf('id="globalContextBar"'));
  const end = html.indexOf("</section>", start) + "</section>".length;
  const section = html.slice(start, end);
  assert.doesNotMatch(section, /<button|<a\s/i);
  assert.doesNotMatch(section, /tabindex=/i);
  assert.match(section, /<dl[^>]*id="globalContextList"/);
});

test("CSS permite reflow sem rolagem horizontal ou animações", () => {
  assert.match(css, /flex-wrap:\s*wrap/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /min-width:\s*0/);
  assert.doesNotMatch(css, /overflow-x:\s*(auto|scroll)/);
  assert.doesNotMatch(css, /transition\s*:/);
  assert.doesNotMatch(css, /animation\s*:/);
});

test("componente não introduz ícones, tooltips ou ações", () => {
  assert.doesNotMatch(css, /background-image|mask-image/);
  const start = html.lastIndexOf("<section", html.indexOf('id="globalContextBar"'));
  const end = html.indexOf("</section>", start) + "</section>".length;
  const section = html.slice(start, end);
  assert.doesNotMatch(section, /title=|data-tooltip|svg|img/i);
});
