#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist");
const ROOT_FILES = ["index.html", "404.html", "_headers"];
const STATIC_RULES = [
  { directory: "static", extension: ".css" },
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

  console.log(`dist criado com ${copied.length} arquivos em ${OUTPUT}`);
  return copied;
}

try {
  buildDist();
} catch (error) {
  console.error(`[build-dist] ${error.message}`);
  process.exitCode = 1;
}
