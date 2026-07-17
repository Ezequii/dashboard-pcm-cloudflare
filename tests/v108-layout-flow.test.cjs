const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const css = fs.readFileSync(
  path.join(ROOT, "static", "styles_v108_layout_flow.css"),
  "utf8"
);
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const build = fs.readFileSync(path.join(ROOT, "tools", "build-dist.cjs"), "utf8");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
);

test("Top 3 permanece no fluxo normal sem altura fixa ou recorte", () => {
  assert.match(css, /active-tab-visao \.page-v41[\s\S]*height:\s*auto\s*!important/);
  assert.match(css, /active-tab-visao \.page-v41[\s\S]*overflow:\s*visible\s*!important/);
  assert.match(css, /ranking-list-v991[\s\S]*max-height:\s*none\s*!important/);
  assert.match(css, /\.footer-credit[\s\S]*position:\s*static\s*!important/);
});

test("paginação pertence à mesma grade da busca no desktop", () => {
  const searchStart = html.indexOf('class="smart-search-v89"');
  const searchEnd = html.indexOf('id="advancedSearchPanel"', searchStart);
  const searchBlock = html.slice(searchStart, searchEnd);

  assert.match(searchBlock, /class="pager pager-v108"/);
  assert.match(searchBlock, /id="btnToggleAdvancedSearch"/);
  assert.match(searchBlock, /id="pageSize"/);
  assert.match(css, /grid-template-columns:[\s\S]*max-content[\s\S]*max-content\s*!important/);
  assert.match(css, /\.pager-v108[\s\S]*grid-column:\s*4\s*!important/);
  assert.match(css, /\.pager-v108[\s\S]*grid-row:\s*1\s*!important/);
});

test("controles mantêm adaptação para tablet e celular", () => {
  assert.match(css, /@media \(min-width:\s*761px\) and \(max-width:\s*1280px\)/);
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /@media \(max-width:\s*430px\)/);
});

test("paginação possui rótulos acessíveis", () => {
  assert.match(html, /<label for="pageSize">Exibir<\/label>/);
  assert.match(html, /id="pageSize" aria-label="Quantidade de registros por página"/);
  assert.match(html, /id="pageInfo" aria-live="polite"/);
  assert.match(html, /class="pager pager-v108" role="group" aria-label="Paginação da base"/);
});

test("recursos da V108 permanecem ativos em versões posteriores", () => {
  const major = Number(String(packageJson.version).split(".")[0]);
  assert.ok(major >= 108, "a versão atual deve preservar a entrega V108");
  assert.match(sw, /const VERSION = "v10[8-9]"/);
  assert.match(build, /version:\s*PACKAGE\.version/);
  assert.match(html, />V10[8-9]<\/span>/);
  assert.match(html, /styles_v108_layout_flow\.css\?v=10800/);
});
