const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v100_empty_states.css"),
  "utf8"
);
const TABLE_SOURCE = fs.readFileSync(
  path.join(ROOT, "static", "js", "table.js"),
  "utf8"
);

class FakeNode {
  constructor(tagName = "#text", text = "") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this._text = text;
    this.className = "";
    this.id = "";
    this.disabled = false;
  }

  set textContent(value) {
    this._text = String(value ?? "");
    this.children = [];
  }

  get textContent() {
    if (this.tagName === "#TEXT") return this._text;
    return this._text + this.children.map(child => child.textContent).join("");
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener() {}

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

function loadRenderer() {
  const document = {
    createElement: tag => new FakeNode(tag),
    createTextNode: text => new FakeNode("#text", text),
  };
  const context = {
    console,
    window: {
      getSelectedRowsCountV100: () => 0,
      isEmptyStateReloadActiveV100: () => false,
    },
    state: { activeTab: "base" },
    document,
    $() { return null; },
    setTimeout,
    clearTimeout,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(TABLE_SOURCE, context, { filename: "table.js" });
  return { runtime: context.window, document };
}

function allTags(node, output = []) {
  if (node.tagName && node.tagName !== "#TEXT") output.push(node.tagName);
  node.children.forEach(child => allTags(child, output));
  return output;
}

test("DOM possui título focalizável e live region persistente", () => {
  assert.match(
    INDEX,
    /id="basePanelTitle"\s+tabindex="-1">Registros/
  );
  assert.match(
    INDEX,
    /id="baseTableStatusLive"[^>]*aria-live="polite"[^>]*aria-atomic="true"/
  );
  assert.match(
    INDEX,
    /id="baseTableRegion"[^>]*aria-busy="false"/
  );
});

test("ação possui área mínima de interação e foco visível", () => {
  assert.match(CSS, /\.table-empty-action-v100\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(
    CSS,
    /\.table-empty-action-v100:focus-visible\s*\{[\s\S]*outline:\s*3px\s+solid\s+#1d4ed8/
  );
});

test("termo de busca malicioso é inserido apenas como texto", () => {
  const { runtime } = loadRenderer();
  const malicious = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
  const snapshot = runtime.createTableQuerySnapshotV100({
    search: malicious,
    filters: {},
    multi_search_terms: [],
    date_from: "",
    date_to: "",
    value_min: null,
    value_max: null,
    page: 1,
    page_size: 200,
  });
  const descriptor = runtime.createEmptyStateDescriptorV100(snapshot, 0);
  const tbody = new FakeNode("tbody");

  runtime.renderTableEmptyStateV100(tbody, ["ETAPA"], descriptor);

  assert.match(tbody.textContent, /<img src=x onerror=/);
  const tags = allTags(tbody);
  assert.equal(tags.includes("IMG"), false);
  assert.equal(tags.includes("SCRIPT"), false);
});

test("fonte proíbe interpolação direta da busca no innerHTML do estado vazio", () => {
  assert.match(TABLE_SOURCE, /term\.textContent\s*=\s*descriptor\.searchTerm/);
  assert.doesNotMatch(
    TABLE_SOURCE,
    /innerHTML\s*=\s*`[^`]*\$\{(?:state\.search|snapshot\.search|descriptor\.searchTerm)/s
  );
});
