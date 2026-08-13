#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist");
const REQUIRED = [
  "index.html",
  "404.html",
  "_headers",
  "manifest.webmanifest",
  "sw.js",
  "assets",
  "static/data/executive-data.json",
  "static/data/operational-data.json",
  "static/data/publication-status.json",
  "static/data/version.json",
  "static/favicon.png",
  "static/logo_amaggi.png",
];

function copy(relativePath) {
  const source = path.join(ROOT, relativePath);
  const target = path.join(OUTPUT, relativePath);
  if (!fs.existsSync(source)) throw new Error(`Arquivo obrigatório ausente: ${relativePath}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(path.relative(OUTPUT, full).split(path.sep).join("/"));
  }
  return files;
}

function main() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  for (const relativePath of REQUIRED) copy(relativePath);

  const index = fs.readFileSync(path.join(OUTPUT, "index.html"), "utf8");
  const references = [...index.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)].map((match) => match[1]);
  for (const asset of references) copy(asset);

  const files = walk(OUTPUT).sort();
  fs.writeFileSync(
    path.join(OUTPUT, "build-manifest.json"),
    JSON.stringify({ application: "dashboard-pcm-cloudflare", files }, null, 2) + "\n",
  );
  console.log(`dist criado com ${files.length} arquivos`);
}

main();
