function validateRuntimeConfiguration(){
  const rules = window.BUSINESS_RULES;
  const config = window.PCM_APP_CONFIG;

  if(!rules || !rules.aging || !rules.targets || !rules.priorityWeights){
    throw new Error("Configuração de regras de negócio indisponível. Recarregue a página.");
  }
  if(!config || String(config.assetVersion || "") !== "12300"){
    throw new Error("Os arquivos da aplicação estão em versões diferentes. Recarregue sem cache.");
  }

  const requiredFunctions = [
    "api",
    "buildSmartFilters",
    "renderDashboardData",
    "loadRows",
    "updateFilterUI",
    "clearProductivityQueryContextV100"
  ];
  const missing = requiredFunctions.filter((name) => typeof window[name] !== "function");
  if(missing.length){
    throw new Error(`Arquivos incompletos no carregamento: ${missing.join(", ")}.`);
  }
}

function bindBootRecovery(){
  const retry = $("btnRetryData");
  if(!retry) return;
  retry.dataset.bootRecoveryBound = "1";
  retry.onclick = () => refreshData();
}

const scheduleDashboard = debounce(() => {
  savePreferences();
  refreshAll(false).catch(error => console.error('Atualização agendada falhou:', error));
}, 160);

const scheduleRows = debounce(() => {
  savePreferences();
  loadRows().catch(error => console.error('Carregamento agendado da tabela falhou:', error));
}, 220);


function loadRowsSafely(){
  return loadRows().catch(error => {
    console.error('Falha ao carregar a tabela:', error);
    return null;
  });
}

let baseFocusIntentV100 = null;
let baseFocusIntentSequenceV100 = 0;
let emptyStateReloadPromiseV100 = null;

function requestBaseFocusV100(target, origin=document.activeElement){
  baseFocusIntentV100 = {
    id: ++baseFocusIntentSequenceV100,
    target,
    origin: origin || null
  };
  return baseFocusIntentV100.id;
}

function cancelBaseFocusIntentV100(){
  baseFocusIntentV100 = null;
}

function canRestoreBaseFocusV100(intent){
  if(!intent || state.activeTab !== 'base') return false;
  const active = document.activeElement;
  if(!active || active === document.body || active === document.documentElement) return true;
  if(intent.origin && active === intent.origin) return true;
  return false;
}

function focusBaseElementV100(id){
  const element = $(id);
  if(!element || element.hidden || element.disabled) return false;
  element.focus({preventScroll:false});
  return document.activeElement === element;
}

function restoreBaseFocusAfterRenderV100(){
  const intent = baseFocusIntentV100;
  if(!intent || intent.target !== 'BASE_TITLE') return false;
  if(!canRestoreBaseFocusV100(intent)){
    cancelBaseFocusIntentV100();
    return false;
  }
  const restored = focusBaseElementV100('basePanelTitle');
  cancelBaseFocusIntentV100();
  return restored;
}

function restoreBaseFocusAfterReloadV100(){
  const intent = baseFocusIntentV100;
  if(!intent || intent.target !== 'RELOAD_BUTTON') return false;
  if(!canRestoreBaseFocusV100(intent)){
    cancelBaseFocusIntentV100();
    return false;
  }
  const restored = focusBaseElementV100('emptyStateReloadButton')
    || focusBaseElementV100('basePanelTitle');
  cancelBaseFocusIntentV100();
  return restored;
}

function setEmptyStateReloadBusyV100(active){
  const region = $('baseTableRegion');
  if(region) region.setAttribute('aria-busy', active ? 'true' : 'false');
  window.syncEmptyStateReloadUiV100?.(Boolean(active));
}

function isEmptyStateReloadActiveV100(){
  return Boolean(emptyStateReloadPromiseV100);
}

function waitForGlobalRefreshIdleV100(){
  return new Promise(resolve => {
    const check = () => {
      if(!state.refreshPromise && !state.refreshQueued && !state.isRefreshing){
        resolve();
        return;
      }
      setTimeout(check, 40);
    };
    check();
  });
}

function clearSimpleSearchEmptyStateV100(){
  state.search = '';
  const globalSearch = $('globalSearch');
  if(globalSearch) globalSearch.value = '';
  state.page = 1;
  updateSearchUI();
  updateFilterUI();
  savePreferences();
  globalSearch?.focus();
  return loadRowsSafely();
}

async function clearQueryContextEmptyStateV100(){
  requestBaseFocusV100('BASE_TITLE');

  Object.keys(state.filters || {}).forEach(key => {
    state.filters[key] = [];
  });
  state.search = '';
  state.dateFrom = '';
  state.dateTo = '';
  state.valueMin = '';
  state.valueMax = '';
  state.page = 1;

  window.clearProductivityQueryContextV100?.();

  const globalSearch = $('globalSearch');
  if(globalSearch) globalSearch.value = '';
  updateSearchUI();
  hydrateAdvancedSearch();
  updateFilterUI();
  savePreferences();

  try{
    await refreshAll(true);
  }finally{
    restoreBaseFocusAfterRenderV100();
  }
}

function reloadEmptyStateDataV100(){
  if(emptyStateReloadPromiseV100) return emptyStateReloadPromiseV100;

  requestBaseFocusV100('RELOAD_BUTTON');
  setEmptyStateReloadBusyV100(true);

  const run = async () => {
    if(state.refreshPromise || state.isRefreshing){
      await waitForGlobalRefreshIdleV100();
    }else{
      await refreshData();
      await waitForGlobalRefreshIdleV100();
    }
  };

  emptyStateReloadPromiseV100 = run()
    .catch(error => {
      console.error('Falha ao recarregar a base vazia:', error);
      return null;
    })
    .finally(() => {
      emptyStateReloadPromiseV100 = null;
      setEmptyStateReloadBusyV100(false);
      restoreBaseFocusAfterReloadV100();
    });

  return emptyStateReloadPromiseV100;
}

function updateHeaderMetadata(metadata={}, generatedAt=''){
  const meta = $('meta');
  const rows = Number(metadata.linhas || 0);
  const formattedRows = rows.toLocaleString('pt-BR');
  const generated = generatedAt
    ? new Date(generatedAt).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}).replace(',', '')
    : '';

  if(meta){
    meta.textContent = `${formattedRows} registros${generated ? ` · atualizado ${generated}` : ''}`;
    meta.title = [
      `${formattedRows} registros carregados`,
      metadata.arquivo ? `arquivo ${metadata.arquivo}` : '',
      generated ? `base gerada em ${generated}` : ''
    ].filter(Boolean).join(' · ');
  }

  updateDataFreshness(generatedAt);
}

async function init(){
  nowClock();
  bindBootRecovery();
  document.body.classList.add('app-booting');
  document.body.classList.remove('app-ready', 'app-error');

  try{
    setLoading(true);
    validateRuntimeConfiguration();
    await window.SecurityV994a?.initialize();
    const boot = await api('/api/bootstrap');

    state.mainFilters = [
      {key:'SOLICITANTE', label:'Solicitante', type:'search-select'},
      {key:'FORNECEDOR', label:'Fornecedor', type:'search-select'},
      {key:'ETAPA', label:'Etapas', type:'search-select'},
      {key:'MES_RECEBIMENTO', label:'Mês', type:'search-select'}
    ];
    state.columns = boot.table_columns || [];
    state.stageColors = boot.stage_colors || {};
    state.dataVersion = boot.data_version || state.dataVersion || '';
    state.generatedAt = boot.generated_at || '';
    state.publicationStatus = boot.publication_status || null;
    state.lastValidVersion = state.dataVersion || state.lastValidVersion || '';
    state.lastValidGeneratedAt = state.generatedAt || state.lastValidGeneratedAt || '';

    loadPreferences();
    window.restoreProductivityStateV99?.();

    const allowedFilterKeys = new Set([
      ...state.mainFilters.map(item => item.key),
      'DONO DA AÇÃO',
      'SLA STATUS',
      'FAIXA ATRASO'
    ]);
    Object.keys(state.filters || {}).forEach(key => {
      if(!allowedFilterKeys.has(key)) delete state.filters[key];
    });
    state.mainFilters.forEach(definition => {
      if(!Array.isArray(state.filters[definition.key])) state.filters[definition.key] = [];
    });
    ['DONO DA AÇÃO','SLA STATUS','FAIXA ATRASO'].forEach(key => {
      if(!Array.isArray(state.filters[key])) state.filters[key] = [];
    });

    updateHeaderMetadata(boot.metadata || {}, boot.generated_at || '');

    buildSmartFilters();
    bindEvents();
    window.initProductivityV99?.();
    hydrateAdvancedSearch();
    updateFilterUI();
    switchTab(state.activeTab || 'visao', {loadRowsNow:false});
    await refreshAll(false);

    clearDataError();
    document.body.classList.remove('app-booting', 'app-error');
    document.body.classList.add('app-ready', 'v34-ready');

    const seconds = Number(boot.auto_reload_seconds || 0);
    if(seconds >= 30){
      setInterval(() => refreshAll(false).catch(error => console.error('Atualização automática falhou:', error)), seconds * 1000);
    }

    setInterval(async () => {
      try{
        const updated = await checkForDataUpdates();
        if(!updated){
          updateDataFreshness(state.generatedAt);
          return;
        }

        showToast('Nova base detectada. Atualizando painel...');
        const refreshResult = await api('/api/refresh', {});
        updateHeaderMetadata(refreshResult.metadata || {}, refreshResult.generated_at || '');
        cacheClear();
        await refreshAll(false);
        clearDataError();
        showToast('Painel atualizado com a nova base.');
      }catch(error){
        console.error('Falha na verificação automática:', error);
        showDataStatus(
          'Não foi possível verificar uma nova base',
          error.message || 'A conexão pode estar indisponível.',
          'error'
        );
      }
    }, Number(window.PCM_APP_CONFIG?.runtime?.updateCheckIntervalMs || 300000));
  }catch(error){
    window.markDataFailureV994a?.(error);
    console.error('Falha na inicialização:', error);
    document.body.classList.remove('app-booting');
    document.body.classList.add('app-error');
    if(typeof window.PCM_RENDER_RUNTIME_ERROR === 'function'){
      window.PCM_RENDER_RUNTIME_ERROR(error);
    }
    showDataStatus(
      'Dashboard indisponível',
      error.message || 'Não foi possível carregar a base publicada.',
      'error'
    );
    showToast(error.message || 'Não foi possível iniciar o dashboard.', true);
  }finally{
    setLoading(false);
  }
}

function bindEvents(){
  const globalSearch = $('globalSearch');
  const searchScope = $('searchScope');
  const clearSearch = $('btnClearSearch');
  if(searchScope){
    searchScope.value = state.searchScope || 'ALL';
    searchScope.addEventListener('change', () => {
      state.searchScope = searchScope.value || 'ALL';
      state.page = 1;
      updateSearchUI();
      updateFilterUI();
      savePreferences();
      loadRowsSafely();
    });
  }
  if(globalSearch){
    globalSearch.value = state.search || '';
    globalSearch.addEventListener('input', debounce((e) => {
      state.search = String(e.target.value || '').slice(0, 200);
      state.page = 1;
      updateSearchUI();
      updateFilterUI();
      scheduleRows();
    }, 220));
  }
  if(clearSearch){
    clearSearch.addEventListener('click', () => {
      clearSimpleSearchEmptyStateV100();
    });
  }
  updateSearchUI();

  ['advDateFrom','advDateTo','advValueMin','advValueMax'].forEach(id => {
    const el = $(id);
    if(!el) return;
    el.addEventListener('input', debounce(() => {
      state.dateFrom = $('advDateFrom')?.value || '';
      state.dateTo = $('advDateTo')?.value || '';
      state.valueMin = $('advValueMin')?.value || '';
      state.valueMax = $('advValueMax')?.value || '';
      state.page = 1;
      scheduleDashboard();
    }, 350));
  });
  $('btnClearAdvanced')?.addEventListener('click', () => {
    state.dateFrom = state.dateTo = state.valueMin = state.valueMax = '';
    hydrateAdvancedSearch();
    bindAdvancedSearchPanel();
    state.page = 1;
    scheduleDashboard();
  });

  $('globalContextClearAll')?.addEventListener('click', () => clearAll());
  bindQuickChips();
  $('btnRefresh').onclick = refreshData;
    const retryDataButton = $('btnRetryData');
  if(retryDataButton){
    retryDataButton.dataset.bootRecoveryBound = '0';
    retryDataButton.onclick = refreshData;
  }
  bindAdvancedSearchPanel();
  if($('pageSize')){ $('pageSize').value = String(state.pageSize || 50); $('pageSize').onchange = (e) => { state.pageSize = Number(e.target.value); state.page = 1; savePreferences(); loadRowsSafely(); }; }
  $('prevPage').onclick = () => { if(state.page > 1){ state.page--; loadRowsSafely(); } };
  $('nextPage').onclick = () => { state.page++; loadRowsSafely(); };

  document.addEventListener('click', (e) => {
    if(!e.target.closest('.smart-select')) closeAllPopovers();
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ closeAllPopovers(); closeAdvancedSearchPanel(); }
    const cmd = e.ctrlKey || e.metaKey;
    if(e.altKey && e.key === '1'){ e.preventDefault(); switchTab('visao'); }
    if(e.altKey && e.key === '2'){ e.preventDefault(); switchTab('base'); }
    if(cmd && e.key.toLowerCase() === 'k'){ e.preventDefault(); switchTab('base'); setTimeout(() => $('globalSearch')?.focus(), 80); }
    if(cmd && e.key.toLowerCase() === 'e'){ e.preventDefault(); window.exportExcelFromCurrentViewV99?.(); }
    if(cmd && e.key === 'Backspace'){ e.preventDefault(); clearAll(); }
    if(e.key === '?' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName || '')){
      showToast('Atalhos: Alt+1 visão, Alt+2 tabela, Ctrl+K busca, Ctrl+E Excel, Esc fecha painéis.');
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}


function searchScopeLabel(scope){
  const labels = {
    ALL:'Geral — nomes e números', REQUISICAO:'RC / Requisição', PEDIDO:'Pedido', FORNECEDOR:'Fornecedor',
    SOLICITANTE:'Solicitante', EQUIPAMENTO:'Equipamento / Prefixo', DOCUMENTO:'Orçamento / OS / NF'
  };
  return labels[scope] || labels.ALL;
}

function searchPlaceholder(scope){
  const labels = {
    ALL:'Digite RC, pedido, fornecedor, solicitante ou equipamento...',
    REQUISICAO:'Digite o número da RC...',
    PEDIDO:'Digite o número do pedido...',
    FORNECEDOR:'Digite o nome do fornecedor...',
    SOLICITANTE:'Digite o nome do solicitante...',
    EQUIPAMENTO:'Digite equipamento ou prefixo...',
    DOCUMENTO:'Digite orçamento, OS ou NF...'
  };
  return labels[scope] || labels.ALL;
}

function updateSearchUI(total=null){
  const input = $('globalSearch');
  const clear = $('btnClearSearch');
  const help = $('searchHelp');
  const scope = state.searchScope || 'ALL';
  const term = String(state.search || '').trim();
  if(input) input.placeholder = searchPlaceholder(scope);
  if(clear) clear.hidden = !term;
  if(!help) return;
  help.classList.remove('no-results','has-results');
  if(!term){
    help.textContent = 'Escolha o tipo e digite o dado. Para RC, pedido, OS ou NF, prefira o número completo.';
    return;
  }
  if(total === null){
    help.textContent = `Procurando “${term}” em ${searchScopeLabel(scope)}...`;
    return;
  }
  const count = Number(total || 0);
  if(count === 0){
    help.textContent = `Nenhum registro encontrado para “${term}”. Confira o tipo de busca ou clique em Limpar.`;
    help.classList.add('no-results');
    return;
  }
  help.textContent = `${count.toLocaleString('pt-BR')} registro${count === 1 ? '' : 's'} encontrado${count === 1 ? '' : 's'} — a tabela abaixo já está filtrada.`;
  help.classList.add('has-results');
}

function bindAdvancedSearchPanel(){
  const btn = $('btnToggleAdvancedSearch');
  const panel = $('advancedSearchPanel');
  if(!btn || !panel) return;
  const hasValues = () => Boolean(state.dateFrom || state.dateTo || state.valueMin || state.valueMax);
  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.classList.toggle('active', open || hasValues());
    document.body.classList.toggle('advanced-search-open', open);
  };
  setOpen(hasValues());
  if(btn.dataset.boundAdvanced !== '1'){
    btn.dataset.boundAdvanced = '1';
    btn.addEventListener('click', () => setOpen(panel.hidden));
  }
}

function closeAdvancedSearchPanel(){
  const panel = $('advancedSearchPanel');
  const btn = $('btnToggleAdvancedSearch');
  const hasValues = Boolean(state.dateFrom || state.dateTo || state.valueMin || state.valueMax);
  if(!panel || !btn || hasValues) return;
  panel.hidden = true;
  btn.setAttribute('aria-expanded','false');
  btn.classList.remove('active');
  document.body.classList.remove('advanced-search-open');
}

function bindQuickChips(){
  document.querySelectorAll('#quickChips .quick-chip').forEach(btn => {
    if(btn.dataset.quickBound === '1') return;
    btn.dataset.quickBound = '1';
    btn.addEventListener('click', () => applyQuickFilter(btn.dataset.quick || 'TODAS'));
  });
}

function applyQuickFilter(kind){
  const allowedKinds = new Set([
    'TODAS',
    'FORA_SLA',
    'CRITICO',
    'SEM_LANCAMENTO',
    'SEM_PEDIDO',
    'SEM_NF'
  ]);
  const selectedKind = allowedKinds.has(kind) ? kind : 'TODAS';

  // Presets exclusivos: preservam solicitante, fornecedor e mês,
  // mas substituem o contexto operacional de etapa/SLA.
  state.filters['SLA STATUS'] = [];
  state.filters['FAIXA ATRASO'] = [];
  state.filters['ETAPA'] = [];

  if(selectedKind === 'FORA_SLA'){
    state.filters['SLA STATUS'] = ['ATENÇÃO', 'CRÍTICO'];
  }else if(selectedKind === 'CRITICO'){
    state.filters['SLA STATUS'] = ['CRÍTICO'];
  }else if(selectedKind === 'SEM_LANCAMENTO'){
    state.filters['ETAPA'] = ['SEM LANÇAMENTO'];
  }else if(selectedKind === 'SEM_PEDIDO'){
    state.filters['ETAPA'] = ['SEM PEDIDO'];
  }else if(selectedKind === 'SEM_NF'){
    state.filters['ETAPA'] = ['SEM NF'];
  }

  const quickLabels = {
    TODAS: "Geral",
    FORA_SLA: "Fora do SLA",
    CRITICO: "Críticos",
    SEM_LANCAMENTO: "Sem lançamento",
    SEM_PEDIDO: "Sem pedido",
    SEM_NF: "Sem NF"
  };
  setOperationalViewContextV114(
    selectedKind,
    quickLabels[selectedKind] || "Geral",
    state.filters
  );

  state.page = 1;
  updateFilterUI();
  scheduleDashboard();
}

function normalizeContextValuesV100(values){
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const normalized = [];

  source.forEach(value => {
    const clean = String(value ?? "").replace(/\s+/g, " ").trim();
    if(!clean) return;
    const key = clean.toLocaleUpperCase("pt-BR");
    if(seen.has(key)) return;
    seen.add(key);
    normalized.push(clean);
  });

  return normalized;
}


const OPERATIONAL_CONTEXT_KEYS_V114 = Object.freeze([
  "ETAPA",
  "SLA STATUS",
  "FAIXA ATRASO"
]);

function operationalFilterSignatureV114(filters={}){
  return OPERATIONAL_CONTEXT_KEYS_V114
    .map(key => {
      const values = normalizeContextValuesV100(filters?.[key])
        .map(value => value.toLocaleUpperCase("pt-BR"))
        .sort();
      return `${key}:${values.join("|")}`;
    })
    .join(";");
}

function setOperationalViewContextV114(id, label, filters=state.filters){
  const cleanLabel = String(label || "").replace(/\s+/g, " ").trim();
  if(!cleanLabel){
    state.operationalViewContext = null;
    return null;
  }

  const context = {
    id: String(id || "PERSONALIZADA"),
    label: cleanLabel,
    signature: operationalFilterSignatureV114(filters)
  };
  state.operationalViewContext = context;
  return context;
}

function invalidateOperationalViewContextV114(changedKey=""){
  if(!changedKey || OPERATIONAL_CONTEXT_KEYS_V114.includes(String(changedKey))){
    state.operationalViewContext = null;
  }
}

function resolveOperationalViewV114(currentState=state){
  const filters = currentState?.filters || {};
  const derived = deriveOperationalViewV100(filters);
  const context = currentState?.operationalViewContext;

  if(
    context
    && typeof context.label === "string"
    && context.label.trim()
    && context.signature === operationalFilterSignatureV114(filters)
  ){
    return {
      id: String(context.id || derived.id),
      label: context.label.trim()
    };
  }

  return derived;
}

function stageViewContextV114(etapa){
  const normalized = String(etapa || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-BR");

  if(normalized === "SEM LANCAMENTO"){
    return {id:"SEM_LANCAMENTO", label:"Sem lançamento"};
  }
  if(normalized === "SEM PEDIDO"){
    return {id:"SEM_PEDIDO", label:"Sem pedido"};
  }
  if(normalized === "SEM NF"){
    return {id:"SEM_NF", label:"Sem NF"};
  }
  if(normalized === "CONCLUIDO"){
    return {id:"PROCESSO_CONCLUIDO", label:"Processo concluído"};
  }
  return normalized
    ? {id:"ETAPA", label:String(etapa).trim()}
    : {id:"TODAS", label:"Geral"};
}

function deriveOperationalViewV100(filters=state.filters){
  const etapa = normalizeContextValuesV100(filters?.ETAPA);
  const sla = normalizeContextValuesV100(filters?.["SLA STATUS"]);
  const faixa = normalizeContextValuesV100(filters?.["FAIXA ATRASO"]);
  const etapaKeys = etapa.map(value => value.toLocaleUpperCase("pt-BR")).sort();
  const slaKeys = sla.map(value => value.toLocaleUpperCase("pt-BR")).sort();

  if(!etapa.length && !sla.length && !faixa.length){
    return {id:"TODAS", label:"Geral"};
  }
  if(!sla.length && !faixa.length && etapaKeys.length === 1){
    if(etapaKeys[0] === "SEM LANÇAMENTO") return {id:"SEM_LANCAMENTO", label:"Sem lançamento"};
    if(etapaKeys[0] === "SEM PEDIDO") return {id:"SEM_PEDIDO", label:"Sem pedido"};
    if(etapaKeys[0] === "SEM NF") return {id:"SEM_NF", label:"Sem NF"};
  }
  if(!etapa.length && !faixa.length && slaKeys.length === 1 && slaKeys[0] === "CRÍTICO"){
    return {id:"CRITICO", label:"Críticos"};
  }
  if(
    !etapa.length
    && !faixa.length
    && slaKeys.length === 2
    && slaKeys[0] === "ATENÇÃO"
    && slaKeys[1] === "CRÍTICO"
  ){
    return {id:"FORA_SLA", label:"Fora do SLA"};
  }

  return {id:"PERSONALIZADA", label:"Personalizada"};
}

function quickFilterKindFromState(){
  const view = deriveOperationalViewV100(state.filters);
  return view.id === "PERSONALIZADA" ? null : view.id;
}

function syncQuickChips(){
  const activeKind = quickFilterKindFromState();

  document.querySelectorAll('#quickChips .quick-chip').forEach(btn => {
    const active = Boolean(activeKind && btn.dataset.quick === activeKind);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function formatGlobalContextSelectionV100(values){
  const normalized = normalizeContextValuesV100(values);
  if(!normalized.length) return "";
  if(normalized.length === 1) return normalized[0];
  return `${normalized.length} selecionados`;
}

function formatGlobalContextDateV100(value){
  const clean = String(value || "").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return "";
  const [year, month, day] = clean.split("-");
  return `${day}/${month}/${year}`;
}

function deriveGlobalContextItemsV100(currentState=state){
  const filters = currentState?.filters || {};
  const view = resolveOperationalViewV114(currentState);
  const items = [{key:"view", label:"Visão", value:view.label}];

  const supplier = formatGlobalContextSelectionV100(filters.FORNECEDOR);
  if(supplier) items.push({key:"supplier", label:"Fornecedor", value:supplier});

  const requester = formatGlobalContextSelectionV100(filters.SOLICITANTE);
  if(requester) items.push({key:"requester", label:"Solicitante", value:requester});

  const month = formatGlobalContextSelectionV100(filters.MES_RECEBIMENTO);
  if(month) items.push({key:"month", label:"Mês", value:month});

  const dateFrom = formatGlobalContextDateV100(currentState?.dateFrom);
  const dateTo = formatGlobalContextDateV100(currentState?.dateTo);
  if(dateFrom || dateTo){
    const dateValue = dateFrom && dateTo
      ? `${dateFrom}–${dateTo}`
      : dateFrom
        ? `A partir de ${dateFrom}`
        : `Até ${dateTo}`;
    items.push({key:"dates", label:"Datas", value:dateValue});
  }

  const search = String(currentState?.search || "").trim();
  if(search) items.push({key:"search", label:"Busca", value:search});


  return items;
}

function hasActiveGlobalContextV100(currentState=state){
  const items = deriveGlobalContextItemsV100(currentState);
  const view = resolveOperationalViewV114(currentState);
  return view.id !== "TODAS" || items.some(item => item.key !== "view");
}

function renderGlobalContextV100(){
  const host = $("globalContextList");
  if(!host) return;

  const items = deriveGlobalContextItemsV100(state);
  host.textContent = "";

  items.forEach(item => {
    const pair = document.createElement("div");
    pair.className = "global-context-item-v100";
    pair.dataset.contextKey = item.key;

    const term = document.createElement("dt");
    term.textContent = item.label;

    const description = document.createElement("dd");
    description.textContent = item.value;

    pair.append(term, description);
    host.appendChild(pair);
  });

  const clearButton = $("globalContextClearAll");
  if(clearButton){
    const active = hasActiveGlobalContextV100(state);
    clearButton.disabled = !active;
    clearButton.setAttribute("aria-disabled", active ? "false" : "true");
  }
}

function switchTab(tab, options={}){
  const selected = tab || 'visao';
  const loadRowsNow = options.loadRowsNow !== false;
  state.activeTab = selected;
  savePreferences();

  document.querySelectorAll('.tab-btn').forEach(button => {
    const active = button.dataset.tab === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.hidden = panel.dataset.panel !== selected;
  });

  document.body.classList.toggle('active-tab-visao', selected === 'visao');
  document.body.classList.toggle('active-tab-base', selected === 'base');

  if(selected !== 'base'){
    cancelBaseFocusIntentV100();
  }else{
    window.flushPendingBaseAnnouncementV100?.();
  }

  closeAllPopovers();
  updateFilterUI();

  if(selected === 'base' && loadRowsNow){
    loadRows().catch(error => {
      console.error('Falha ao abrir a Base de Tratativa:', error);
      showDataStatus(
        'Base de Tratativa indisponível',
        error.message || 'Não foi possível carregar os registros.',
        'error'
      );
    });
  }

  window.scrollTo({top:0, behavior:'auto'});
}

async function clearAll(options={}){
  Object.keys(state.filters).forEach(k => state.filters[k] = []);
  state.search = '';
  state.dateFrom = state.dateTo = state.valueMin = state.valueMax = '';
  window.resetProductivityStateV99?.();
  state.page = 1;
  setOperationalViewContextV114('TODAS', 'Geral', state.filters);

  const globalSearch = $('globalSearch');
  if(globalSearch) globalSearch.value = '';

  updateSearchUI();
  hydrateAdvancedSearch();
  updateFilterUI();
  closeAllPopovers();
  savePreferences();

  try{
    await refreshAll(true);
  }catch(error){
    console.error('Falha ao limpar filtros:', error);
  }finally{
    updateFilterUI();
    const focusTarget = globalSearch;
    if(options.restoreFocus !== false) focusTarget?.focus();
    showToast('Filtros redefinidos.');
  }
}

async function refreshData(){
  if(state.refreshPromise){
    state.refreshQueued = true;
    return state.refreshPromise;
  }
  window.abortAllRequestsV994a?.('manual-refresh');

  try{
    setLoading(true);
    cacheClear();
    const result = await api('/api/refresh', {});
    state.dataVersion = result.data_version || state.dataVersion || '';
    state.generatedAt = result.generated_at || state.generatedAt || '';
    state.publicationStatus = result.publication_status || state.publicationStatus;
    window.markDataSuccessV994a?.({dataVersion:state.dataVersion, generatedAt:state.generatedAt});
    updateHeaderMetadata(result.metadata || {}, state.generatedAt);
    state.page = 1;
    await refreshAll(false);
    clearDataError();
    document.body.classList.remove('app-booting', 'app-error');
    document.body.classList.add('app-ready');
    showToast(`${result.message || 'Dados atualizados'}. ${Number(result.linhas || 0).toLocaleString('pt-BR')} registros carregados.`);
  }catch(error){
    window.markDataFailureV994a?.(error);
    console.error('Falha na atualização manual:', error);
    showToast(error.message || 'Não foi possível atualizar os dados.', true);
    showDataStatus(
      'Falha ao atualizar a base',
      error.message || 'Verifique a conexão e tente novamente.',
      'error'
    );
  }finally{
    setLoading(false);
  }
}

async function refreshAll(withLoader=true){
  state.dashboardSeq += 1;
  const requestedSeq = state.dashboardSeq;

  if(state.refreshPromise){
    state.refreshQueued = true;
    return state.refreshPromise;
  }

  const run = async () => {
    try{
      if(withLoader) setLoading(true);
      updateFilterUI();
      await loadDashboard(requestedSeq);
      if(state.activeTab === 'base') await loadRows(requestedSeq);
      state.lastSuccessfulRefresh = Date.now();
      updateDataFreshness(state.generatedAt);
      clearDataError();
    }catch(error){
      window.markDataFailureV994a?.(error);
      console.error('Erro em refreshAll:', error);
      showToast(error.message || 'Erro ao atualizar dashboard.', true);
      showDataStatus(
        'Não foi possível atualizar o painel',
        error.message || 'Os dados anteriores foram mantidos. Tente novamente.',
        'error'
      );
      throw error;
    }finally{
      if(withLoader) setLoading(false);
    }
  };

  state.refreshPromise = run();

  try{
    return await state.refreshPromise;
  }finally{
    state.refreshPromise = null;
    if(state.refreshQueued){
      state.refreshQueued = false;
      await refreshAll(false);
    }
  }
}

function setLoading(on){
  state.isRefreshing = Boolean(on);
  document.body.classList.toggle('loading', Boolean(on));
  document.body.setAttribute('aria-busy', on ? 'true' : 'false');

  [
    'btnRefresh',
    'globalContextClearAll',
    'btnToggleAdvancedSearch',
    'btnClearSearch',
    'btnRetryData'
  ].forEach(id => {
    const element = $(id);
    if(element) element.disabled = Boolean(on);
  });
}


window.syncQuickChips = syncQuickChips;
window.applyQuickFilter = applyQuickFilter;
window.deriveOperationalViewV100 = deriveOperationalViewV100;
window.operationalFilterSignatureV114 = operationalFilterSignatureV114;
window.setOperationalViewContextV114 = setOperationalViewContextV114;
window.invalidateOperationalViewContextV114 = invalidateOperationalViewContextV114;
window.resolveOperationalViewV114 = resolveOperationalViewV114;
window.stageViewContextV114 = stageViewContextV114;
window.deriveGlobalContextItemsV100 = deriveGlobalContextItemsV100;
window.renderGlobalContextV100 = renderGlobalContextV100;
window.hasActiveGlobalContextV100 = hasActiveGlobalContextV100;
window.clearAll = clearAll;
window.init = init;

window.clearSimpleSearchEmptyStateV100 = clearSimpleSearchEmptyStateV100;
window.clearQueryContextEmptyStateV100 = clearQueryContextEmptyStateV100;
window.reloadEmptyStateDataV100 = reloadEmptyStateDataV100;
window.restoreBaseFocusAfterRenderV100 = restoreBaseFocusAfterRenderV100;
window.cancelBaseFocusIntentV100 = cancelBaseFocusIntentV100;
window.isEmptyStateReloadActiveV100 = isEmptyStateReloadActiveV100;

