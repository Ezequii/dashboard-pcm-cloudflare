function validateRuntimeConfiguration(){
  const rules = window.BUSINESS_RULES;
  const config = window.PCM_APP_CONFIG;

  if(!rules || !rules.aging || !rules.targets || !rules.priorityWeights){
    throw new Error("Configuração de regras de negócio indisponível. Recarregue a página.");
  }
  if(!config || String(config.assetVersion || "") !== "991"){
    throw new Error("Os arquivos da aplicação estão em versões diferentes. Recarregue sem cache.");
  }

  const requiredFunctions = [
    "api",
    "buildSmartFilters",
    "renderDashboardData",
    "loadRows",
    "updateFilterUI"
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
  retry.onclick = () => window.location.reload();
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

    loadPreferences();

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

    const uploadButton = $('btnUploadWorkbook');
    if(uploadButton) uploadButton.hidden = !boot.can_upload;

    buildSmartFilters();
    bindEvents();
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
    }, 300000);
  }catch(error){
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
      state.search = '';
      if(globalSearch) globalSearch.value = '';
      state.page = 1;
      updateSearchUI();
      updateFilterUI();
      savePreferences();
      loadRowsSafely();
      globalSearch?.focus();
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

  $('btnClear').onclick = clearAll;
  bindFilterDrawer();
  $('btnRefresh').onclick = refreshData;
  bindWorkbookUpload();
  $('btnExportCsv')?.addEventListener('click', () => {
    closeExportMenu();
    exportFile('csv');
  });
    const retryDataButton = $('btnRetryData');
  if(retryDataButton){
    retryDataButton.dataset.bootRecoveryBound = '0';
    retryDataButton.onclick = refreshData;
  }
  bindExportMenu();
  bindAdvancedSearchPanel();
  if($('pageSize')){ $('pageSize').value = String(state.pageSize || 50); $('pageSize').onchange = (e) => { state.pageSize = Number(e.target.value); state.page = 1; savePreferences(); loadRowsSafely(); }; }
  $('prevPage').onclick = () => { if(state.page > 1){ state.page--; loadRowsSafely(); } };
  $('nextPage').onclick = () => { state.page++; loadRowsSafely(); };

  document.addEventListener('click', (e) => {
    if(!e.target.closest('.smart-select')) closeAllPopovers();
    if(!e.target.closest('#exportMenu')) closeExportMenu();
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ closeAllPopovers(); closeFilterDrawer(); closeExportMenu(); closeAdvancedSearchPanel(); }
    const cmd = e.ctrlKey || e.metaKey;
    if(e.altKey && e.key === '1'){ e.preventDefault(); switchTab('visao'); }
    if(e.altKey && e.key === '2'){ e.preventDefault(); switchTab('base'); }
    if(cmd && e.key.toLowerCase() === 'k'){ e.preventDefault(); switchTab('base'); setTimeout(() => $('globalSearch')?.focus(), 80); }
    if(cmd && e.key.toLowerCase() === 'e'){ e.preventDefault(); exportFile('csv'); }
    if(cmd && e.key === 'Backspace'){ e.preventDefault(); clearAll(); }
    if(e.key === '?' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName || '')){
      showToast('Atalhos: Alt+1 visão, Alt+2 tabela, Ctrl+K busca, Ctrl+E exportar CSV.');
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

function bindWorkbookUpload(){
  const btn = $('btnUploadWorkbook');
  const input = $('workbookUpload');
  if(!btn || !input || btn.dataset.boundUpload === '1') return;
  btn.dataset.boundUpload = '1';
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if(!file) return;
    const ok = confirm(`Atualizar a base Excel com o arquivo:

${file.name}

A base anterior será salva em backup.`);
    if(!ok){ input.value = ''; return; }
    try{
      setLoading(true);
      const data = await uploadWorkbook(file);
      showToast(`${data.message}. ${Number(data.linhas || 0).toLocaleString('pt-BR')} registros carregados.`);
      state.page = 1;
      state.search = '';
      await refreshAll(true);
    }catch(err){ showToast(err.message, true); }
    finally{ input.value = ''; setLoading(false); }
  });
}

function bindExportMenu(){
  const btn = $('btnExportMenu');
  const menu = $('exportDropdown');
  if(!btn || !menu) return;
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.classList.toggle('active', open);
  });
}

function closeExportMenu(){
  const btn = $('btnExportMenu');
  const menu = $('exportDropdown');
  if(menu) menu.hidden = true;
  if(btn){ btn.setAttribute('aria-expanded','false'); btn.classList.remove('active'); }
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

function bindFilterDrawer(){
  $('btnOpenFilters')?.addEventListener('click', openFilterDrawer);
  $('btnCloseFilters')?.addEventListener('click', closeFilterDrawer);
  $('drawerBackdrop')?.addEventListener('click', closeFilterDrawer);
}

function openFilterDrawer(){
  state.lastFocus = document.activeElement;
  const drawer = $('filterDrawer');
  const backdrop = $('drawerBackdrop');
  const openButton = $('btnOpenFilters');
  if(!drawer) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  openButton?.setAttribute('aria-expanded','true');
  if(backdrop){
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('show'));
  }
  setTimeout(() => $('btnCloseFilters')?.focus(), 60);
}

function closeFilterDrawer(){
  const drawer = $('filterDrawer');
  const backdrop = $('drawerBackdrop');
  const openButton = $('btnOpenFilters');
  if(drawer){
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden','true');
  }
  openButton?.setAttribute('aria-expanded','false');
  if(backdrop){
    backdrop.classList.remove('show');
    setTimeout(() => { backdrop.hidden = true; }, 180);
  }
  if(state.lastFocus && typeof state.lastFocus.focus === 'function'){
    setTimeout(() => state.lastFocus.focus(), 80);
  }
}

function bindQuickChips(){
  document.querySelectorAll('#quickChips .quick-chip').forEach(btn => {
    btn.addEventListener('click', () => applyQuickFilter(btn.dataset.quick || 'TODAS'));
  });
}

function applyQuickFilter(kind){
  // Mantém filtros principais de solicitante/fornecedor/mês e só altera os filtros rápidos.
  state.filters['SLA STATUS'] = [];
  state.filters['FAIXA ATRASO'] = [];
  if(!['SEM_NF','SEM_LANCAMENTO','SEM_PEDIDO'].includes(kind)) state.filters['ETAPA'] = [];
  if(kind === 'FORA_SLA') state.filters['SLA STATUS'] = ['ATENÇÃO','CRÍTICO'];
  if(kind === 'CRITICO') state.filters['SLA STATUS'] = ['CRÍTICO'];
  if(kind === '15_DIAS') state.filters['FAIXA ATRASO'] = ['15+ dias','30+ dias'];
  if(kind === '30_DIAS') state.filters['FAIXA ATRASO'] = ['30+ dias'];
  if(kind === 'SEM_NF') state.filters['ETAPA'] = ['SEM NF'];
  if(kind === 'SEM_LANCAMENTO') state.filters['ETAPA'] = ['SEM LANÇAMENTO'];
  if(kind === 'SEM_PEDIDO') state.filters['ETAPA'] = ['SEM PEDIDO'];
  if(kind === 'TODAS'){
    state.filters['SLA STATUS'] = [];
    state.filters['FAIXA ATRASO'] = [];
    state.filters['ETAPA'] = [];
  }
  state.page = 1;
  syncQuickChips(kind);
  updateFilterUI();
  scheduleDashboard();
}

function syncQuickChips(activeKind=null){
  let kind = activeKind || 'TODAS';
  const sla = state.filters['SLA STATUS'] || [];
  const faixa = state.filters['FAIXA ATRASO'] || [];
  const etapa = state.filters['ETAPA'] || [];
  if(etapa.includes('SEM LANÇAMENTO')) kind = 'SEM_LANCAMENTO';
  else if(etapa.includes('SEM PEDIDO')) kind = 'SEM_PEDIDO';
  else if(etapa.includes('SEM NF')) kind = 'SEM_NF';
  else if(sla.length === 1 && sla.includes('CRÍTICO')) kind = 'CRITICO';
  else if(sla.includes('ATENÇÃO') && sla.includes('CRÍTICO')) kind = 'FORA_SLA';
  else if(faixa.includes('30+ dias') && faixa.includes('15+ dias')) kind = '15_DIAS';
  else if(faixa.length === 1 && faixa.includes('30+ dias')) kind = '30_DIAS';
  document.querySelectorAll('#quickChips .quick-chip').forEach(btn => btn.classList.toggle('active', btn.dataset.quick === kind));
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
  closeAllPopovers();
  closeFilterDrawer();
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

function clearAll(){
  Object.keys(state.filters).forEach(k => state.filters[k] = []);
  state.search = '';
  state.dateFrom = state.dateTo = state.valueMin = state.valueMax = '';
  state.page = 1;
  if($('globalSearch')) $('globalSearch').value = '';
  updateSearchUI();
  hydrateAdvancedSearch();
  updateFilterUI();
  syncQuickChips('TODAS');
  closeAllPopovers();
  closeFilterDrawer();
  savePreferences();
  refreshAll(true).catch(error => console.error('Falha ao limpar filtros:', error));
}

async function refreshData(){
  if(state.refreshPromise) return state.refreshPromise;

  try{
    setLoading(true);
    cacheClear();
    const result = await api('/api/refresh', {});
    state.dataVersion = result.data_version || state.dataVersion || '';
    state.generatedAt = result.generated_at || state.generatedAt || '';
    updateHeaderMetadata(result.metadata || {}, state.generatedAt);
    state.page = 1;
    await refreshAll(false);
    clearDataError();
    document.body.classList.remove('app-booting', 'app-error');
    document.body.classList.add('app-ready');
    showToast(`${result.message || 'Dados atualizados'}. ${Number(result.linhas || 0).toLocaleString('pt-BR')} registros carregados.`);
  }catch(error){
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
    'btnUploadWorkbook',
    'btnExportCsv',
    'btnClear',
    'btnExportMenu',
    'btnToggleAdvancedSearch',
    'btnClearSearch',
    'btnRetryData'
  ].forEach(id => {
    const element = $(id);
    if(element) element.disabled = Boolean(on);
  });
}


window.init = init;
