#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const errors = [];

function localPath(url) {
  if (!url || /^(https?:|data:|#)/i.test(url)) return null;
  return url.split(/[?#]/)[0].replace(/^\/+/, "");
}

const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
  .map((m) => localPath(m[1])).filter(Boolean);
for (const ref of new Set(refs)) {
  if (!fs.existsSync(path.join(ROOT, ref))) errors.push(`Referência ausente: ${ref}`);
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
if (duplicates.length) errors.push(`IDs duplicados: ${duplicates.join(", ")}`);

if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(html)) {
  errors.push("Script inline incompatível com a CSP.");
}
if (/\son\w+\s*=/i.test(html)) errors.push("Manipulador de evento inline incompatível com a CSP.");

const jsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".cjs")) jsFiles.push(file);
  }
}
walk(path.join(ROOT, "static", "js"));
jsFiles.push(path.join(ROOT, "sw.js"));
for (const file of jsFiles) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); }
  catch { errors.push(`JavaScript inválido: ${path.relative(ROOT, file)}`); }
}


const headersPath = path.join(ROOT, "_headers");
const headers = fs.readFileSync(headersPath, "utf8");
for (const route of ["/static/js/*", "/static/*.css"]) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = headers.match(new RegExp(`${escaped}\\s+([\\s\\S]*?)(?=\\n/|$)`));
  if (!block) {
    errors.push(`Política de cache ausente em _headers: ${route}`);
    continue;
  }
  if (/immutable/i.test(block[1])) {
    errors.push(`Cache immutable inseguro para ativos sem fingerprint: ${route}`);
  }
  if (!/must-revalidate/i.test(block[1])) {
    errors.push(`Revalidação obrigatória ausente para ativos versionados por URL estável: ${route}`);
  }
}

for (const file of ["version.json", "publication-status.json", "executive-data.json", "operational-data.json"]) {
  const target = path.join(ROOT, "static", "data", file);
  try { JSON.parse(fs.readFileSync(target, "utf8")); }
  catch { errors.push(`JSON inválido: static/data/${file}`); }
}


// Coerência de versão entre os arquivos críticos de inicialização.
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const appConfigSource = fs.readFileSync(path.join(ROOT, "static", "js", "app-config.js"), "utf8");
const coreSource = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
const serviceWorkerSource = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const buildSource = fs.readFileSync(path.join(ROOT, "tools", "build-dist.cjs"), "utf8");

const appVersion = appConfigSource.match(/\bversion:\s*"([^"]+)"/)?.[1];
const assetVersion = appConfigSource.match(/\bassetVersion:\s*"([^"]+)"/)?.[1];
const coreAssetVersion = coreSource.match(/String\(config\.assetVersion \|\| ""\) !== "([^"]+)"/)?.[1];
const appConfigQuery = html.match(/\/static\/js\/app-config\.js\?v=([^"]+)/)?.[1];
const coreQuery = html.match(/\/static\/js\/core\.js\?v=([^"]+)/)?.[1];
const visualVersion = html.match(/aria-label="Versão atual">V([^<]+)<\/span>/)?.[1];
const swVersion = serviceWorkerSource.match(/const VERSION = "v([^"]+)"/)?.[1];
const packageMajor = String(packageJson.version || "").split(".")[0];

if (appVersion !== packageJson.version) {
  errors.push(`Versão divergente: package.json=${packageJson.version}, app-config.js=${appVersion || "ausente"}`);
}
if (!assetVersion || assetVersion !== coreAssetVersion) {
  errors.push(`Token de ativos divergente: app-config.js=${assetVersion || "ausente"}, core.js=${coreAssetVersion || "ausente"}`);
}
if (appConfigQuery !== assetVersion || coreQuery !== assetVersion) {
  errors.push(`Cache-busting divergente: app-config=${appConfigQuery || "ausente"}, core=${coreQuery || "ausente"}, esperado=${assetVersion || "ausente"}`);
}
if (visualVersion !== packageMajor) {
  errors.push(`Versão visual divergente: interface=V${visualVersion || "ausente"}, pacote=${packageJson.version}`);
}
if (swVersion !== packageMajor) {
  errors.push(`Versão do service worker divergente: sw=v${swVersion || "ausente"}, pacote=${packageJson.version}`);
}
if (!/version:\s*PACKAGE\.version/.test(buildSource)) {
  errors.push("Manifesto de build não deriva a versão diretamente do package.json.");
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log(`Auditoria concluída: ${new Set(refs).size} referências, ${ids.length} IDs e ${jsFiles.length} scripts verificados.`);
