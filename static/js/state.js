'use strict';

const state = {
  filters: {},
  mainFilters: [],
  columns: [],
  fullColumns: [],
  visibleColumns: [],
  search: '',
  searchScope: 'AUTO',
  page: 1,
  pageSize: 100,
  sortCol: 'DIAS PARADO',
  sortDir: 'desc',
  activeTab: 'visao',
  rankingMode: 'pending',
  dateFrom: '',
  dateTo: '',
  valueMin: '',
  valueMax: '',
  ageMin: '',
  ageMax: '',
  selectedRowIds: new Set(),
  currentRows: [],
  currentColumns: [],
  currentTotal: 0,
  currentDashboard: null,
  dashboardSeq: 0,
  rowsSeq: 0,
  isRefreshing: false,
  lastFocus: null,
  boot: null,
  dataVersion: '',
  generatedAt: '',
  density: 'compact',
};

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'pcm-dashboard-v100-preferences';
const SAVED_VIEWS_KEY = 'pcm-dashboard-v100-saved-views';
const DASH_CACHE_PREFIX = 'pcm-dashboard-v100-cache:';

const DESC_FIRST_COLUMNS = new Set([
  'VALOR TOTAL', 'VALOR PEÇAS', 'VALOR SERVIÇO', 'DIAS PARADO',
  'DATA DE RECEBIMENTO', 'DATA LANÇAMENTO', 'DATA DO PEDIDO', 'DATA LANÇAMENTO NFS',
  'Nº ORÇAMENTO FINAL', 'Nº ORDEM SERVIÇO', 'Nº REQUISIÇÃO', 'Nº PEDIDO DE COMPRA',
]);

function loadPreferences(){
  try{
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state.filters = prefs.filters && typeof prefs.filters === 'object' ? prefs.filters : {};
    state.search = String(prefs.search || '');
    state.searchScope = String(prefs.searchScope || 'AUTO');
    state.pageSize = Number(prefs.pageSize || state.pageSize);
    state.sortCol = String(prefs.sortCol || state.sortCol);
    state.sortDir = prefs.sortDir === 'asc' ? 'asc' : 'desc';
    state.activeTab = prefs.activeTab === 'base' ? 'base' : 'visao';
    state.rankingMode = prefs.rankingMode === 'total' ? 'total' : 'pending';
    state.dateFrom = String(prefs.dateFrom || '');
    state.dateTo = String(prefs.dateTo || '');
    state.valueMin = prefs.valueMin ?? '';
    state.valueMax = prefs.valueMax ?? '';
    state.ageMin = prefs.ageMin ?? '';
    state.ageMax = prefs.ageMax ?? '';
    state.visibleColumns = Array.isArray(prefs.visibleColumns) ? prefs.visibleColumns : [];
    state.density = ['comfortable','compact','dense'].includes(prefs.density) ? prefs.density : 'compact';
  }catch(error){
    console.warn('Preferências locais ignoradas:', error);
  }
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
      rankingMode: state.rankingMode,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      valueMin: state.valueMin,
      valueMax: state.valueMax,
      ageMin: state.ageMin,
      ageMax: state.ageMax,
      visibleColumns: state.visibleColumns,
      density: state.density,
    }));
  }catch(error){
    console.warn('Não foi possível salvar preferências:', error);
  }
}

function getSavedViews(){
  try{
    const parsed = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  }catch(error){
    return [];
  }
}

function saveNamedView(name){
  const cleanName = String(name || '').trim().slice(0, 50);
  if(!cleanName) throw new Error('Informe um nome para a visão.');
  const views = getSavedViews().filter(view => view.name !== cleanName);
  views.unshift({
    name: cleanName,
    createdAt: new Date().toISOString(),
    state: serializeViewState(),
  });
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views.slice(0, 12)));
}

function deleteNamedView(name){
  const views = getSavedViews().filter(view => view.name !== name);
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
}

function serializeViewState(){
  return {
    filters: JSON.parse(JSON.stringify(state.filters || {})),
    search: state.search,
    searchScope: state.searchScope,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo,
    valueMin: state.valueMin,
    valueMax: state.valueMax,
    ageMin: state.ageMin,
    ageMax: state.ageMax,
    sortCol: state.sortCol,
    sortDir: state.sortDir,
    pageSize: state.pageSize,
    activeTab: state.activeTab,
  };
}

function applyViewState(viewState={}){
  state.filters = viewState.filters && typeof viewState.filters === 'object'
    ? JSON.parse(JSON.stringify(viewState.filters))
    : {};
  state.search = String(viewState.search || '');
  state.searchScope = String(viewState.searchScope || 'AUTO');
  state.dateFrom = String(viewState.dateFrom || '');
  state.dateTo = String(viewState.dateTo || '');
  state.valueMin = viewState.valueMin ?? '';
  state.valueMax = viewState.valueMax ?? '';
  state.ageMin = viewState.ageMin ?? '';
  state.ageMax = viewState.ageMax ?? '';
  state.sortCol = String(viewState.sortCol || 'DIAS PARADO');
  state.sortDir = viewState.sortDir === 'asc' ? 'asc' : 'desc';
  state.pageSize = Number(viewState.pageSize || state.pageSize);
  state.activeTab = viewState.activeTab === 'base' ? 'base' : 'visao';
  state.page = 1;
  state.selectedRowIds.clear();
}

function cacheGet(key, maxAgeMs=60000){
  try{
    const raw = sessionStorage.getItem(DASH_CACHE_PREFIX + key);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(Date.now() - Number(obj.time || 0) > maxAgeMs) return null;
    if(obj.version !== state.dataVersion) return null;
    return obj.data;
  }catch(error){
    return null;
  }
}

function cacheSet(key, data){
  try{
    sessionStorage.setItem(DASH_CACHE_PREFIX + key, JSON.stringify({
      time: Date.now(),
      version: state.dataVersion,
      data,
    }));
  }catch(error){
    console.warn('Cache de sessão indisponível:', error);
  }
}

function cacheClear(){
  try{
    Object.keys(sessionStorage)
      .filter(key => key.startsWith(DASH_CACHE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key));
  }catch(error){}
}
