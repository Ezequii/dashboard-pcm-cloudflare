
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

const ROOT=process.cwd();
const required=[
  "index.html","_headers","wrangler.toml","package.json","package-lock.json",".npmrc",
  "static/css/app.css","static/js/xlsx-reader.js","static/js/xlsx-exporter.js","static/js/app.js"
];
for(const rel of required){
  if(!fs.existsSync(path.join(ROOT,rel))) throw new Error(`Arquivo obrigatório ausente: ${rel}`);
}
if(fs.existsSync(path.join(ROOT,"_redirects"))||fs.existsSync(path.join(ROOT,"static","_redirects"))){
  throw new Error("Arquivo _redirects proibido neste projeto.");
}
const lock=fs.readFileSync(path.join(ROOT,"package-lock.json"),"utf8");
if(/applied-caas|internal\.api\.openai\.org/i.test(lock)) throw new Error("Registry interno encontrado no package-lock.");
const npmrc=fs.readFileSync(path.join(ROOT,".npmrc"),"utf8");
if(!npmrc.includes("https://registry.npmjs.org/")) throw new Error(".npmrc não aponta para o registry público.");
const wrangler=fs.readFileSync(path.join(ROOT,"wrangler.toml"),"utf8");
if(!wrangler.includes('directory = "./dist"')||!wrangler.includes('not_found_handling = "single-page-application"')){
  throw new Error("wrangler.toml não está configurado para SPA com Static Assets.");
}
for(const rel of ["static/js/xlsx-reader.js","static/js/xlsx-exporter.js","static/js/app.js","tools/build.mjs"]){
  execFileSync(process.execPath,["--check",path.join(ROOT,rel)],{stdio:"inherit"});
}
const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
for(const id of ["overviewView","consultaView","fileInput","stageGrid","tableBody","detailDrawer"]){
  if(!html.includes(`id="${id}"`)) throw new Error(`ID esperado não encontrado: ${id}`);
}
console.log("Verificação estrutural e sintática aprovada.");
