"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V104 identifica a versão no pacote e na interface", () => {
  const pkg = JSON.parse(read("package.json"));
  const html = read("index.html");
  const config = read("static/js/app-config.js");
  assert.match(pkg.version, /^10[4-9]\.0\.0$/);
  assert.match(html, />V10[4-9]<\/span>/);
  assert.match(config, /version:\s*"10[4-9]\.0\.0"/);
});

test("V104 limita payloads JSON e valida o tipo de conteúdo", () => {
  const api = read("static/js/api.js");
  const config = read("static/js/app-config.js");
  assert.match(api, /content-type/);
  assert.match(api, /application\/json/);
  assert.match(api, /maxJsonPayloadBytes/);
  assert.match(api, /content-length/);
  assert.match(api, /TextEncoder/);
  assert.match(config, /maxJsonPayloadBytes:\s*12582912/);
});

test("V104 impõe limites separados para bases executiva e operacional", () => {
  const api = read("static/js/api.js");
  const config = read("static/js/app-config.js");
  assert.match(api, /maxExecutiveRowsInMemory/);
  assert.match(api, /maxOperationalRowsInMemory/);
  assert.match(config, /maxExecutiveRowsInMemory:\s*10000/);
  assert.match(config, /maxOperationalRowsInMemory:\s*25000/);
});

test("V104 verifica a contagem publicada contra o arquivo executivo", () => {
  const api = read("static/js/api.js");
  assert.match(api, /publishedRecords !== executive\.rows\.length/);
  assert.match(api, /publication\.records/);
});

test("service worker usa um cache exclusivo da V104", () => {
  const sw = read("sw.js");
  assert.match(sw, /const VERSION = "v10[4-9]"/);
});
