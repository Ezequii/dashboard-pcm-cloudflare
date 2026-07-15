"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const tests = [];

function check(name, condition, detail=""){
  tests.push({name, passed:Boolean(condition), detail:String(detail)});
}

global.window = global;
global.window.addEventListener = () => undefined;
global.document = {
  readyState: "complete",
  getElementById: () => null,
  addEventListener: () => undefined,
  body: {
    classList: {
      add: () => undefined,
      remove: () => undefined
    }
  }
};
global.location = {
  protocol: "http:",
  hostname: "localhost",
  href: "http://localhost/"
};
global.localStorage = {
  getItem: () => null,
  setItem: () => undefined
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  key: () => null,
  length: 0
};

vm.runInThisContext(
  fs.readFileSync(path.join(root, "static/js/app-config.js"), "utf8"),
  {filename:"app-config.js"}
);
vm.runInThisContext(
  fs.readFileSync(path.join(root, "static/js/state.js"), "utf8"),
  {filename:"state.js"}
);

global.fetch = (url, options={}) => {
  const delay = String(url).includes("slow") ? 80 : 8;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({
        ok: true,
        status: 200,
        json: async () => ({url:String(url), ok:true})
      });
    }, delay);

    options.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    }, {once:true});
  });
};

vm.runInThisContext(
  fs.readFileSync(path.join(root, "static/js/api.js"), "utf8"),
  {filename:"api.js"}
);

(async () => {
  check(
    "versionamento_runtime",
    PCM_APP_CONFIG.version === "99.4A.3"
      && PCM_APP_CONFIG.assetVersion === "9943",
    `${PCM_APP_CONFIG.version}/${PCM_APP_CONFIG.assetVersion}`
  );

  check(
    "decisao_versao_igual",
    versionChangedV994a("100", "100") === false,
    versionChangedV994a("100", "100")
  );
  check(
    "decisao_versao_nova",
    versionChangedV994a("100", "101") === true,
    versionChangedV994a("100", "101")
  );
  check(
    "versao_vazia_nao_dispara",
    versionChangedV994a("", "101") === false,
    versionChangedV994a("", "101")
  );

  let firstError = "";
  const first = fetchJsonV994a(
    "/slow",
    {channel:"executive", timeoutMs:1000}
  ).catch(error => {
    firstError = error.name;
    return null;
  });

  await new Promise(resolve => setTimeout(resolve, 5));

  const second = fetchJsonV994a(
    "/fast",
    {channel:"executive", timeoutMs:1000}
  );

  const [, secondResult] = await Promise.all([first, second]);

  check(
    "requisicao_antiga_cancelada",
    firstError === "AbortError",
    firstError
  );
  check(
    "requisicao_nova_concluida",
    secondResult?.ok === true
      && String(secondResult.url).includes("/fast"),
    JSON.stringify(secondResult)
  );

  const controller = beginRequestV994a("operational", 1000);
  abortRequestV994a("operational", "test");
  check(
    "cancelamento_explicito",
    controller.signal.aborted === true,
    controller.signal.reason
  );
  controller.release();

  const failed = tests.filter(test => !test.passed);
  for(const test of tests){
    console.log(
      `${test.passed ? "OK" : "FALHOU"} ${test.name} — ${test.detail}`
    );
  }
  console.log(
    `RESULTADO: ${tests.length - failed.length}/${tests.length} testes aprovados.`
  );

  const outputDir = process.env.PCM_TEST_OUTPUT_DIR
    ? path.resolve(process.env.PCM_TEST_OUTPUT_DIR)
    : path.join(os.tmpdir(), "pcm-v994a1-tests");
  fs.mkdirSync(outputDir, {recursive:true});
  fs.writeFileSync(
    path.join(outputDir, "resultados_runtime_v994a1.json"),
    JSON.stringify(tests, null, 2),
    "utf8"
  );

  if(failed.length) process.exit(1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
