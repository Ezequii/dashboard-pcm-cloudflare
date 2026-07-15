const state = {
  filters: {},
  mainFilters: [],
  columns: [],
  search: '',
  searchScope: 'ALL',
  multiSearchTerms: [],
  multiSearchMode: 'ANY',
  page: 1,
  pageSize: 200,
  sortCol: 'ETAPA',
  sortDir: 'asc',
  stageColors: {},
  dashboardSeq: 0,
  rowsSeq: 0,
  isRefreshing: false,
  refreshPromise: null,
  refreshQueued: false,
  activeTab: 'visao',
  lastFocus: null,
  dateFrom: '',
  dateTo: '',
  valueMin: '',
  valueMax: '',
  dataVersion: '',
  generatedAt: '',
  lastSuccessfulRefresh: 0,
  lastError: '',
  lastErrorAt: 0,
  lastValidVersion: '',
  lastValidGeneratedAt: '',
  dashboardAbortController: null,
  rowsAbortController: null,
  versionAbortController: null,
  publicationAbortController: null,
  securityRole: '',
  securityVerified: false,
  publicationStatus: null,
};

const DESC_FIRST_COLUMNS = new Set([
  'VALOR TOTAL', 'VALOR PEÇAS', 'VALOR SERVIÇO', 'DIAS PARADO',
  'DATA DE RECEBIMENTO', 'DATA LANÇAMENTO', 'DATA DO PEDIDO', 'DATA LANÇAMENTO NFS',
  'Nº ORÇAMENTO FINAL', 'Nº ORDEM SERVIÇO', 'Nº REQUISIÇÃO', 'Nº PEDIDO DE COMPRA'
]);

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'pcm-dashboard-preferences-v994a4-flow-default';
const LEGACY_STORAGE_KEYS = [
  'pcm-dashboard-preferences-v97-cloudflare',
  'pcm-dashboard-preferences-v89-cloudflare',
  'pcm-dashboard-preferences-v88-cloudflare'
];
const DASH_CACHE_PREFIX = 'pcm-dashboard-cache-v994a:';

function readStoredPreferences(){
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for(const key of keys){
    try{
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    }catch(e){}
  }
  return {};
}

function loadPreferences(){
  try{
    const prefs = readStoredPreferences();
    state.filters = prefs.filters || {};
    state.search = prefs.search || '';
    state.searchScope = prefs.searchScope || 'ALL';
    state.multiSearchTerms = Array.isArray(prefs.multiSearchTerms) ? prefs.multiSearchTerms : [];
    state.multiSearchMode = prefs.multiSearchMode === 'ALL' ? 'ALL' : 'ANY';
    state.pageSize = Number(prefs.pageSize || state.pageSize);
    state.sortCol = prefs.sortCol || state.sortCol;
    state.sortDir = prefs.sortDir || state.sortDir;
    state.activeTab = prefs.activeTab || 'visao';
    state.dateFrom = prefs.dateFrom || '';
    state.dateTo = prefs.dateTo || '';
    state.valueMin = prefs.valueMin || '';
    state.valueMax = prefs.valueMax || '';
  }catch(e){}
}

function savePreferences(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      filters: state.filters,
      search: state.search,
      searchScope: state.searchScope,
      multiSearchTerms: state.multiSearchTerms,
      multiSearchMode: state.multiSearchMode,
      pageSize: state.pageSize,
      sortCol: state.sortCol,
      sortDir: state.sortDir,
      activeTab: state.activeTab,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      valueMin: state.valueMin,
      valueMax: state.valueMax
    }));
    window.syncProductivityUrlV99?.({replace:true});
  }catch(e){}
}

function cacheGet(key, maxAgeMs=60000){
  try{
    const raw = sessionStorage.getItem(DASH_CACHE_PREFIX + key);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(Date.now() - obj.time > maxAgeMs){
      sessionStorage.removeItem(DASH_CACHE_PREFIX + key);
      return null;
    }
    return obj.data;
  }catch(e){
    return null;
  }
}

function cacheSet(key, data){
  try{
    sessionStorage.setItem(DASH_CACHE_PREFIX + key, JSON.stringify({
      time: Date.now(),
      version: state.dataVersion || '',
      data
    }));
  }catch(e){}
}

function cacheClear(){
  try{
    Object.keys(sessionStorage)
      .filter(key => key.startsWith(DASH_CACHE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key));
  }catch(e){}
}
const REQUEST_CONTROLLER_FIELDS_V994A = Object.freeze({
  executive: 'dashboardAbortController',
  operational: 'rowsAbortController',
  version: 'versionAbortController',
  publication: 'publicationAbortController'
});

function requestControllerFieldV994a(channel){
  return REQUEST_CONTROLLER_FIELDS_V994A[channel] || null;
}

function abortRequestV994a(channel, reason='superseded'){
  const field = requestControllerFieldV994a(channel);
  if(!field) return;
  const controller = state[field];
  if(controller && !controller.signal.aborted){
    try{ controller.abort(reason); }catch(_){}
  }
  state[field] = null;
}

function beginRequestV994a(channel, timeoutMs=30000){
  const field = requestControllerFieldV994a(channel);
  if(!field) throw new Error(`Canal de requisição desconhecido: ${channel}`);
  abortRequestV994a(channel);

  const controller = new AbortController();
  state[field] = controller;
  const timeout = window.setTimeout(() => {
    if(!controller.signal.aborted) controller.abort('timeout');
  }, Math.max(1000, Number(timeoutMs || 30000)));

  return {
    signal: controller.signal,
    controller,
    release(){
      window.clearTimeout(timeout);
      if(state[field] === controller) state[field] = null;
    }
  };
}

function abortAllRequestsV994a(reason='cancelled'){
  Object.keys(REQUEST_CONTROLLER_FIELDS_V994A)
    .forEach(channel => abortRequestV994a(channel, reason));
}

function markDataSuccessV994a(metadata={}){
  state.lastSuccessfulRefresh = Date.now();
  state.lastError = '';
  state.lastErrorAt = 0;
  state.lastValidVersion = String(
    metadata.dataVersion || state.dataVersion || state.lastValidVersion || ''
  );
  state.lastValidGeneratedAt = String(
    metadata.generatedAt || state.generatedAt || state.lastValidGeneratedAt || ''
  );
}

function markDataFailureV994a(error){
  state.lastError = String(error?.message || error || 'Falha de dados');
  state.lastErrorAt = Date.now();
}

window.abortRequestV994a = abortRequestV994a;
window.beginRequestV994a = beginRequestV994a;
window.abortAllRequestsV994a = abortAllRequestsV994a;
window.markDataSuccessV994a = markDataSuccessV994a;
window.markDataFailureV994a = markDataFailureV994a;
