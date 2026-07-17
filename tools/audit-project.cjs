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

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log(`Auditoria concluída: ${new Set(refs).size} referências, ${ids.length} IDs e ${jsFiles.length} scripts verificados.`);
