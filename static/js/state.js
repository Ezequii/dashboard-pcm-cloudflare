const state = {
  filters: {},
  mainFilters: [],
  columns: [],
  search: '',
  searchScope: 'ALL',
  page: 1,
  pageSize: 200,
  sortCol: 'DIAS PARADO',
  sortDir: 'desc',
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
};

const DESC_FIRST_COLUMNS = new Set([
  'VALOR TOTAL', 'VALOR PEÇAS', 'VALOR SERVIÇO', 'DIAS PARADO',
  'DATA DE RECEBIMENTO', 'DATA LANÇAMENTO', 'DATA DO PEDIDO', 'DATA LANÇAMENTO NFS',
  'Nº ORÇAMENTO FINAL', 'Nº ORDEM SERVIÇO', 'Nº REQUISIÇÃO', 'Nº PEDIDO DE COMPRA'
]);

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'pcm-dashboard-preferences-v97-cloudflare';
const LEGACY_STORAGE_KEYS = [
  'pcm-dashboard-preferences-v89-cloudflare',
  'pcm-dashboard-preferences-v88-cloudflare'
];
const DASH_CACHE_PREFIX = 'pcm-dashboard-cache-v97-cloudflare:';

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
      pageSize: state.pageSize,
      sortCol: state.sortCol,
      sortDir: state.sortDir,
      activeTab: state.activeTab,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      valueMin: state.valueMin,
      valueMax: state.valueMax
    }));
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
