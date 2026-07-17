#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist");
const ROOT_FILES = ["index.html", "404.html", "_headers", "manifest.webmanifest", "sw.js"];
const STATIC_RULES = [
  { directory: "static", extension: ".css" },
  { directory: "static", extension: ".png" },
  { directory: "static/js", extension: ".js" },
  { directory: "static/config", extension: ".json" },
];
const DATA_FILES = [
  "static/data/executive-data.json",
  "static/data/operational-data.json",
  "static/data/version.json",
  "static/data/publication-status.json",
];
const FORBIDDEN_EXTENSIONS = new Set([
  ".py", ".xlsx", ".xls", ".xlsm", ".md", ".bat", ".cmd",
]);

function ensureInsideProject(target) {
  const relative = path.relative(ROOT, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("O diretório de saída deve ser um subdiretório do projeto.");
  }
}

function copyRequired(relativePath) {
  const source = path.join(ROOT, relativePath);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Artefato obrigatório ausente: ${relativePath}`);
  }
  const destination = path.join(OUTPUT, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return destination;
}

function copyDirectoryFiles(directory, extension) {
  const absoluteDirectory = path.join(ROOT, directory);
  if (!fs.existsSync(absoluteDirectory)) {
    throw new Error(`Diretório obrigatório ausente: ${directory}`);
  }
  const files = fs.readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === extension)
    .map((entry) => path.join(directory, entry.name))
    .sort();

  if (!files.length) {
    throw new Error(`Nenhum artefato ${extension} encontrado em ${directory}`);
  }
  return files.map(copyRequired);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}


function expandServiceWorkerPrecache() {
  const html = fs.readFileSync(path.join(OUTPUT, "index.html"), "utf8");
  const urls = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/") && !url.startsWith("//"))
    .map((url) => url.split("#")[0]);
  const required = ["/", "/index.html", "/404.html", "/manifest.webmanifest", ...urls];
  const shell = [...new Set(required)].filter((url) => {
    const relative = url.split("?")[0].replace(/^\/+/, "");
    return !relative || fs.existsSync(path.join(OUTPUT, relative));
  });
  const swPath = path.join(OUTPUT, "sw.js");
  let sw = fs.readFileSync(swPath, "utf8");
  sw = sw.replace(/const SHELL = \[[\s\S]*?\];/, `const SHELL = ${JSON.stringify(shell, null, 2)};`);
  fs.writeFileSync(swPath, sw);
  return shell;
}


function writeBuildManifest() {
  const files = walk(OUTPUT)
    .filter((file) => path.basename(file) !== "build-manifest.json")
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
  const manifest = {
    schema: 1,
    application: "dashboard-pcm-cloudflare",
    version: "106.0.0",
    generatedAt: new Date().toISOString(),
    files: entries,
  };
  fs.writeFileSync(
    path.join(OUTPUT, "build-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return Object.keys(entries).length;
}

function buildDist() {
  ensureInsideProject(OUTPUT);
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });

  const copied = [
    ...ROOT_FILES.map(copyRequired),
    ...STATIC_RULES.flatMap(({ directory, extension }) =>
      copyDirectoryFiles(directory, extension)
    ),
    ...DATA_FILES.map(copyRequired),
  ];

  const precached = expandServiceWorkerPrecache();

  const forbidden = walk(OUTPUT).filter((file) =>
    FORBIDDEN_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
  if (forbidden.length) {
    throw new Error(
      `Arquivos proibidos no pacote publicável: ${forbidden
        .map((file) => path.relative(OUTPUT, file))
        .join(", ")}`
    );
  }

  const requiredOutput = [
    "index.html",
    "404.html",
    "_headers",
    "manifest.webmanifest",
    "sw.js",
    "static/favicon.png",
    "static/logo_amaggi.png",
    ...DATA_FILES,
    "static/js/security-v994a.js",
    "static/js/api.js",
  ];
  for (const relativePath of requiredOutput) {
    const target = path.join(OUTPUT, relativePath);
    if (!fs.existsSync(target)) {
      throw new Error(`Build incompleto; arquivo ausente: ${relativePath}`);
    }
  }

  const manifested = writeBuildManifest();
  console.log(`dist criado com ${copied.length} arquivos, ${precached.length} recursos no precache e ${manifested} itens auditados em ${OUTPUT}`);
  return copied;
}

try {
  buildDist();
} catch (error) {
  console.error(`[build-dist] ${error.message}`);
  process.exitCode = 1;
}
