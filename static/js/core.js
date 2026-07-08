const scheduleDashboard = debounce(() => { savePreferences(); refreshAll(false); }, 160);
const scheduleRows = debounce(() => { savePreferences(); loadRows(); }, 220);

async function init(){
  nowClock();
  const boot = await api('/api/bootstrap');
  state.mainFilters = boot.main_filters || [];
  state.columns = boot.table_columns || [];
  state.stageColors = boot.stage_colors || {};
  loadPreferences();
  const meta = $('meta');
  if(meta) meta.textContent = `${Number(boot.metadata.linhas || 0).toLocaleString('pt-BR')} registros carregados · ${boot.metadata.arquivo || 'base Excel'} · Cloudflare Pages`;
  const uploadBtn = $('btnUploadWorkbook');
  if(uploadBtn) uploadBtn.hidden = !boot.can_upload;
  buildSmartFilters();
  bindEvents();
  hydrateAdvancedSearch();
  switchTab(state.activeTab || 'visao');
  await refreshAll(true);
  document.body.classList.add('v34-ready');
  const seconds = Number(boot.auto_reload_seconds || 0);
  if(seconds >= 30) setInterval(() => refreshAll(false), seconds * 1000);
}

function bindEvents(){
  const globalSearch = $('globalSearch');
  if(globalSearch){
    globalSearch.value = state.search || '';
    globalSearch.addEventListener('input', debounce((e) => {
      state.search = e.target.value || '';
      state.page = 1;
      scheduleRows();
    }, 250));
  }

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
  bindQuickChips();
  $('btnRefresh').onclick = refreshData;
  bindWorkbookUpload();
  $('btnExportExcel').onclick = () => { closeExportMenu(); exportFile('excel'); };
  $('btnExportPdf').onclick = () => { closeExportMenu(); exportPdf(); };
  bindExportMenu();
  bindAdvancedSearchPanel();
  if($('pageSize')){ $('pageSize').value = String(state.pageSize || 50); $('pageSize').onchange = (e) => { state.pageSize = Number(e.target.value); state.page = 1; savePreferences(); loadRows(); }; }
  $('prevPage').onclick = () => { if(state.page > 1){ state.page--; loadRows(); } };
  $('nextPage').onclick = () => { state.page++; loadRows(); };

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
    if(cmd && e.key.toLowerCase() === 'e'){ e.preventDefault(); exportFile('excel'); }
    if(cmd && e.shiftKey && e.key.toLowerCase() === 'p'){ e.preventDefault(); exportPdf(); }
    if(cmd && e.key === 'Backspace'){ e.preventDefault(); clearAll(); }
    if(e.key === '?' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName || '')){
      showToast('Atalhos: Alt+1 visão, Alt+2 tabela, Ctrl+K busca, Ctrl+E Excel, Ctrl+Shift+P PDF.');
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
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
  if(!drawer) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  if(backdrop){ backdrop.hidden = false; requestAnimationFrame(()=>backdrop.classList.add('show')); }
  setTimeout(() => $('btnCloseFilters')?.focus(), 60);
}

function closeFilterDrawer(){
  const drawer = $('filterDrawer');
  const backdrop = $('drawerBackdrop');
  if(drawer){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); }
  if(backdrop){ backdrop.classList.remove('show'); setTimeout(()=>{ backdrop.hidden = true; }, 180); }
  if(state.lastFocus && typeof state.lastFocus.focus === 'function') setTimeout(() => state.lastFocus.focus(), 80);
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

function switchTab(tab){
  const selected = tab || 'visao';
  state.activeTab = selected;
  savePreferences();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === selected);
  });
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.hidden = panel.dataset.panel !== selected;
  });
  document.body.classList.toggle('active-tab-visao', selected === 'visao');
  document.body.classList.toggle('active-tab-base', selected === 'base');
  closeAllPopovers();
  closeFilterDrawer();
  if(selected === 'base') loadRows();
  window.scrollTo({top: 0, behavior: 'auto'});
}

function clearAll(){
  Object.keys(state.filters).forEach(k => state.filters[k] = []);
  state.search = '';
  state.dateFrom = state.dateTo = state.valueMin = state.valueMax = '';
  state.page = 1;
  if($('globalSearch')) $('globalSearch').value = '';
  hydrateAdvancedSearch();
  updateFilterUI();
  syncQuickChips('TODAS');
  closeAllPopovers();
  closeFilterDrawer();
  savePreferences();
  refreshAll(true);
}

async function refreshData(){
  try{
    setLoading(true);
    cacheClear();
    await api('/api/refresh', {});
    showToast('Dados atualizados da base estática.');
    await refreshAll(false);
  }catch(err){ showToast(err.message, true); }
  finally{ setLoading(false); }
}

async function refreshAll(withLoader=true){
  const seq = ++state.dashboardSeq;
  try{
    if(withLoader) setLoading(true);
    updateFilterUI();
    await loadDashboard(seq);
    if(state.activeTab === 'base') await loadRows(seq);
  }catch(err){ showToast(err.message, true); }
  finally{ if(withLoader && seq === state.dashboardSeq) setLoading(false); }
}

function setLoading(on){
  state.isRefreshing = on;
  document.body.classList.toggle('loading', on);
  document.body.setAttribute('aria-busy', on ? 'true' : 'false');
  ['btnRefresh','btnUploadWorkbook','btnExportExcel','btnExportPdf','btnClear','btnExportMenu','btnToggleAdvancedSearch'].forEach(id => { const el=$(id); if(el) el.disabled=on; });
}
