#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, ".vite-public");
const ROOT_PUBLIC_FILES = ["404.html", "_headers", "manifest.webmanifest", "sw.js"];
const ALLOWED_STATIC_EXTENSIONS = new Set([".css", ".png", ".js", ".json"]);
const FORBIDDEN_EXTENSIONS = new Set([".py", ".xlsx", ".xls", ".xlsm", ".md", ".bat", ".cmd"]);

function copyFile(relativePath) {
  const source = path.join(ROOT, relativePath);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Artefato obrigatório ausente: ${relativePath}`);
  }
  const destination = path.join(PUBLIC, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function syncStatic() {
  const staticRoot = path.join(ROOT, "static");
  if (!fs.existsSync(staticRoot)) {
    throw new Error("Diretório static ausente.");
  }

  for (const file of walk(staticRoot)) {
    const extension = path.extname(file).toLowerCase();
    if (!ALLOWED_STATIC_EXTENSIONS.has(extension)) continue;
    const relative = path.relative(ROOT, file);
    copyFile(relative);
  }
}

function verifyPublic() {
  const files = walk(PUBLIC);
  const forbidden = files.filter((file) =>
    FORBIDDEN_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
  if (forbidden.length) {
    throw new Error(
      `Arquivos proibidos na staging pública: ${forbidden
        .map((file) => path.relative(PUBLIC, file))
        .join(", ")}`
    );
  }

  const required = [
    "404.html",
    "_headers",
    "manifest.webmanifest",
    "sw.js",
    "static/favicon.png",
    "static/logo_amaggi.png",
    "static/data/executive-data.json",
    "static/data/operational-data.json",
    "static/data/version.json",
    "static/data/publication-status.json",
    "static/js/security-v994a.js",
    "static/js/api.js",
  ];

  for (const relative of required) {
    if (!fs.existsSync(path.join(PUBLIC, relative))) {
      throw new Error(`Staging pública incompleta: ${relative}`);
    }
  }

  return files.length;
}

try {
  fs.rmSync(PUBLIC, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC, { recursive: true });

  ROOT_PUBLIC_FILES.forEach(copyFile);
  syncStatic();

  const count = verifyPublic();
  console.log(`[vite:sync] ${count} arquivos preparados em ${PUBLIC}`);
} catch (error) {
  console.error(`[vite:sync] ${error.message}`);
  process.exitCode = 1;
}
