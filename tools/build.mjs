
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=process.cwd();
const DIST=path.join(ROOT,"dist");
fs.rmSync(DIST,{recursive:true,force:true});
fs.mkdirSync(DIST,{recursive:true});

function copy(src,dst){
  const stat=fs.statSync(src);
  if(stat.isDirectory()){
    fs.mkdirSync(dst,{recursive:true});
    for(const name of fs.readdirSync(src)) copy(path.join(src,name),path.join(dst,name));
  }else{
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.copyFileSync(src,dst);
  }
}
copy(path.join(ROOT,"index.html"),path.join(DIST,"index.html"));
copy(path.join(ROOT,"_headers"),path.join(DIST,"_headers"));
copy(path.join(ROOT,"static"),path.join(DIST,"static"));

const files=[];
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const full=path.join(dir,name);
    const stat=fs.statSync(full);
    if(stat.isDirectory()) walk(full);
    else{
      const rel=path.relative(DIST,full).replaceAll(path.sep,"/");
      const data=fs.readFileSync(full);
      files.push({path:rel,bytes:data.length,sha256:crypto.createHash("sha256").update(data).digest("hex")});
    }
  }
}
walk(DIST);
files.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(path.join(DIST,"build-manifest.json"),JSON.stringify({
  version:"1.0.0",generatedAt:new Date().toISOString(),files
},null,2)+"\n");

if(files.some(file=>file.path==="_redirects")) throw new Error("_redirects não deve existir no Workers Static Assets.");
console.log(`dist criado com ${files.length+1} arquivos (${files.reduce((s,f)=>s+f.bytes,0)} bytes antes do manifesto).`);
