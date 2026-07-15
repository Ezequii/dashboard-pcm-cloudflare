// V99.4A — carregamento separado, validação cruzada e cancelamento real.
let __EXECUTIVE_DATA_V994A = null;
let __OPERATIONAL_DATA_V994A = null;
let __PUBLICATION_STATUS_V994A = null;
let __STATIC_DATA_VERSION = "";

class DataNetworkError extends Error {
  constructor(message, status=0){
    super(message);
    this.name = "DataNetworkError";
    this.status = status;
  }
}

class DataTimeoutError extends Error {
  constructor(message){
    super(message);
    this.name = "DataTimeoutError";
  }
}

class DataSchemaError extends Error {
  constructor(message){
    super(message);
    this.name = "DataSchemaError";
  }
}

class DataVersionMismatchError extends Error {
  constructor(message){
    super(message);
    this.name = "DataVersionMismatchError";
  }
}

function appDataFilesV994a(){
  const files = window.PCM_APP_CONFIG?.dataFiles || {};
  return {
    executive: files.executive || "/static/data/executive-data.json",
    operational: files.operational || "/static/data/operational-data.json",
    version: files.version || "/static/data/version.json",
    publicationStatus:
      files.publicationStatus || "/static/data/publication-status.json"
  };
}

function requestTimeoutV994a(){
  return Number(
    window.PCM_APP_CONFIG?.runtime?.requestTimeoutMs || 30000
  );
}

async function fetchJsonV994a(
  url,
  {
    channel,
    timeoutMs=requestTimeoutV994a(),
    version="",
    cacheMode="no-store"
  }={}
){
  const request = window.beginRequestV994a(
    channel || "executive",
    timeoutMs
  );
  const separator = url.includes("?") ? "&" : "?";
  const cacheBuster = version
    ? `v=${encodeURIComponent(version)}`
    : `ts=${Date.now()}`;

  try{
    const response = await fetch(
      `${url}${separator}${cacheBuster}`,
      {
        cache: cacheMode,
        credentials: "same-origin",
        signal: request.signal,
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      }
    );

    if(!response.ok){
      throw new DataNetworkError(
        `Não foi possível carregar ${url} (${response.status}).`,
        response.status
      );
    }

    try{
      return await response.json();
    }catch(error){
      throw new DataSchemaError(
        `O arquivo ${url} não contém JSON válido.`
      );
    }
  }catch(error){
    if(error?.name === "AbortError"){
      const reason = request.signal.reason;
      if(reason === "timeout"){
        throw new DataTimeoutError(
          `A consulta de ${url} excedeu ${Math.round(timeoutMs / 1000)} segundos.`
        );
      }
      const cancelled = new DOMException(
        "Requisição substituída por uma consulta mais recente.",
        "AbortError"
      );
      throw cancelled;
    }
    throw error;
  }finally{
    request.release();
  }
}

function validateVersionPayloadV994a(payload){
  const version = String(payload?.v || "");
  if(!version){
    throw new DataSchemaError(
      "version.json não contém uma versão válida."
    );
  }
  return version;
}

function validateDataPayloadV994a(payload, expectedVersion, kind){
  if(!payload || !Array.isArray(payload.rows)){
    throw new DataSchemaError(
      `${kind} não contém uma lista de registros.`
    );
  }

  const version = String(payload.data_version || "");
  if(!version){
    throw new DataSchemaError(
      `${kind} não informa data_version.`
    );
  }
  if(expectedVersion && version !== String(expectedVersion)){
    throw new DataVersionMismatchError(
      `${kind} está na versão ${version}, mas version.json informa ${expectedVersion}.`
    );
  }
  return payload;
}

function validatePublicationStatusV994a(payload, expectedVersion){
  const version = String(payload?.data_version || "");
  if(!version || version !== String(expectedVersion)){
    throw new DataVersionMismatchError(
      "publication-status.json não corresponde à versão publicada."
    );
  }
  if(payload.status !== "valid"){
    throw new DataSchemaError(
      "A publicação atual não está marcada como válida."
    );
  }
  return payload;
}

async function getDataVersion(){
  const payload = await fetchJsonV994a(
    appDataFilesV994a().version,
    {channel:"version"}
  );
  return validateVersionPayloadV994a(payload);
}

function agingBaseIso(row){
  const etapa = String(row.ETAPA || row._ETAPA || "").toUpperCase();
  if(etapa === "CONCLUÍDO" || etapa === "CONCLUIDO") return "";
  if(row._AGING_BASE_ISO) return String(row._AGING_BASE_ISO);
  if(etapa === "SEM NF"){
    return String(
      row._DATA_PEDIDO_ISO
      || row._DATA_LANCAMENTO_ISO
      || row._DATA_RECEBIMENTO_ISO
      || ""
    );
  }
  if(etapa === "SEM PEDIDO"){
    return String(
      row._DATA_LANCAMENTO_ISO
      || row._DATA_RECEBIMENTO_ISO
      || ""
    );
  }
  return String(row._DATA_RECEBIMENTO_ISO || "");
}

function agingBand(days){
  const value = Math.max(0, Number(days || 0));
  const rules = window.BUSINESS_RULES?.aging || {};
  const critical = Number(rules.critical || 30);
  const high = Number(rules.high || 16);
  const attention = Number(rules.attention || 8);
  if(value > critical) return `${critical}+ dias`;
  if(value >= high) return `${high}+ dias`;
  if(value >= attention) return `${attention}–${Math.max(attention, high - 1)} dias`;
  return `0–${Math.max(0, attention - 1)} dias`;
}

function dynamicSlaStatus(etapa, days){
  const stage = String(etapa || "").toUpperCase();
  const value = Math.max(0, Number(days || 0));
  if(stage === "CONCLUÍDO" || stage === "CONCLUIDO") return "CONCLUÍDO";

  const stageRules = window.BUSINESS_RULES?.slaByStage?.[stage] || {};
  const critical = Number(
    stageRules.critical
    || window.BUSINESS_RULES?.aging?.critical
    || 30
  );
  const attention = Number(
    stageRules.attention
    || window.BUSINESS_RULES?.aging?.attention
    || 8
  );
  if(value >= critical) return "CRÍTICO";
  if(value >= attention) return "ATENÇÃO";
  return "OK";
}

function refreshDynamicAging(rows){
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  rows.forEach(row => {
    const etapa = String(row.ETAPA || row._ETAPA || "").toUpperCase();
    if(etapa === "CONCLUÍDO" || etapa === "CONCLUIDO"){
      row._DIAS_PARADO = 0;
      row["DIAS PARADO"] = 0;
      row["FAIXA ATRASO"] = "Concluído";
      row["SLA STATUS"] = "CONCLUÍDO";
      row["SLA VENCIDO"] = false;
      return;
    }

    const baseIso = agingBaseIso(row);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(baseIso)) return;

    const [year, month, day] = baseIso.split("-").map(Number);
    const baseUtc = Date.UTC(year, month - 1, day);
    const days = Math.max(
      0,
      Math.min(3650, Math.floor((todayUtc - baseUtc) / 86400000))
    );

    row._DIAS_PARADO = days;
    row["DIAS PARADO"] = days;
    row["DIAS SEM MOVIMENTO"] = days;
    row["FAIXA ATRASO"] = agingBand(days);
    row["SLA STATUS"] = dynamicSlaStatus(etapa, days);
    row["SLA VENCIDO"] = ["ATENÇÃO", "CRÍTICO"].includes(
      row["SLA STATUS"]
    );
  });
}

async function fetchExecutiveBundleV994a(expectedVersion){
  const files = appDataFilesV994a();
  const [executive, publication] = await Promise.all([
    fetchJsonV994a(
      files.executive,
      {
        channel:"executive",
        version:expectedVersion
      }
    ),
    fetchJsonV994a(
      files.publicationStatus,
      {
        channel:"publication",
        version:expectedVersion
      }
    )
  ]);

  validateDataPayloadV994a(
    executive,
    expectedVersion,
    "executive-data.json"
  );
  validatePublicationStatusV994a(publication, expectedVersion);
  refreshDynamicAging(executive.rows);
  return {executive, publication};
}

async function fetchOperationalPayloadV994a(expectedVersion){
  window.SecurityV994a?.assertOperationalAccess();
  const payload = await fetchJsonV994a(
    appDataFilesV994a().operational,
    {
      channel:"operational",
      version:expectedVersion
    }
  );
  validateDataPayloadV994a(
    payload,
    expectedVersion,
    "operational-data.json"
  );

  const limit = Number(
    window.PCM_APP_CONFIG?.runtime?.maxOperationalRowsInMemory || 25000
  );
  if(payload.rows.length > limit){
    throw new DataSchemaError(
      `A base possui ${payload.rows.length.toLocaleString("pt-BR")} registros e excede o limite de ${limit.toLocaleString("pt-BR")}.`
    );
  }

  refreshDynamicAging(payload.rows);
  return payload;
}

function commitExecutiveBundleV994a(bundle, version){
  __EXECUTIVE_DATA_V994A = bundle.executive;
  __PUBLICATION_STATUS_V994A = bundle.publication;
  __STATIC_DATA_VERSION = String(version);
  state.dataVersion = String(version);
  state.generatedAt = bundle.executive.generated_at || "";
  state.publicationStatus = bundle.publication;
  window.markDataSuccessV994a?.({
    dataVersion:version,
    generatedAt:state.generatedAt
  });
}

function commitOperationalPayloadV994a(payload){
  __OPERATIONAL_DATA_V994A = payload;
}

async function loadExecutiveDataV994a(force=false){
  if(__EXECUTIVE_DATA_V994A && !force){
    refreshDynamicAging(__EXECUTIVE_DATA_V994A.rows || []);
    return __EXECUTIVE_DATA_V994A;
  }

  const version = await getDataVersion();
  const bundle = await fetchExecutiveBundleV994a(version);
  commitExecutiveBundleV994a(bundle, version);
  return __EXECUTIVE_DATA_V994A;
}

async function loadOperationalDataV994a(force=false){
  window.SecurityV994a?.assertOperationalAccess();

  if(__OPERATIONAL_DATA_V994A && !force){
    refreshDynamicAging(__OPERATIONAL_DATA_V994A.rows || []);
    return __OPERATIONAL_DATA_V994A;
  }

  const version = __STATIC_DATA_VERSION || await getDataVersion();
  const payload = await fetchOperationalPayloadV994a(version);
  commitOperationalPayloadV994a(payload);
  return __OPERATIONAL_DATA_V994A;
}

async function refreshPublishedDataV994a({
  includeOperational=false
}={}){
  const version = await getDataVersion();
  const bundlePromise = fetchExecutiveBundleV994a(version);
  const operationalPromise = includeOperational
    ? fetchOperationalPayloadV994a(version)
    : Promise.resolve(null);

  const [bundle, operational] = await Promise.all([
    bundlePromise,
    operationalPromise
  ]);

  commitExecutiveBundleV994a(bundle, version);
  if(operational) commitOperationalPayloadV994a(operational);
  else __OPERATIONAL_DATA_V994A = null;

  cacheClear();
  return {
    version,
    executive:bundle.executive,
    operational,
    publication:bundle.publication
  };
}

function versionChangedV994a(currentVersion, remoteVersion){
  const current = String(currentVersion || "");
  const remote = String(remoteVersion || "");
  return Boolean(current && remote && current !== remote);
}

async function checkForDataUpdates(){
  const remoteVersion = await getDataVersion();
  if(!__STATIC_DATA_VERSION){
    __STATIC_DATA_VERSION = remoteVersion;
    state.dataVersion = remoteVersion;
    return false;
  }
  return versionChangedV994a(__STATIC_DATA_VERSION, remoteVersion);
}

function assertOperationalAccessV994a(){
  window.SecurityV994a?.assertOperationalAccess();
}

async function api(path, body=null, asBlob=false){
  if(path === "/api/bootstrap"){
    const db = await loadExecutiveDataV994a(false);
    return {
      ...db.boot,
      generated_at:db.generated_at,
      data_version:__STATIC_DATA_VERSION,
      publication_status:__PUBLICATION_STATUS_V994A
    };
  }

  if(path === "/api/refresh"){
    const includeOperational = Boolean(
      __OPERATIONAL_DATA_V994A || state.activeTab === "base"
    );
    const refreshed = await refreshPublishedDataV994a({
      includeOperational
    });
    return {
      ok:true,
      message:"Dados atualizados",
      linhas:Number(refreshed.publication?.records || 0),
      generated_at:refreshed.executive.generated_at || "",
      data_version:refreshed.version,
      metadata:refreshed.executive.boot?.metadata || {},
      publication_status:refreshed.publication
    };
  }

  if(path === "/api/options"){
    const db = await loadExecutiveDataV994a(false);
    return staticOptions(db.rows, body || {});
  }

  if(path === "/api/dashboard"){
    const db = await loadExecutiveDataV994a(false);
    return staticDashboard(db.rows, body || {});
  }

  if(path === "/api/rows"){
    assertOperationalAccessV994a();
    const db = await loadOperationalDataV994a(false);
    return staticRows(db.rows, body || {});
  }

  if(path === "/api/row"){
    assertOperationalAccessV994a();
    const db = await loadOperationalDataV994a(false);
    return staticRowDetail(db.rows, body || {});
  }

  if(path.startsWith("/api/export/")){
    assertOperationalAccessV994a();
    const kind = path.split("/").pop();
    if(!["csv", "excel"].includes(kind)){
      throw new Error("Formato de exportação não suportado.");
    }
    const db = await loadOperationalDataV994a(false);
    const data = staticRows(
      db.rows,
      {...(body || {}), page:1, page_size:100000}
    );
    const csv = toCsv(data.columns, data.rows);
    return new Blob([csv], {type:"text/csv;charset=utf-8"});
  }

  if(path === "/api/upload-workbook"){
    throw new Error(
      "A troca da base no Cloudflare Pages é feita por nova publicação."
    );
  }

  throw new Error("Rota estática não suportada: " + path);
}

window.versionChangedV994a = versionChangedV994a;
window.resolveStaticColumnsV994a3 = resolveStaticColumnsV994a3;
window.fetchJsonV994a = fetchJsonV994a;
window.refreshPublishedDataV994a = refreshPublishedDataV994a;
window.getDataVersion = getDataVersion;
window.checkForDataUpdates = checkForDataUpdates;

function baseQuery(){
  return {
    filters: state.filters,
    search: '',
    search_scope: state.searchScope || 'ALL',
    multi_search_terms: Array.isArray(state.multiSearchTerms) ? state.multiSearchTerms : [],
    multi_search_mode: state.multiSearchMode || 'ANY',
    page: state.page,
    page_size: state.pageSize,
    sort_col: state.sortCol,
    sort_dir: state.sortDir,
    date_from: state.dateFrom || '',
    date_to: state.dateTo || '',
    value_min: state.valueMin !== '' ? Number(state.valueMin) : null,
    value_max: state.valueMax !== '' ? Number(state.valueMax) : null,
  };
}

function tableQuery(){ return {...baseQuery(), search: state.search}; }

function hydrateAdvancedSearch(){
  [['advDateFrom', state.dateFrom], ['advDateTo', state.dateTo], ['advValueMin', state.valueMin], ['advValueMax', state.valueMax]].forEach(([id,value])=>{ const el=$(id); if(el) el.value=value||''; });
}

function exportSlug(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);
}

function exportFilename(){
  const parts = ['pcm'];
  const etapa = (state.filters.ETAPA || [])[0];
  const fornecedor = (state.filters.FORNECEDOR || [])[0];
  const solicitante = (state.filters.SOLICITANTE || [])[0];
  if(etapa) parts.push(exportSlug(etapa));
  if(fornecedor) parts.push(exportSlug(fornecedor));
  else if(solicitante) parts.push(exportSlug(solicitante));
  const date = new Date().toISOString().slice(0,10);
  return `${parts.filter(Boolean).join('_')}_${date}.csv`;
}

async function exportFile(kind='csv'){
  try{
    setLoading(true);
    const blob = await api('/api/export/csv', tableQuery(), true);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFilename();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('CSV da visão atual exportado com sucesso.');
  }catch(error){
    showToast(error.message || 'Não foi possível exportar o CSV.', true);
    showDataStatus('Falha na exportação', error.message || 'Tente novamente.', 'error');
  }finally{
    setLoading(false);
  }
}

async function uploadWorkbook(){ throw new Error('Atualização da base no Cloudflare Pages é via GitHub.'); }

const STAGE_ORDER_STATIC = ['SEM LANÇAMENTO','SEM PEDIDO','SEM NF','CONCLUÍDO'];
const STAGE_COLORS_STATIC = {'SEM LANÇAMENTO':'#D32F2F','SEM PEDIDO':'#F2A900','SEM NF':'#00629E','CONCLUÍDO':'#23A067'};
function normalizeText(v){ return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
function cleanStatic(v){ const s=String(v ?? '').trim(); return ['NAN','NAT','NONE','NULL','N/A'].includes(s.toUpperCase()) ? '' : s; }
function n(v){ const x=Number(v); return Number.isFinite(x) ? x : 0; }
function brInt(v){ return Math.round(n(v)).toLocaleString('pt-BR'); }
function brPct(v){ return `${n(v).toFixed(1).replace('.', ',')}%`; }
function brMoney(v){ return n(v).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }
function compactMoney(v){ const val=n(v), abs=Math.abs(val); if(abs>=1000000) return `R$ ${(val/1000000).toFixed(1).replace('.', ',')} mi`; if(abs>=1000) return `R$ ${(val/1000).toFixed(0).replace('.', ',')} mil`; return brMoney(val); }
function average(arr){ const vals=arr.map(n).filter(x=>Number.isFinite(x)); return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0; }
function uniqueCount(rows, key){ return new Set(rows.map(r=>cleanStatic(r[key])).filter(Boolean)).size; }
function pendingRows(rows){ return rows.filter(r => r.ETAPA !== 'CONCLUÍDO'); }
function stageRows(rows, etapa){ return rows.filter(r => r.ETAPA === etapa); }
function stageSummary(rows, etapa){
  const ss = stageRows(rows, etapa);
  const valor = ss.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const maxDias = Math.max(0, ...ss.map(r=>n(r._DIAS_PARADO)));
  return {qtd:ss.length, valor, maxDias, rows:ss};
}


const SEARCH_SCOPE_FIELDS = {
  ALL:['Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA','FORNECEDOR','SOLICITANTE','EQUIPAMENTO','PREFIXO','Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE','ETAPA'],
  REQUISICAO:['Nº REQUISIÇÃO'],
  PEDIDO:['Nº PEDIDO DE COMPRA'],
  FORNECEDOR:['FORNECEDOR'],
  SOLICITANTE:['SOLICITANTE'],
  EQUIPAMENTO:['EQUIPAMENTO','PREFIXO'],
  DOCUMENTO:['Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE'],
};
const SEARCH_CODE_FIELDS = ['Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA','Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE','PREFIXO'];
function normalizeSearchValue(value){
  return normalizeText(cleanStatic(value)).replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function searchFieldText(row, fields){
  return fields.map(field => normalizeSearchValue(row[field])).filter(Boolean).join(' ');
}
function exactCodeMatch(value, term){
  const normalized = normalizeSearchValue(value);
  if(!normalized) return false;
  return normalized === term || normalized.split(' ').includes(term);
}
function smartSearchRows(rows, rawSearch, scope='ALL'){
  const term = normalizeSearchValue(String(rawSearch || '').slice(0,200));
  if(!term) return rows;
  const fields = SEARCH_SCOPE_FIELDS[scope] || SEARCH_SCOPE_FIELDS.ALL;
  const tokens = term.split(' ').filter(Boolean);
  const codeFields = scope === 'ALL' ? SEARCH_CODE_FIELDS : fields.filter(field => SEARCH_CODE_FIELDS.includes(field));
  const singleCodeLike = tokens.length === 1 && /^[A-Z0-9\-/.]{3,}$/.test(term);
  if(singleCodeLike && codeFields.length){
    const exact = rows.filter(row => codeFields.some(field => exactCodeMatch(row[field], term)));
    if(exact.length) return exact;
  }
  return rows.filter(row => {
    const haystack = searchFieldText(row, fields);
    return tokens.every(token => haystack.includes(token));
  });
}

function normalizeMultiSearchTerms(values){
  const source = Array.isArray(values) ? values : [values];
  const terms = [];
  source.forEach(value => {
    String(value ?? '')
      .split(/[\n,;|]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .forEach(item => {
        const normalized = normalizeSearchValue(item).slice(0, 160);
        if(normalized && !terms.includes(normalized)) terms.push(normalized);
      });
  });
  return terms.slice(0, 500);
}

function multiSearchRows(rows, rawTerms, scope='ALL', mode='ANY'){
  const terms = normalizeMultiSearchTerms(rawTerms);
  if(!terms.length) return rows;

  const fields = SEARCH_SCOPE_FIELDS[scope] || SEARCH_SCOPE_FIELDS.ALL;
  const codeFields = scope === 'ALL'
    ? SEARCH_CODE_FIELDS
    : fields.filter(field => SEARCH_CODE_FIELDS.includes(field));
  const requireAll = String(mode || 'ANY').toUpperCase() === 'ALL';

  return rows.filter(row => {
    const haystack = searchFieldText(row, fields);
    const matches = terms.map(term => {
      const codeLike = /^[A-Z0-9\-/.]{3,}$/.test(term);
      if(codeLike && codeFields.some(field => exactCodeMatch(row[field], term))){
        return true;
      }
      return haystack.includes(term);
    });
    return requireAll ? matches.every(Boolean) : matches.some(Boolean);
  });
}


function applyStaticQuery(rows, query={}){
  try{
    let out = rows.slice();
    const filters = query.filters || {};
    for(const [key, values] of Object.entries(filters)){
      const vals = (values || []).filter(v=>String(v).trim());
      if(!vals.length) continue;
      const set = new Set(vals.map(String));
      out = out.filter(r => set.has(String(r[key] ?? '')));
    }
    if(query.search){
      out = smartSearchRows(out, query.search, String(query.search_scope || 'ALL').toUpperCase());
    }
    if(Array.isArray(query.multi_search_terms) && query.multi_search_terms.length){
      out = multiSearchRows(
        out,
        query.multi_search_terms,
        String(query.search_scope || 'ALL').toUpperCase(),
        String(query.multi_search_mode || 'ANY').toUpperCase()
      );
    }
    if(query.date_from){
      const dateFrom = String(query.date_from || '').substring(0, 10);
      if(/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) out = out.filter(r => String(r._DATA_RECEBIMENTO_ISO || '') >= dateFrom);
    }
    if(query.date_to){
      const dateTo = String(query.date_to || '').substring(0, 10);
      if(/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) out = out.filter(r => String(r._DATA_RECEBIMENTO_ISO || '') <= dateTo);
    }
    if(query.value_min !== null && query.value_min !== undefined){
      const min = n(query.value_min);
      if(Number.isFinite(min)) out = out.filter(r => n(r._VALOR_TOTAL) >= min);
    }
    if(query.value_max !== null && query.value_max !== undefined){
      const max = n(query.value_max);
      if(Number.isFinite(max)) out = out.filter(r => n(r._VALOR_TOTAL) <= max);
    }
    return sortStaticRows(out, query.sort_col || 'ETAPA', String(query.sort_dir || 'asc').toLowerCase());
  }catch(err){
    console.error('Erro em applyStaticQuery:', err);
    return sortStaticRows(rows.slice(), 'ETAPA', 'asc');
  }
}

function sortValue(row, col){
  if(['VALOR TOTAL','VALOR PEÇAS','VALOR SERVIÇO'].includes(col)) return n(col==='VALOR TOTAL'?row._VALOR_TOTAL:(col==='VALOR PEÇAS'?row._VALOR_PECAS:row._VALOR_SERVICO));
  if(['DIAS PARADO','DIAS SEM MOVIMENTO'].includes(col)) return n(row._DIAS_PARADO);
  if(col === 'DATA DE RECEBIMENTO') return row._DATA_RECEBIMENTO_ISO || '';
  if(col === 'DATA LANÇAMENTO') return row._DATA_LANCAMENTO_ISO || '';
  if(col === 'DATA DO PEDIDO') return row._DATA_PEDIDO_ISO || '';
  if(col === 'DATA LANÇAMENTO NFS') return row._DATA_NF_ISO || '';
  return String(row[col] ?? '');
}
function etapaRank(row){
  const ordem = {
    'SEM LANCAMENTO':0,
    'SEM PEDIDO':1,
    'SEM NF':2,
    'CONCLUIDO':3
  };
  return ordem[normalizeText(row.ETAPA || row._ETAPA || '')] ?? 9;
}
function compareStaticValuesV994a4(a, b, col){
  const av = sortValue(a, col);
  const bv = sortValue(b, col);
  if(typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(
    String(bv),
    'pt-BR',
    {numeric:true, sensitivity:'base'}
  );
}

function compareWithinStageV994a4(a, b){
  const ageCmp = n(b._DIAS_PARADO) - n(a._DIAS_PARADO);
  if(ageCmp) return ageCmp;

  const valueCmp = n(b._VALOR_TOTAL) - n(a._VALOR_TOTAL);
  if(valueCmp) return valueCmp;

  return String(a['Nº REQUISIÇÃO'] || a._ROW_ID || '').localeCompare(
    String(b['Nº REQUISIÇÃO'] || b._ROW_ID || ''),
    'pt-BR',
    {numeric:true, sensitivity:'base'}
  );
}

function sortStaticRows(rows, col, dir){
  const desc = dir === 'desc';
  return rows.slice().sort((a,b)=>{
    if(col === 'ETAPA'){
      const stageCmp = etapaRank(a) - etapaRank(b);
      if(stageCmp) return desc ? -stageCmp : stageCmp;
      return compareWithinStageV994a4(a, b);
    }

    const cmp = compareStaticValuesV994a4(a, b, col);
    return desc ? -cmp : cmp;
  });
}

function staticOptions(rows, query){
  try{
    const key = String(query.filter_key || '').substring(0, 100);
    if(!key) throw new Error('filter_key invalida');
    const filterCopy = JSON.parse(JSON.stringify(query.filters || {}));
    filterCopy[key] = [];
    let out = applyStaticQuery(rows, {...query, filters:filterCopy, search:''});
    let opts = Array.from(new Set(out.map(r=>cleanStatic(r[key])).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true,sensitivity:'base'}));
    if(query.option_search){ 
      const term = normalizeText(String(query.option_search || '').substring(0, 100)); 
      opts = opts.filter(x=>normalizeText(x).includes(term)); 
    }
    const selected = ((query.filters || {})[key] || []).filter(Boolean);
    const limit = Math.max(10, Math.min(Number(query.limit || 50), 300));
    const ordered = Array.from(new Set([...selected, ...opts.slice(0, limit)]));
    return {options:ordered, total:opts.length};
  }catch(err){
    console.error('Erro em staticOptions:', err);
    return {options:[], total:0};
  }
}

function resolveStaticColumnsV994a3(){
  return (
    __OPERATIONAL_DATA_V994A?.columns
    || __EXECUTIVE_DATA_V994A?.boot?.table_columns
    || []
  ).filter(Boolean);
}

function staticRows(rows, query){
  try{
    const out = applyStaticQuery(rows, query);
    const columns = resolveStaticColumnsV994a3();
    const total = out.length;
    const pageSize = Math.max(10, Math.min(Number(query.page_size || 50), 100000));
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, Number(query.page || 1)), pages);
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const pageRows = out.slice(start, end).map(row => {
      const rec = {};
      columns.forEach(c => {
        const val = row[c];
        rec[c] = (val === null || val === undefined) ? '' : String(val);
      });
      rec._ETAPA = row._ETAPA || row.ETAPA || '';
      rec._ROW_ID = row._ROW_ID || 0;
      rec._VALOR_TOTAL = n(row._VALOR_TOTAL ?? row['VALOR TOTAL']);
      return rec;
    });
    return {columns, rows:pageRows, total, page, page_size:pageSize, pages, from: total ? start+1 : 0, to:end};
  }catch(err){
    console.error('Erro em staticRows:', err);
    throw err;
  }
}

function staticRowDetail(rows, query={}){
  const rowId = Number(query.row_id || 0);
  if(!rowId) return {row:null};
  const row = rows.find(item => Number(item._ROW_ID || 0) === rowId);
  if(!row) return {row:null};

  const result = {};
  Object.entries(row).forEach(([key, value]) => {
    if(key.startsWith('_') && !['_ROW_ID','_ETAPA','_VALOR_TOTAL','_DIAS_PARADO'].includes(key)){
      return;
    }
    result[key] = value === null || value === undefined ? '' : value;
  });
  return {row:result};
}

function groupByStage(rows){
  const total = rows.length || 1;
  const map = new Map();
  rows.forEach(r=>{
    const etapa = cleanStatic(r.ETAPA) || 'NÃO INFORMADO';
    if(!map.has(etapa)) map.set(etapa, {etapa, qtd:0, valor:0, fora_sla:0, criticas:0, max_dias:0, idade_media_total:0});
    const item = map.get(etapa);
    item.qtd += 1;
    item.valor += n(r._VALOR_TOTAL);
    item.max_dias = Math.max(item.max_dias, n(r._DIAS_PARADO));
    item.idade_media_total += n(r._DIAS_PARADO);
    if(['ATENÇÃO','CRÍTICO'].includes(r['SLA STATUS'])) item.fora_sla += 1;
    if(r['SLA STATUS'] === 'CRÍTICO') item.criticas += 1;
  });
  const rowsOut = Array.from(map.values()).sort((a,b)=>{
    const ia=STAGE_ORDER_STATIC.indexOf(a.etapa), ib=STAGE_ORDER_STATIC.indexOf(b.etapa);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });
  return rowsOut.map(e=>({
    ...e,
    percentual: e.qtd / total * 100,
    valor_formatado: compactMoney(e.valor),
    valor_completo: brMoney(e.valor),
    percentual_formatado: brPct(e.qtd / total * 100),
    cor: STAGE_COLORS_STATIC[e.etapa] || '#4A4A4A',
    valor_fora_sla: compactMoney(0),
    idade_media: e.qtd ? e.idade_media_total / e.qtd : 0,
  }));
}
function topSum(rows, groupCol, count=8){
  const map = new Map();
  rows.forEach(row => {
    const label = cleanStatic(row[groupCol]) || 'NÃO INFORMADO';
    if(!map.has(label)) map.set(label, {label, value:0, qtd:0});
    const item = map.get(label);
    item.value += n(row._VALOR_TOTAL);
    item.qtd += 1;
  });
  return Array.from(map.values())
    .sort((a,b) => b.value - a.value || b.qtd - a.qtd)
    .slice(0, count)
    .map(item => ({
      label:String(item.label),
      display_label:String(item.label).length > 80 ? `${String(item.label).slice(0,79)}…` : String(item.label),
      value:item.value,
      formatted:compactMoney(item.value),
      full:brMoney(item.value),
      qtd:item.qtd,
      meta:`${item.qtd.toLocaleString('pt-BR')} RC${item.qtd !== 1 ? 's' : ''}`
    }));
}
function topCount(rows, groupCol, count=8){
  const map = new Map(); rows.forEach(r=>{ const label=cleanStatic(r[groupCol]) || 'NÃO INFORMADO'; map.set(label,(map.get(label)||0)+1); });
  return Array.from(map.entries()).map(([label,value])=>({label:String(label).slice(0,80),value,formatted:brInt(value)})).sort((a,b)=>b.value-a.value).slice(0,count);
}
function oldestPending(rows){
  const pend = pendingRows(rows).sort((a,b)=> n(b._DIAS_PARADO)-n(a._DIAS_PARADO) || n(b._VALOR_TOTAL)-n(a._VALOR_TOTAL));
  if(!pend.length) return {dias:0,label:'Sem pendência',label_type:'',detail:'Tudo concluído',etapa:''};
  const r = pend[0];
  const references = [
    ['Nº ORÇAMENTO FINAL','Orçamento'],
    ['Nº REQUISIÇÃO','Requisição'],
    ['Nº PEDIDO DE COMPRA','Pedido'],
    ['Nº ORDEM SERVIÇO','OS'],
    ['PREFIXO','Prefixo']
  ];
  let label = 'Sem código';
  let labelType = 'Referência';
  for(const [field, type] of references){
    const value = cleanStatic(r[field]);
    if(value){ label = value; labelType = type; break; }
  }
  const forn = cleanStatic(r.FORNECEDOR) || 'Fornecedor não informado';
  return {
    dias:n(r._DIAS_PARADO),
    label,
    label_type:labelType,
    detail:`${forn} · ${r.ETAPA || ''}`,
    etapa:r.ETAPA || '',
    fornecedor:forn,
    valor:compactMoney(r._VALOR_TOTAL),
    valor_full:brMoney(r._VALOR_TOTAL)
  };
}
function farolRegional(rows){
  const total = rows.length;
  const concluidas = rows.filter(r=>r.ETAPA === 'CONCLUÍDO').length;
  const pend = pendingRows(rows);
  const totalPend = pend.length;
  const valorPend = pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const pctConcluido = total ? concluidas/total*100 : 0;
  const pctPendente = total ? totalPend/total*100 : 0;
  const semLanc = stageSummary(rows, 'SEM LANÇAMENTO');
  const semPedido = stageSummary(rows, 'SEM PEDIDO');
  const semNf = stageSummary(rows, 'SEM NF');
  const valorAcompanhar = semLanc.valor;
  const maxGeral = Math.max(0, ...pend.map(r=>n(r._DIAS_PARADO)));

  if(!totalPend){
    return {
      status:'BOM',
      label:'100% concluído · sem fila aberta',
      detail:'Tudo lançado, pedido e NF concluídos no filtro atual',
      pct_rcs_fora_sla:0,
      pct_valor_fora_sla:0,
      pct_pendente_total:0,
      maior_atraso_dias:0,
      valor_fora_sla:brMoney(0),
      valor_fora_sla_compacto:compactMoney(0),
      valor_pendente:brMoney(0),
      valor_pendente_compacto:compactMoney(0),
      rcs_fora_sla:0,
      rcs_criticas:0,
      rcs_atrasadas:0,
      rcs_sem_lancamento:0,
      valor_sem_lancamento:brMoney(0),
      valor_sem_lancamento_compacto:compactMoney(0),
      action_hint:'Sem ação pendente'
    };
  }

  // Leitura para liderança: o principal é o % concluído.
  // Dias só pesam forte quando a fila direta do PCM (SEM LANÇAMENTO) está alta ou muito velha.
  const pctSemLanc = total ? semLanc.qtd/total*100 : 0;
  const conclusaoExcelente = pctConcluido >= 92 && semLanc.qtd <= 50;
  const conclusaoBoa = pctConcluido >= 80 && semLanc.qtd <= 130;
  const precisaRevisar = pctConcluido < 70 || semLanc.qtd >= 220 || semLanc.maxDias >= 90;

  let status = 'BOM';
  if(conclusaoExcelente) status = 'EXCELENTE';
  else if(conclusaoBoa) status = 'BOM';
  else if(precisaRevisar) status = 'REVISAR';
  else status = 'ATENÇÃO';

  const label = status === 'EXCELENTE'
    ? `${brPct(pctConcluido)} concluído · fila muito enxuta`
    : status === 'BOM'
      ? `${brPct(pctConcluido)} concluído · rotina sob controle`
      : status === 'ATENÇÃO'
        ? `${brPct(pctConcluido)} concluído · revisar fila PCM`
        : `${brPct(pctConcluido)} concluído · reorganizar lançamentos`;

  const detail = `${brInt(semLanc.qtd)} sem lançamento · ${brInt(semPedido.qtd)} sem pedido · ${brInt(semNf.qtd)} sem NF`;
  const rcsAcompanhar = semLanc.qtd;
  return {
    status,
    label,
    detail,
    pct_concluido:pctConcluido,
    pct_rcs_fora_sla:pctSemLanc,
    pct_valor_fora_sla: valorPend ? valorAcompanhar/valorPend*100 : 0,
    pct_pendente_total:pctPendente,
    pct_criticas: totalPend ? pend.filter(r=>n(r._DIAS_PARADO)>=60).length/totalPend*100 : 0,
    pct_valor_critico:0,
    maior_atraso_dias:maxGeral,
    valor_fora_sla:brMoney(valorAcompanhar),
    valor_fora_sla_compacto:compactMoney(valorAcompanhar),
    valor_pendente:brMoney(valorPend),
    valor_pendente_compacto:compactMoney(valorPend),
    rcs_fora_sla:rcsAcompanhar,
    rcs_criticas:semLanc.rows.filter(r=>n(r._DIAS_PARADO)>=45).length,
    rcs_atrasadas:rcsAcompanhar,
    rcs_sem_lancamento:semLanc.qtd,
    valor_sem_lancamento:brMoney(semLanc.valor),
    valor_sem_lancamento_compacto:compactMoney(semLanc.valor),
    sem_pedido:semPedido.qtd,
    sem_nf:semNf.qtd,
    score:Math.round((100-pctConcluido) + pctSemLanc*3 + Math.min(semLanc.maxDias,90)/3),
    action_hint: status === 'REVISAR' ? 'Reorganizar fila de lançamento' : status === 'ATENÇÃO' ? 'Revisar fila PCM' : 'Manter rotina e acompanhar exceções'
  };
}

function stageActionTitle(etapa){
  if(etapa === 'SEM NF') return 'Conferir NF';
  if(etapa === 'SEM PEDIDO') return 'Acompanhar pedido';
  if(etapa === 'SEM LANÇAMENTO') return 'Conferir lançamento';
  return 'Tratar pendência';
}
function stageActionKind(etapa){
  if(etapa === 'SEM NF') return 'nf';
  if(etapa === 'SEM PEDIDO') return 'pedido';
  if(etapa === 'SEM LANÇAMENTO') return 'lancamento';
  return 'acao';
}
function stageOwnerDefault(etapa){
  if(etapa === 'SEM NF') return 'Fornecedor';
  if(etapa === 'SEM PEDIDO') return 'Compras';
  if(etapa === 'SEM LANÇAMENTO') return 'PCM';
  return 'Responsável';
}
function urgencyLabel(days, value, etapa=''){
  const d=n(days), v=n(value);
  if(etapa === 'SEM LANÇAMENTO'){
    if(d >= 30 || v >= 250000) return 'Conferir primeiro';
    if(d >= 15 || v >= 100000) return 'Conferir na sequência';
    return 'Rotina PCM';
  }
  if(etapa === 'SEM PEDIDO'){
    if(d >= 30 || v >= 250000) return 'Acompanhar pedido';
    if(d >= 15 || v >= 100000) return 'Acompanhar';
    return 'Em acompanhamento';
  }
  if(etapa === 'SEM NF'){
    if(d >= 30 || v >= 250000) return 'Conferir NF';
    if(d >= 15 || v >= 100000) return 'Acompanhar NF';
    return 'Aguardando NF';
  }
  if(d >= 60 || v >= 500000) return 'Entender causa';
  if(d >= 30 || v >= 150000) return 'Acompanhar de perto';
  return 'Monitorar';
}

function priorityRows(rows, count=5){
  const pending = pendingRows(rows);
  if(!pending.length) return [];

  const groups = new Map();
  pending.forEach(row => {
    const etapa = row.ETAPA || 'PENDÊNCIA';
    const fornecedor = cleanStatic(row.FORNECEDOR) || 'Fornecedor não informado';
    const explicitOwner = cleanStatic(row['DONO DA AÇÃO']);
    const owner = explicitOwner || stageOwnerDefault(etapa);
    const key = `${etapa}||${fornecedor}||${owner}`;

    if(!groups.has(key)){
      groups.set(key, {
        etapa,
        fornecedor,
        owner,
        filterOwner:explicitOwner,
        qtd:0,
        valor:0,
        maxDias:0,
        codigos:[],
        rows:[]
      });
    }

    const group = groups.get(key);
    group.qtd += 1;
    group.valor += n(row._VALOR_TOTAL);
    group.maxDias = Math.max(group.maxDias, n(row._DIAS_PARADO));
    const codigo = cleanStatic(row['Nº ORÇAMENTO FINAL']) || cleanStatic(row['Nº REQUISIÇÃO']) || '';
    if(codigo && group.codigos.length < 3) group.codigos.push(codigo);
    group.rows.push(row);
  });

  const groupsArray = Array.from(groups.values());
  const maxValue = Math.max(1, ...groupsArray.map(group => group.valor));
  const maxDays = Math.max(1, ...groupsArray.map(group => group.maxDias));
  const maxQuantity = Math.max(1, ...groupsArray.map(group => group.qtd));
  const stageWeight = {
    'SEM LANÇAMENTO':1.0,
    'SEM PEDIDO':0.45,
    'SEM NF':0.35,
    'CONCLUÍDO':0
  };

  return groupsArray
    .map(group => {
      const score =
        60 * (stageWeight[group.etapa] ?? 0.35) +
        20 * (group.maxDias / maxDays) +
        15 * (group.valor / maxValue) +
        5 * (group.qtd / maxQuantity);
      const action = stageActionTitle(group.etapa);
      const urgency = urgencyLabel(group.maxDias, group.valor, group.etapa);
      const fallbackCode = group.codigos[0] || `${group.qtd} RC${group.qtd !== 1 ? 's' : ''}`;

      return {
        codigo:action,
        fornecedor:group.fornecedor.length > 70 ? `${group.fornecedor.slice(0,69)}…` : group.fornecedor,
        fornecedor_filter:group.fornecedor,
        etapa:group.etapa,
        dias:group.maxDias,
        valor:group.valor,
        valor_fmt:compactMoney(group.valor),
        valor_full:brMoney(group.valor),
        owner_team:group.owner,
        owner_filter:group.filterOwner,
        owner_proxy:group.fornecedor,
        sla_status:urgency,
        score,
        row_id:group.rows[0]?._ROW_ID,
        qtd:group.qtd,
        qtd_fmt:`${brInt(group.qtd)} RC${group.qtd !== 1 ? 's' : ''}`,
        action,
        urgency,
        reason:`${urgency} · ${brInt(group.qtd)} RC${group.qtd !== 1 ? 's' : ''} · ${brInt(group.maxDias)} dias`,
        codigos:group.codigos.join(', ') || fallbackCode
      };
    })
    .sort((a,b) => b.score - a.score || b.valor - a.valor || b.dias - a.dias)
    .slice(0, count);
}
function topPendingByStage(rows, etapa){ const subset=rows.filter(r=>r.ETAPA===etapa); return topSum(subset,'FORNECEDOR',1)[0] || null; }
function executiveActions(rows){
  const actions=[];
  const pend = pendingRows(rows);
  if(!pend.length) return actions;

  const lancamentos = priorityRows(rows.filter(r=>r.ETAPA === 'SEM LANÇAMENTO'), 1)[0];
  if(lancamentos){
    actions.push({
      kind:'lancamento',
      title:'Meu foco',
      main:lancamentos.fornecedor,
      value:lancamentos.action,
      detail:lancamentos.reason,
      etapa:'SEM LANÇAMENTO',
      owner:'PCM'
    });
  }

  const semLanc = stageSummary(rows, 'SEM LANÇAMENTO');
  if(semLanc.qtd){
    actions.push({
      kind:'lancamento',
      title:'Fila PCM',
      main:'Sem lançamento',
      value:`${brInt(semLanc.qtd)} RCs`,
      detail:`${compactMoney(semLanc.valor)} para lançar/conferir`,
      etapa:'SEM LANÇAMENTO',
      owner:'PCM'
    });
  }

  const semPedido = stageSummary(rows, 'SEM PEDIDO');
  if(semPedido.qtd){
    actions.push({
      kind:'pedido',
      title:'Acompanhar',
      main:'Sem pedido',
      value:`${brInt(semPedido.qtd)} RCs`,
      detail:`${compactMoney(semPedido.valor)} aguardando pedido`,
      etapa:'SEM PEDIDO',
      owner:'Compras'
    });
  }

  const semNf = stageSummary(rows, 'SEM NF');
  if(semNf.qtd){
    actions.push({
      kind:'nf',
      title:'Conferir NF',
      main:'Sem NF',
      value:`${brInt(semNf.qtd)} RCs`,
      detail:`${compactMoney(semNf.valor)} aguardando NF`,
      etapa:'SEM NF',
      owner:'Fornecedor'
    });
  }

  const seen = new Set();
  return actions.filter(a=>{
    const key=`${a.title}|${a.main}|${a.etapa}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0,4);
}
function topOwnersCriticos(rows){
  const pend = pendingRows(rows);
  return topSum(pend,'DONO DA AÇÃO',6);
}
function operationalAlerts(rows){
  const etapas = groupByStage(rows).filter(e=>e.etapa!=='CONCLUÍDO').map(e=>({label:e.etapa.replace('NF','NF').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).replace('Nf','NF'),value:brInt(e.qtd),detail:compactMoney(e.valor),full:brMoney(e.valor),tone:e.etapa.toLowerCase().replace(/ /g,'-')}));
  const pend=pendingRows(rows);
  const valorP = pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  return {atencao:etapas,idade_pendencias:['SEM LANÇAMENTO','SEM PEDIDO','SEM NF'].map(etapa=>{ const ss=rows.filter(r=>r.ETAPA===etapa); return {label:etapa.replace('NF','NF').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).replace('Nf','NF'),media:`${average(ss.map(r=>r._DIAS_PARADO)).toFixed(1).replace('.',',')} dias`,maximo:`${Math.max(0,...ss.map(r=>n(r._DIAS_PARADO))).toFixed(1).replace('.',',')} dias`,qtd:ss.length,tone:etapa.toLowerCase().replace(/ /g,'-')}; }),maior_gargalo:{label:'',formatted:''},pendentes:pend.length,valor_pendente:brMoney(valorP),valor_pendente_compacto:compactMoney(valorP)};
}
function executiveComment(rows){
  const pend=pendingRows(rows);
  if(!rows.length) return 'Sem registros para o filtro atual.';
  const total=rows.length;
  const concl=rows.filter(r=>r.ETAPA==='CONCLUÍDO').length;
  const pct=brPct(total?concl/total*100:0);
  if(!pend.length) return '100% concluído no filtro atual. Nada para lançar, acompanhar pedido ou cobrar NF.';
  const semLanc=stageSummary(rows,'SEM LANÇAMENTO');
  const semPedido=stageSummary(rows,'SEM PEDIDO');
  const semNf=stageSummary(rows,'SEM NF');
  const first=priorityRows(rows.filter(r=>r.ETAPA==='SEM LANÇAMENTO'),1)[0];
  const foco = semLanc.qtd
    ? `Foco do PCM: conferir lançamento de ${brInt(semLanc.qtd)} RCs (${compactMoney(semLanc.valor)}).`
    : 'Foco do PCM em dia; acompanhar pedido e NF.';
  const start = first ? ` Primeiro foco: ${first.fornecedor} · ${first.reason}.` : '';
  return `${pct} concluído. ${foco} Acompanhamento: ${brInt(semPedido.qtd)} sem pedido e ${brInt(semNf.qtd)} sem NF.${start}`;
}
function monthly(rows){
  const map=new Map(); rows.forEach(r=>{ const iso=r._DATA_RECEBIMENTO_ISO || r._DATA_LANCAMENTO_ISO || r._DATA_PEDIDO_ISO || r._DATA_NF_ISO; if(!iso) return; const key=iso.slice(0,7); map.set(key,(map.get(key)||0)+n(r._VALOR_TOTAL)); });
  const meses={"01":"jan","02":"fev","03":"mar","04":"abr","05":"mai","06":"jun","07":"jul","08":"ago","09":"set","10":"out","11":"nov","12":"dez"};
  return Array.from(map.entries()).sort().map(([label,value])=>({label,label_short:`${meses[label.slice(5,7)]||label.slice(5,7)}/${label.slice(2,4)}`,value,formatted:compactMoney(value),full:brMoney(value)}));
}
function dashboardGlobalQuery(query={}){
  const filters = JSON.parse(JSON.stringify(query.filters || {}));
  // V81: estes filtros rápidos mudam a fila e a base, mas NÃO mudam os cards executivos.
  // Isso evita leitura errada como “0% concluído” quando o usuário clica em “Em atenção”.
  delete filters['ETAPA'];
  delete filters['SLA STATUS'];
  delete filters['FAIXA ATRASO'];
  return {...query, filters, search:''};
}
function hasOperationalQuickFilter(query={}){
  const f=query.filters || {};
  return Boolean((f['ETAPA']||[]).length || (f['SLA STATUS']||[]).length || (f['FAIXA ATRASO']||[]).length);
}
function staticDashboard(rows, query){
  try{
    const globalQuery = dashboardGlobalQuery(query || {});
    const geral = applyStaticQuery(rows, globalQuery);
    const filtrado = applyStaticQuery(rows, query || {});
    const visaoFila = hasOperationalQuickFilter(query || {}) ? filtrado : geral;

    const total=geral.length, pend=pendingRows(geral), concl=geral.filter(r=>r.ETAPA==='CONCLUÍDO');
    const valorTotal=geral.reduce((s,r)=>s+n(r._VALOR_TOTAL),0), serv=geral.reduce((s,r)=>s+n(r._VALOR_SERVICO),0), pecas=geral.reduce((s,r)=>s+n(r._VALOR_PECAS),0), valorPend=pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
    const criticalThreshold = Number(window.BUSINESS_RULES?.aging?.critical || 30);
    const criticalPending = pend.filter(r => n(r._DIAS_PARADO) > criticalThreshold);
    const criticalValue = criticalPending.reduce((sum, row) => sum + n(row._VALOR_TOTAL), 0);
    const farol=farolRegional(geral), old=oldestPending(geral), etapas=groupByStage(geral), owners=topOwnersCriticos(geral), top5=priorityRows(visaoFila.length ? visaoFila : geral,5);
    const kpis={total_rcs:total,valor_total:brMoney(valorTotal),valor_total_compacto:compactMoney(valorTotal),valor_servicos:brMoney(serv),valor_servicos_compacto:compactMoney(serv),valor_pecas:brMoney(pecas),valor_pecas_compacto:compactMoney(pecas),ticket_medio:brMoney(total?valorTotal/total:0),ticket_medio_compacto:compactMoney(total?valorTotal/total:0),ticket_tempo_dias:`${average(geral.map(r=>r._DIAS_PARADO)).toFixed(1).replace('.',',')} dias`,ticket_tempo_dias_valor:average(geral.map(r=>r._DIAS_PARADO)),fornecedores:uniqueCount(geral,'FORNECEDOR'),equipamentos:uniqueCount(geral,'EQUIPAMENTO'),concluidas:concl.length,pendentes:pend.length,pct_concluido:brPct(total?concl.length/total*100:0),pct_pendente:brPct(total?pend.length/total*100:0),valor_pendente:brMoney(valorPend),valor_pendente_compacto:compactMoney(valorPend),valor_fora_sla:farol.valor_fora_sla,valor_fora_sla_compacto:farol.valor_fora_sla_compacto,valor_sem_lancamento:farol.valor_sem_lancamento,valor_sem_lancamento_compacto:farol.valor_sem_lancamento_compacto,rcs_fora_sla:farol.rcs_fora_sla,rcs_sem_lancamento:farol.rcs_sem_lancamento,rcs_criticas:farol.rcs_criticas,critical_pending:criticalPending.length,critical_pending_value:criticalValue,critical_pending_value_compacto:compactMoney(criticalValue),critical_threshold_days:criticalThreshold,pct_concluido_valor:total?concl.length/total*100:0,farol_status:farol.status,maior_atraso_dias:n(old.dias),maior_atraso_label:old.label,maior_atraso_label_tipo:old.label_type || '',maior_atraso_detail:old.detail,maior_atraso_etapa:old.etapa || '',maior_atraso_fornecedor:old.fornecedor || '',maior_atraso_valor:old.valor || '',maior_atraso_valor_full:old.valor_full || ''};
    return {
      kpis,
      etapas,
      farol,
      top5_prioridades:top5,
      comentario_executivo:executiveComment(geral),
      alerts:{...operationalAlerts(geral),action_now:executiveActions(visaoFila.length ? visaoFila : geral),owners_criticos:owners},
      charts:{funil:etapas.map(e=>({label:e.etapa,value:e.qtd,formatted:brInt(e.qtd),color:e.cor})),top_fornecedores:topSum(geral,'FORNECEDOR'),top_fornecedores_pendentes:topSum(pend,'FORNECEDOR'),top_gargalos:[],solicitantes_pendentes:topSum(pend,'SOLICITANTE'),owners_criticos:owners,custo_solicitante:topSum(geral,'SOLICITANTE'),qtd_solicitante:topCount(geral,'SOLICITANTE'),qtd_fornecedor:topCount(geral,'FORNECEDOR'),mensal:monthly(geral),pecas_servicos:[{label:'Serviços',value:serv,formatted:compactMoney(serv),full:brMoney(serv)},{label:'Peças',value:pecas,formatted:compactMoney(pecas),full:brMoney(pecas)}],tempo_medio:[]}
    };
  }catch(err){
    console.error('Erro em staticDashboard:', err);
    return {kpis:{},etapas:[],farol:{status:'ERRO'},top5_prioridades:[],comentario_executivo:'Erro ao carregar dashboard',alerts:{},charts:{}};
  }
}
function protectCsvCell(value){
  const text = String(value ?? '');
  const trimmed = text.trimStart();
  const looksLikeNegativeNumber = /^-\d+(?:[.,]\d+)?$/.test(trimmed);
  if(!looksLikeNegativeNumber && /^[=+\-@]/.test(trimmed)) return `'${text}`;
  return text;
}

function toCsv(columns, rows){
  const escapeCell = value => `"${protectCsvCell(value).replace(/"/g, '""')}"`;
  const header = columns.map(escapeCell).join(';');
  const body = rows.map(row => columns.map(column => escapeCell(row[column])).join(';'));
  return '\ufeff' + [header, ...body].join('\n');
}
