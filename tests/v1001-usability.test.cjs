"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "static", "styles_v100_1_usability.css"), "utf8");

test("seletores de busca não oferecem escopos duplicados", () => {
  const searchScope = html.match(/<select id="searchScope"[\s\S]*?<\/select>/)?.[0] || "";
  const multiScope = html.match(/<select id="multiSearchScopeV99"[\s\S]*?<\/select>/)?.[0] || "";
  assert.equal([...searchScope.matchAll(/<option value="DOCUMENTO">/g)].length, 1);
  assert.equal([...multiScope.matchAll(/<option value="DOCUMENTO">/g)].length, 1);
});

test("página possui metadados básicos e viewport seguro", () => {
  assert.match(html, /name="description"/);
  assert.match(html, /name="theme-color"/);
  assert.match(html, /viewport-fit=cover/);
});

test("camada V100.1 cobre foco, toque e viewport móvel", () => {
  assert.match(html, /styles_v100_1_usability\.css/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
});
