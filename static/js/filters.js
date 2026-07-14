'use strict';

function buildSmartFilters(){
  const host=$('mainFilters');
  if(!host) return;
  host.innerHTML='';
  state.mainFilters.forEach(definition => host.appendChild(createSmartSelect(definition)));
  updateFilterUI();
}

function createSmartSelect(definition){
  if(!Array.isArray(state.filters[definition.key])) state.filters[definition.key]=[];
  const wrapper=document.createElement('div');
  wrapper.className='smart-select';
  wrapper.dataset.key=definition.key;
  wrapper.dataset.label=definition.label;
  wrapper.innerHTML=`
    <button type="button" class="smart-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="smart-title">${escapeHtml(definition.label)}</span>
      <strong class="smart-value">Todos</strong>
      <span class="smart-caret" aria-hidden="true">⌄</span>
    </button>
    <div class="option-popover" role="dialog" aria-label="Selecionar ${escapeAttr(definition.label)}">
      <label class="popover-search">
        <span class="sr-only">Pesquisar ${escapeHtml(definition.label)}</span>
        <input class="smart-search" type="search" autocomplete="off" placeholder="Pesquisar ${escapeAttr(definition.label.toLowerCase())}" />
      </label>
      <div class="option-tools">
        <button type="button" data-action="all">Selecionar exibidos</button>
        <button type="button" data-action="clear">Limpar</button>
      </div>
      <div class="option-list" role="listbox" aria-multiselectable="true"><div class="option-empty">Carregando...</div></div>
    </div>`;
  const trigger=wrapper.querySelector('.smart-trigger');
  const search=wrapper.querySelector('.smart-search');
  trigger.addEventListener('click',event=>{
    event.stopPropagation();
    toggleOptions(wrapper);
  });
  search.addEventListener('click',event=>event.stopPropagation());
  search.addEventListener('input',debounce(()=>loadOptions(wrapper),180));
  wrapper.querySelector('[data-action="all"]').addEventListener('click',event=>{
    event.stopPropagation();
    const values=Array.from(wrapper.querySelectorAll('.option-item')).map(item=>item.dataset.value).filter(Boolean);
    state.filters[definition.key]=Array.from(new Set([...(state.filters[definition.key]||[]),...values]));
    onFiltersChanged();
    loadOptions(wrapper);
  });
  wrapper.querySelector('[data-action="clear"]').addEventListener('click',event=>{
    event.stopPropagation();
    state.filters[definition.key]=[];
    search.value='';
    onFiltersChanged();
    loadOptions(wrapper);
  });
  return wrapper;
}

function toggleOptions(wrapper){
  const popover=wrapper.querySelector('.option-popover');
  const open=popover.classList.contains('open');
  closeAllPopovers();
  if(open) return;
  popover.classList.add('open');
  wrapper.classList.add('open-select');
  wrapper.querySelector('.smart-trigger').setAttribute('aria-expanded','true');
  wrapper.querySelector('.smart-search').focus();
  loadOptions(wrapper);
}

function closeAllPopovers(){
  document.querySelectorAll('.smart-select').forEach(wrapper=>{
    wrapper.querySelector('.option-popover')?.classList.remove('open');
    wrapper.classList.remove('open-select');
    wrapper.querySelector('.smart-trigger')?.setAttribute('aria-expanded','false');
  });
}

async function loadOptions(wrapper){
  const key=wrapper.dataset.key;
  const search=wrapper.querySelector('.smart-search');
  const list=wrapper.querySelector('.option-list');
  list.innerHTML='<div class="option-empty">Carregando...</div>';
  try{
    const data=await api('/api/options',{
      ...baseQuery(),
      filter_key:key,
      option_search:search.value||'',
      limit:500,
    });
    const selected=new Set(state.filters[key]||[]);
    const options=(data.options||[]).filter(Boolean);
    if(!options.length){
      list.innerHTML='<div class="option-empty">Nenhuma opção encontrada</div>';
      return;
    }
    list.innerHTML=options.map(option=>{
      const checked=selected.has(option);
      return `<button type="button" class="option-item${checked?' selected':''}" role="option" aria-selected="${checked}" data-value="${escapeAttr(option)}" title="${escapeAttr(option)}">
        <span>${escapeHtml(option)}</span><i aria-hidden="true">${checked?'✓':''}</i>
      </button>`;
    }).join('')+`<div class="option-count">Exibindo ${formatNumber(options.length)} de ${formatNumber(data.total||options.length)}</div>`;
    list.querySelectorAll('.option-item').forEach(item=>{
      item.addEventListener('click',event=>{
        event.stopPropagation();
        const value=item.dataset.value;
        const values=new Set(state.filters[key]||[]);
        if(values.has(value)) values.delete(value); else values.add(value);
        state.filters[key]=Array.from(values);
        onFiltersChanged();
        loadOptions(wrapper);
      });
    });
  }catch(error){
    list.innerHTML=`<div class="option-empty">${escapeHtml(error.message)}</div>`;
  }
}

function onFiltersChanged(){
  state.page=1;
  state.selectedRowIds.clear();
  updateFilterUI();
  savePreferences();
  syncUrlState();
  refreshAll(false);
}

function updateFilterUI(){
  document.querySelectorAll('.smart-select').forEach(wrapper=>{
    const key=wrapper.dataset.key;
    const values=state.filters[key]||[];
    const trigger=wrapper.querySelector('.smart-trigger');
    const value=wrapper.querySelector('.smart-value');
    trigger.classList.toggle('has-value',values.length>0);
    if(values.length===1) value.textContent=values[0];
    else if(values.length>1) value.textContent=`${values.length} selecionados`;
    else value.textContent='Todos';
    value.title=values.length?values.join(', '):'Sem filtro';
  });
  renderActiveFilters();
  renderFilterCounter();
}

function getFilterLabel(key){
  const labels={
    'ETAPA':'Etapa',
    'SOLICITANTE':'Solicitante',
    'FORNECEDOR':'Fornecedor',
    'MES_RECEBIMENTO':'Mês',
    'DONO DA AÇÃO':'Responsável',
    'EFFECTIVE_OWNER':'Responsável',
    'PENDING_ONLY':'Em andamento',
    'CRITICAL_ONLY':'Críticas',
  };
  return labels[key] || state.mainFilters.find(item=>item.key===key)?.label || key;
}

function collectActiveContexts(){
  const items=[];
  Object.entries(state.filters||{}).forEach(([key,values])=>{
    if(!Array.isArray(values)||!values.length) return;
    items.push({
      type:'filter',
      key,
      label:getFilterLabel(key),
      text:['PENDING_ONLY','CRITICAL_ONLY'].includes(key)?'Sim':(values.length===1?values[0]:`${values.length} selecionados`),
    });
  });
  if(state.dateFrom||state.dateTo) items.push({type:'date',key:'date',label:'Período',text:`${state.dateFrom||'início'} → ${state.dateTo||'hoje'}`});
  if(state.valueMin!==''||state.valueMax!=='') items.push({type:'value',key:'value',label:'Valor',text:`${state.valueMin||'0'} → ${state.valueMax||'sem limite'}`});
  if(state.ageMin!==''||state.ageMax!=='') items.push({type:'age',key:'age',label:'Dias',text:`${state.ageMin||'0'} → ${state.ageMax||'sem limite'}`});
  if(state.search) items.push({type:'search',key:'search',label:'Busca',text:state.search.replace(/\n/g,', ').slice(0,80)});
  return items;
}

function renderActiveFilters(){
  const host=$('activeFilters');
  if(!host) return;
  const contexts=collectActiveContexts();
  if(!contexts.length){
    host.hidden=true;
    host.innerHTML='';
    return;
  }
  host.hidden=false;
  host.innerHTML=`
    <div class="context-summary">
      <div class="context-title"><span>Contexto atual</span><strong>${formatNumber(contexts.length)} filtro${contexts.length===1?'':'s'} ativo${contexts.length===1?'':'s'}</strong></div>
      <div class="context-chips">${contexts.map(item=>`
        <button type="button" class="context-chip" data-context-type="${escapeAttr(item.type)}" data-context-key="${escapeAttr(item.key)}" title="Remover ${escapeAttr(item.label)}">
          <span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.text)}</strong><i aria-hidden="true">×</i>
        </button>`).join('')}</div>
      <div class="context-actions">
        <button type="button" class="text-button" id="btnSaveViewInline">Salvar visão</button>
        <button type="button" class="text-button" id="btnCopyViewLink">Copiar link</button>
        <button type="button" class="text-button danger" id="btnClearInline">Limpar tudo</button>
      </div>
    </div>`;
  host.querySelectorAll('.context-chip').forEach(button=>{
    button.addEventListener('click',()=>clearContextItem(button.dataset.contextType,button.dataset.contextKey));
  });
  $('btnClearInline')?.addEventListener('click',clearAll);
  $('btnCopyViewLink')?.addEventListener('click',copyCurrentViewLink);
  $('btnSaveViewInline')?.addEventListener('click',promptSaveView);
}

function clearContextItem(type,key){
  if(type==='filter') state.filters[key]=[];
  else if(type==='date') state.dateFrom=state.dateTo='';
  else if(type==='value') state.valueMin=state.valueMax='';
  else if(type==='age') state.ageMin=state.ageMax='';
  else if(type==='search'){
    state.search='';
    const field=$('globalSearch');
    if(field) field.value='';
  }
  hydrateAdvancedSearch();
  onFiltersChanged();
}

function renderFilterCounter(){
  const button=$('btnOpenFilters');
  if(!button) return;
  const count=collectActiveContexts().length;
  button.classList.toggle('has-filters',count>0);
  const badge=button.querySelector('.filter-count');
  if(badge){
    badge.textContent=String(count);
    badge.hidden=count===0;
  }
}

function applyPreset(name){
  state.filters={};
  state.dateFrom=state.dateTo=state.valueMin=state.valueMax=state.ageMin=state.ageMax='';
  state.search='';
  state.searchScope='AUTO';
  if(name==='pcm') state.filters.ETAPA=['SEM LANÇAMENTO'];
  if(name==='critical') state.filters.CRITICAL_ONLY=['1'];
  if(name==='30days') state.ageMin=BUSINESS_RULES.aging.critical;
  if(name==='highvalue') state.valueMin=BUSINESS_RULES.values.high;
  if(name==='pending') state.filters.PENDING_ONLY=['1'];
  if(name==='invoice') state.filters.ETAPA=['SEM NF'];
  ensureFilterArrays();
  hydrateAdvancedSearch();
  const search=$('globalSearch');
  if(search) search.value='';
  closeFilterDrawer();
  onFiltersChanged();
}

function ensureFilterArrays(){
  state.mainFilters.forEach(definition=>{
    if(!Array.isArray(state.filters[definition.key])) state.filters[definition.key]=[];
  });
}

function promptSaveView(){
  const name=window.prompt('Nome da visão salva:');
  if(!name) return;
  try{
    saveNamedView(name);
    renderSavedViews();
    showToast(`Visão “${name.trim()}” salva neste navegador.`);
  }catch(error){
    showToast(error.message,true);
  }
}

function renderSavedViews(){
  const host=$('savedViewsList');
  if(!host) return;
  const views=getSavedViews();
  if(!views.length){
    host.innerHTML='<p class="empty-note">Nenhuma visão salva neste navegador.</p>';
    return;
  }
  host.innerHTML=views.map(view=>`
    <div class="saved-view-row">
      <button type="button" class="saved-view-open" data-view-name="${escapeAttr(view.name)}">${escapeHtml(view.name)}</button>
      <button type="button" class="saved-view-delete" data-delete-view="${escapeAttr(view.name)}" aria-label="Excluir ${escapeAttr(view.name)}">×</button>
    </div>`).join('');
  host.querySelectorAll('[data-view-name]').forEach(button=>{
    button.addEventListener('click',()=>{
      const view=getSavedViews().find(item=>item.name===button.dataset.viewName);
      if(!view) return;
      applyViewState(view.state);
      ensureFilterArrays();
      hydrateControlsFromState();
      updateFilterUI();
      closeFilterDrawer();
      switchTab(state.activeTab);
      refreshAll(false);
      showToast(`Visão “${view.name}” aplicada.`);
    });
  });
  host.querySelectorAll('[data-delete-view]').forEach(button=>{
    button.addEventListener('click',()=>{
      deleteNamedView(button.dataset.deleteView);
      renderSavedViews();
    });
  });
}
