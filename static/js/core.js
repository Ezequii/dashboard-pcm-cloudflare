'use strict';

async function init(){
  loadPreferences();
  applyUrlState();
  const boot=await api('/api/bootstrap');
  state.boot=boot;
  state.mainFilters=Array.isArray(boot.main_filters)&&boot.main_filters.length
    ?boot.main_filters
    :[
      {key:'SOLICITANTE',label:'Solicitante'},
      {key:'FORNECEDOR',label:'Fornecedor'},
      {key:'ETAPA',label:'Etapas'},
      {key:'MES_RECEBIMENTO',label:'Mês'},
    ];
  state.columns=Array.isArray(boot.table_columns)?boot.table_columns:[];
  state.fullColumns=Array.isArray(boot.full_table_columns)?boot.full_table_columns:state.columns.slice();
  ensureFilterArrays();
  buildSmartFilters();
  bindEvents();
  hydrateControlsFromState();
  renderSavedViews();
  renderMetadata(boot);
  switchTab(state.activeTab);
  await refreshAll(true);
  document.body.classList.add('ready');

  const autoReload=Number(boot.auto_reload_seconds||0);
  if(autoReload>=30){
    setInterval(()=>refreshData(false),autoReload*1000);
  }
  setInterval(async()=>{
    try{
      if(await checkForDataUpdates()){
        showToast('Nova base detectada. Atualizando o painel...');
        await refreshData(false);
      }
    }catch(error){
      console.warn('Verificação automática falhou:',error);
    }
  },300000);
}

function bindEvents(){
  document.querySelectorAll('[data-tab]').forEach(button=>{
    button.addEventListener('click',()=>{
      switchTab(button.dataset.tab);
      refreshAll(false);
    });
  });

  $('btnRefresh')?.addEventListener('click',()=>refreshData(true));
  $('btnOpenFilters')?.addEventListener('click',openFilterDrawer);
  $('btnCloseFilters')?.addEventListener('click',closeFilterDrawer);
  $('btnOpenColumns')?.addEventListener('click',openColumnDrawer);
  $('btnCloseColumns')?.addEventListener('click',closeColumnDrawer);
  $('btnApplyColumns')?.addEventListener('click',applyColumnChooser);
  $('btnResetColumns')?.addEventListener('click',resetColumns);
  $('btnCloseDetails')?.addEventListener('click',closeRowDetails);
  $('drawerBackdrop')?.addEventListener('click',closeAllDrawers);

  $('btnExportMenu')?.addEventListener('click',toggleExportMenu);
  $('btnExportXlsx')?.addEventListener('click',()=>{closeExportMenu();exportXlsx('current');});
  $('btnExportSelected')?.addEventListener('click',()=>{closeExportMenu();exportXlsx('selected');});
  $('btnExportCsv')?.addEventListener('click',()=>{closeExportMenu();exportCsv();});

  $('btnClear')?.addEventListener('click',clearAll);
  $('btnSaveView')?.addEventListener('click',promptSaveView);
  $('btnCopyLink')?.addEventListener('click',copyCurrentViewLink);
  document.querySelectorAll('[data-preset]').forEach(button=>{
    button.addEventListener('click',()=>applyPreset(button.dataset.preset));
  });

  const search=$('globalSearch');
  search?.addEventListener('input',debounce(event=>{
    state.search=String(event.target.value||'').slice(0,2000);
    state.page=1;
    state.selectedRowIds.clear();
    updateSearchUI();
    savePreferences();
    syncUrlState();
    loadRows();
    renderActiveFilters();
  },240));
  search?.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey){
      event.preventDefault();
      state.search=search.value;
      state.page=1;
      loadRows();
    }
  });
  $('searchScope')?.addEventListener('change',event=>{
    state.searchScope=event.target.value||'AUTO';
    state.page=1;
    savePreferences();
    loadRows();
  });
  $('btnClearSearch')?.addEventListener('click',()=>{
    state.search='';
    if(search) search.value='';
    state.page=1;
    updateSearchUI();
    savePreferences();
    syncUrlState();
    loadRows();
    renderActiveFilters();
    search?.focus();
  });

  $('btnToggleAdvancedSearch')?.addEventListener('click',()=>{
    const panel=$('advancedSearchPanel');
    const open=!panel.hidden;
    panel.hidden=open;
    $('btnToggleAdvancedSearch').setAttribute('aria-expanded',String(!open));
  });
  ['advDateFrom','advDateTo','advValueMin','advValueMax','advAgeMin','advAgeMax'].forEach(id=>{
    $(id)?.addEventListener('input',debounce(()=>{
      readAdvancedControls();
      state.page=1;
      state.selectedRowIds.clear();
      savePreferences();
      syncUrlState();
      updateFilterUI();
      refreshAll(false);
    },320));
  });
  $('btnClearAdvanced')?.addEventListener('click',()=>{
    state.dateFrom=state.dateTo=state.valueMin=state.valueMax=state.ageMin=state.ageMax='';
    hydrateAdvancedSearch();
    onFiltersChanged();
  });

  $('pageSize')?.addEventListener('change',event=>{
    state.pageSize=Number(event.target.value||100);
    state.page=1;
    savePreferences();
    loadRows();
  });
  $('prevPage')?.addEventListener('click',()=>{
    if(state.page>1){state.page-=1;loadRows();}
  });
  $('nextPage')?.addEventListener('click',()=>{
    state.page+=1;
    loadRows();
  });

  $('btnCopySelected')?.addEventListener('click',copySelectedSummaries);
  $('btnExportSelectedToolbar')?.addEventListener('click',()=>exportXlsx('selected'));
  $('btnClearSelection')?.addEventListener('click',clearSelection);

  $('densitySelect')?.addEventListener('change',event=>{
    state.density=event.target.value;
    savePreferences();
    if(state.currentRows.length){
      renderDataTable({
        columns:state.currentColumns,
        rows:state.currentRows,
        total:state.currentTotal,
        page:state.page,
        pages:Math.max(1,Math.ceil(state.currentTotal/state.pageSize)),
        from:state.currentTotal?(state.page-1)*state.pageSize+1:0,
        to:Math.min(state.page*state.pageSize,state.currentTotal),
      });
    }
  });

  document.querySelectorAll('[data-ranking-mode]').forEach(button=>{
    button.addEventListener('click',()=>setRankingMode(button.dataset.rankingMode));
  });

  document.addEventListener('click',event=>{
    if(!event.target.closest('.smart-select')) closeAllPopovers();
    if(!event.target.closest('#exportMenu')) closeExportMenu();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      closeAllPopovers();
      closeExportMenu();
      closeAllDrawers();
    }
  });
}

function hydrateControlsFromState(){
  const search=$('globalSearch');
  if(search) search.value=state.search||'';
  const scope=$('searchScope');
  if(scope) scope.value=state.searchScope||'AUTO';
  const size=$('pageSize');
  if(size) size.value=String(state.pageSize||100);
  const density=$('densitySelect');
  if(density) density.value=state.density;
  hydrateAdvancedSearch();
  updateSearchUI();
  updateFilterUI();
}

function hydrateAdvancedSearch(){
  const values={
    advDateFrom:state.dateFrom,
    advDateTo:state.dateTo,
    advValueMin:state.valueMin,
    advValueMax:state.valueMax,
    advAgeMin:state.ageMin,
    advAgeMax:state.ageMax,
  };
  Object.entries(values).forEach(([id,value])=>{
    const element=$(id);
    if(element) element.value=value??'';
  });
}

function readAdvancedControls(){
  state.dateFrom=$('advDateFrom')?.value||'';
  state.dateTo=$('advDateTo')?.value||'';
  state.valueMin=$('advValueMin')?.value??'';
  state.valueMax=$('advValueMax')?.value??'';
  state.ageMin=$('advAgeMin')?.value??'';
  state.ageMax=$('advAgeMax')?.value??'';
}

function updateSearchUI(){
  const search=$('globalSearch');
  const clear=$('btnClearSearch');
  const help=$('searchHelp');
  if(clear) clear.hidden=!state.search;
  if(help){
    const multi=splitSearchTerms(state.search).length>1;
    help.textContent=multi
      ?`${formatNumber(splitSearchTerms(state.search).length)} códigos ou termos serão pesquisados em conjunto.`
      :'Cole um ou vários códigos, separados por linha, vírgula ou ponto e vírgula.';
  }
  if(search){
    search.placeholder=state.searchScope==='FORNECEDOR'
      ?'Digite o fornecedor...'
      :state.searchScope==='SOLICITANTE'
        ?'Digite o solicitante...'
        :'Cole RCs, pedidos, NF, orçamento, fornecedor...';
  }
}

function updateSearchStatus(total){
  const status=$('searchResultStatus');
  if(!status) return;
  if(!state.search){
    status.textContent='';
    status.hidden=true;
    return;
  }
  status.hidden=false;
  status.textContent=`${formatNumber(total||0)} resultado${Number(total||0)===1?'':'s'} para a busca atual`;
}

function switchTab(tab){
  state.activeTab=tab==='base'?'base':'visao';
  document.querySelectorAll('[data-panel]').forEach(panel=>{
    panel.hidden=panel.dataset.panel!==state.activeTab;
  });
  document.querySelectorAll('[data-tab]').forEach(button=>{
    const active=button.dataset.tab===state.activeTab;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
  });
  savePreferences();
  syncUrlState();
  if(state.activeTab==='base'){
    requestAnimationFrame(()=>$('globalSearch')?.focus({preventScroll:true}));
  }
}

async function refreshAll(initial=false){
  const dashboardSequence=++state.dashboardSeq;
  const rowsSequence=++state.rowsSeq;
  setBusy(true);
  clearPersistentError();
  try{
    const tasks=[loadDashboard(dashboardSequence)];
    if(state.activeTab==='base') tasks.push(loadRows(rowsSequence));
    await Promise.all(tasks);
    renderActiveFilters();
  }catch(error){
    showPersistentError(error.message);
    if(!initial) showToast(error.message,true);
  }finally{
    setBusy(false);
  }
}

async function refreshData(showSuccess=true){
  if(state.isRefreshing) return;
  state.isRefreshing=true;
  setBusy(true);
  try{
    resetStaticData();
    const result=await api('/api/refresh');
    cacheClear();
    const boot=await api('/api/bootstrap');
    state.boot=boot;
    renderMetadata(boot);
    await refreshAll(false);
    if(showSuccess) showToast(`${result.message}: ${formatNumber(result.linhas)} registros.`);
  }catch(error){
    showPersistentError(error.message);
    showToast(error.message,true);
  }finally{
    state.isRefreshing=false;
    setBusy(false);
  }
}

function renderMetadata(boot){
  const metadata=boot.metadata||{};
  const generated=boot.generated_at?new Date(boot.generated_at):null;
  const meta=$('meta');
  const count=formatNumber(metadata.linhas||0);
  if(meta){
    meta.textContent=generated&&!Number.isNaN(generated.getTime())
      ?`${count} registros · ${generated.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`
      :`${count} registros`;
    meta.title=metadata.arquivo?`Fonte: ${metadata.arquivo}`:'Base estática';
  }
  const status=$('dataFreshness');
  if(status&&generated&&!Number.isNaN(generated.getTime())){
    const hours=(Date.now()-generated.getTime())/3600000;
    const stale=hours>BUSINESS_RULES.targets.staleAfterHours;
    status.className=`data-freshness ${stale?'stale':'fresh'}`;
    status.textContent=stale?`Base desatualizada · ${Math.floor(hours)}h`:'Base atualizada';
    status.title=`Gerada em ${generated.toLocaleString('pt-BR')}`;
  }
}

function clearAll(){
  state.filters={};
  ensureFilterArrays();
  state.search='';
  state.searchScope='AUTO';
  state.dateFrom=state.dateTo=state.valueMin=state.valueMax=state.ageMin=state.ageMax='';
  state.page=1;
  state.selectedRowIds.clear();
  hydrateControlsFromState();
  closeFilterDrawer();
  savePreferences();
  syncUrlState();
  refreshAll(false);
}

function showPersistentError(message){
  const banner=$('errorBanner');
  if(!banner) return;
  banner.hidden=false;
  const text=banner.querySelector('[data-error-message]');
  if(text) text.textContent=String(message||'Ocorreu um erro ao carregar o dashboard.');
}

function clearPersistentError(){
  const banner=$('errorBanner');
  if(banner) banner.hidden=true;
}

function openFilterDrawer(){
  openDrawer('filterDrawer');
  renderSavedViews();
}

function closeFilterDrawer(){
  closeDrawer('filterDrawer');
}

function openColumnDrawer(){
  renderColumnChooser();
  openDrawer('columnDrawer');
}

function closeColumnDrawer(){
  closeDrawer('columnDrawer');
}

function openDrawer(id){
  const drawer=$(id);
  if(!drawer) return;
  state.lastFocus=document.activeElement;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  if($('drawerBackdrop')) $('drawerBackdrop').hidden=false;
  drawer.querySelector('button,input,select')?.focus();
}

function closeDrawer(id){
  const drawer=$(id);
  if(!drawer) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  const anyOpen=['filterDrawer','columnDrawer','detailDrawer'].some(drawerId=>$(drawerId)?.classList.contains('open'));
  if(!anyOpen&&$('drawerBackdrop')) $('drawerBackdrop').hidden=true;
}

function closeAllDrawers(){
  closeFilterDrawer();
  closeColumnDrawer();
  closeRowDetails();
}

function toggleExportMenu(){
  const dropdown=$('exportDropdown');
  const button=$('btnExportMenu');
  if(!dropdown||!button) return;
  const open=dropdown.hidden;
  dropdown.hidden=!open;
  button.setAttribute('aria-expanded',String(open));
}

function closeExportMenu(){
  const dropdown=$('exportDropdown');
  if(dropdown) dropdown.hidden=true;
  $('btnExportMenu')?.setAttribute('aria-expanded','false');
}

function encodeViewState(value){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary='';
  bytes.forEach(byte=>{binary+=String.fromCharCode(byte);});
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function decodeViewState(value){
  const padded=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(padded+'='.repeat((4-padded.length%4)%4));
  const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function syncUrlState(){
  try{
    const url=new URL(window.location.href);
    const compact=serializeViewState();
    const hasContext=collectActiveContexts().length||state.activeTab==='base';
    if(hasContext) url.searchParams.set('view',encodeViewState(compact));
    else url.searchParams.delete('view');
    history.replaceState(null,'',url);
  }catch(error){
    console.warn('Não foi possível sincronizar a URL:',error);
  }
}

function applyUrlState(){
  try{
    const url=new URL(window.location.href);
    const encoded=url.searchParams.get('view');
    if(!encoded) return;
    applyViewState(decodeViewState(encoded));
  }catch(error){
    console.warn('Link de visão inválido:',error);
  }
}

async function copyCurrentViewLink(){
  syncUrlState();
  await copyText(window.location.href);
  showToast('Link da visão atual copiado.');
}
