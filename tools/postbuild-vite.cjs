#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist-vite");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const FORBIDDEN_EXTENSIONS = new Set([".py", ".xlsx", ".xls", ".xlsm", ".md", ".bat", ".cmd"]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function expandServiceWorkerPrecache() {
  const htmlPath = path.join(OUTPUT, "index.html");
  const swPath = path.join(OUTPUT, "sw.js");
  const html = fs.readFileSync(htmlPath, "utf8");

  const urls = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/") && !url.startsWith("//"))
    .map((url) => url.split("#")[0]);

  const required = ["/", "/index.html", "/404.html", "/manifest.webmanifest", ...urls];
  const shell = [...new Set(required)].filter((url) => {
    const relative = url.split("?")[0].replace(/^\/+/, "");
    return !relative || fs.existsSync(path.join(OUTPUT, relative));
  });

  let sw = fs.readFileSync(swPath, "utf8");
  sw = sw.replace(
    /const SHELL = \[[\s\S]*?\];/,
    `const SHELL = ${JSON.stringify(shell, null, 2)};`
  );
  fs.writeFileSync(swPath, sw);
  return shell;
}

function writeIntegrityManifest() {
  const manifestPath = path.join(OUTPUT, "build-manifest.json");
  const files = walk(OUTPUT)
    .filter((file) => path.resolve(file) !== path.resolve(manifestPath))
    .sort();

  const entries = {};
  for (const file of files) {
    const relative = path.relative(OUTPUT, file).split(path.sep).join("/");
    const buffer = fs.readFileSync(file);
    entries[relative] = {
      bytes: buffer.byteLength,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  const payload = {
    schema: 2,
    application: "dashboard-pcm-cloudflare",
    pipeline: "vite",
    version: PACKAGE.version,
    generatedAt: new Date().toISOString(),
    files: entries,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`);
  return Object.keys(entries).length;
}


function makeWranglerConfigPortable() {
  const wranglerPath = path.join(OUTPUT, "wrangler.json");
  if (!fs.existsSync(wranglerPath)) {
    throw new Error("Configuração Wrangler gerada pelo Vite não foi encontrada.");
  }

  const generated = JSON.parse(fs.readFileSync(wranglerPath, "utf8"));
  const portable = {
    name: generated.name || "dashboard-pcm-cloudflare",
    compatibility_date: generated.compatibility_date || "2026-07-21",
    compatibility_flags: Array.isArray(generated.compatibility_flags)
      ? generated.compatibility_flags
      : [],
    assets: {
      directory: ".",
      not_found_handling:
        generated.assets?.not_found_handling || "404-page",
    },
    observability: generated.observability || { enabled: true },
  };

  fs.writeFileSync(
    wranglerPath,
    `${JSON.stringify(portable, null, 2)}\n`
  );
}

function verifyOutput() {
  const required = [
    "index.html",
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
    if (!fs.existsSync(path.join(OUTPUT, relative))) {
      throw new Error(`Build Vite incompleto; arquivo ausente: ${relative}`);
    }
  }

  const forbidden = walk(OUTPUT).filter((file) =>
    FORBIDDEN_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
  if (forbidden.length) {
    throw new Error(
      `Arquivos proibidos no build Vite: ${forbidden
        .map((file) => path.relative(OUTPUT, file))
        .join(", ")}`
    );
  }
}

try {
  makeWranglerConfigPortable();
  verifyOutput();
  const shell = expandServiceWorkerPrecache();
  const manifested = writeIntegrityManifest();
  console.log(
    `[postbuild:vite] ${manifested} arquivos auditados; ${shell.length} recursos no precache.`
  );
} catch (error) {
  console.error(`[postbuild:vite] ${error.message}`);
  process.exitCode = 1;
}
