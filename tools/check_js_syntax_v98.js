const fs = require("fs");
const path = require("path");
const vm = require("vm");

const directory = path.resolve(__dirname, "../static/js");
const files = fs.readdirSync(directory).filter((name) => name.endsWith(".js")).sort();
const failures = [];

for (const name of files) {
  const source = fs.readFileSync(path.join(directory, name), "utf8");
  try {
    new vm.Script(source, {filename: name});
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

if (failures.length) {
  console.error("SINTAXE JS V98: FALHOU");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`SINTAXE JS V98: OK (${files.length} arquivos)`);
