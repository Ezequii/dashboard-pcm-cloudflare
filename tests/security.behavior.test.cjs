const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "security-v994a.js"),
  "utf8"
);

function createRuntime({
  role,
  verified = true,
  exportRoles = ["leadership", "admin"],
  includeExportRoles = true,
  environment = "production",
}) {
  const groupsByRole = {
    viewer: [],
    leadership: ["pcm-leadership"],
    admin: ["pcm-admin"],
  };
  const policy = {
    environment,
    accessRequired: true,
    anonymousAccessAllowed: false,
    failClosed: true,
    allowedRoles: ["viewer", "leadership", "admin"],
    defaultRole: "viewer",
    identityEndpoint: "/cdn-cgi/access/get-identity",
    localDevelopmentAllowed: false,
    roleMappings: {
      adminGroups: ["pcm-admin"],
      leadershipGroups: ["pcm-leadership"],
      adminEmails: [],
      leadershipEmails: [],
    },
  };
  if (includeExportRoles) policy.exportRoles = exportRoles;

  const identity = verified
    ? { email: `${role}@example.test`, groups: groupsByRole[role] || [] }
    : null;

  const responses = [policy];
  if (identity) responses.push(identity);

  const context = {
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    location: { protocol: "https:", hostname: "dashboard.example.test" },
    state: {},
    document: {
      body: { dataset: {} },
      documentElement: { dataset: {} },
      getElementById: () => null,
    },
    fetch: async (url) => {
      if (!identity && String(url).includes("/cdn-cgi/access/get-identity")) {
        return { ok: false, status: 401, json: async () => ({}) };
      }
      const body = responses.shift();
      return { ok: true, status: 200, json: async () => body };
    },
  };
  context.window = context;
  context.PCM_APP_CONFIG = {
    assetVersion: "test",
    securityConfig: "/static/config/security-config.json",
  };
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "security-v994a.js" });
  return context;
}

test("viewer autenticado não pode exportar", async () => {
  const runtime = createRuntime({ role: "viewer" });
  await runtime.SecurityV994a.initialize();
  assert.equal(runtime.SecurityV994a.getRole(), "viewer");
  assert.equal(runtime.SecurityV994a.canExport(), false);
});

test("leadership autenticado pode exportar", async () => {
  const runtime = createRuntime({ role: "leadership" });
  await runtime.SecurityV994a.initialize();
  assert.equal(runtime.SecurityV994a.getRole(), "leadership");
  assert.equal(runtime.SecurityV994a.canExport(), true);
});

test("admin autenticado pode exportar", async () => {
  const runtime = createRuntime({ role: "admin" });
  await runtime.SecurityV994a.initialize();
  assert.equal(runtime.SecurityV994a.getRole(), "admin");
  assert.equal(runtime.SecurityV994a.canExport(), true);
});

test("usuário não verificado não pode exportar", async () => {
  const runtime = createRuntime({ role: "viewer", verified: false });
  await assert.rejects(() => runtime.SecurityV994a.initialize(), /acesso corporativo/i);
  assert.equal(runtime.SecurityV994a.canExport(), false);
});

test("ausência de exportRoles falha fechado", async () => {
  const runtime = createRuntime({ role: "admin", includeExportRoles: false });
  await runtime.SecurityV994a.initialize();
  assert.equal(runtime.SecurityV994a.canExport(), false);
});
