function buildSmartFilters(){
  const main = $('mainFilters');
  if(!main) return;
  main.innerHTML = '';
  state.mainFilters.forEach(definition => main.appendChild(createSmartSelect(definition)));
}

function createSmartSelect(definition){
  state.filters[definition.key] = state.filters[definition.key] || [];

  const wrapper = document.createElement('div');
  wrapper.className = 'smart-select';
  wrapper.dataset.key = definition.key;
  wrapper.dataset.label = definition.label;
  wrapper.innerHTML = `
    <button type="button" class="smart-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="smart-title">${escapeHtml(definition.label)}</span>
      <strong class="smart-value">Todos</strong>
      <span class="smart-caret" aria-hidden="true">⌄</span>
    </button>
    <div class="option-popover" role="listbox" aria-label="${escapeAttr(definition.label)}">
      <div class="popover-search">
        <input class="smart-search" type="search" placeholder="Pesquisar ${escapeAttr(definition.label.toLowerCase())}" />
      </div>
      <div class="option-tools">
        <button type="button" data-action="all">Selecionar exibidos</button>
        <button type="button" data-action="clear">Limpar</button>
      </div>
      <div class="option-list"><div class="option-empty">Carregando...</div></div>
    </div>`;

  const trigger = wrapper.querySelector('.smart-trigger');
  const search = wrapper.querySelector('.smart-search');

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    toggleOptions(wrapper);
  });

  search.addEventListener('input', debounce(() => loadOptions(wrapper), 220));
  search.addEventListener('click', event => event.stopPropagation());

  wrapper.querySelector('[data-action="all"]').onclick = event => {
    event.stopPropagation();
    const displayedOptions = Array.from(wrapper.querySelectorAll('.option-item'))
      .map(element => element.dataset.value)
      .filter(Boolean);
    state.filters[definition.key] = Array.from(new Set([
      ...(state.filters[definition.key] || []),
      ...displayedOptions
    ]));
    window.invalidateOperationalViewContextV114?.(definition.key);
    updateFilterUI();
    state.page = 1;
    scheduleDashboard();
    loadOptions(wrapper);
  };

  wrapper.querySelector('[data-action="clear"]').onclick = event => {
    event.stopPropagation();
    state.filters[definition.key] = [];
    window.invalidateOperationalViewContextV114?.(definition.key);
    search.value = '';
    updateFilterUI();
    state.page = 1;
    scheduleDashboard();
    loadOptions(wrapper);
  };

  return wrapper;
}

function toggleOptions(wrapper){
  const popover = wrapper.querySelector('.option-popover');
  const wasOpen = popover.classList.contains('open');
  closeAllPopovers(wrapper);

  if(wasOpen){
    popover.classList.remove('open');
    wrapper.classList.remove('open-select');
    wrapper.querySelector('.smart-trigger').setAttribute('aria-expanded', 'false');
    return;
  }

  popover.classList.add('open');
  wrapper.classList.add('open-select');
  wrapper.querySelector('.smart-trigger').setAttribute('aria-expanded', 'true');
  wrapper.querySelector('.smart-search').focus();
  loadOptions(wrapper);
}

async function loadOptions(wrapper){
  const key = wrapper.dataset.key;
  const search = wrapper.querySelector('.smart-search');
  const list = wrapper.querySelector('.option-list');
  list.innerHTML = '<div class="option-empty">Carregando...</div>';

  try{
    const data = await api('/api/options', {
      filters:state.filters,
      search:'',
      filter_key:key,
      option_search:search.value || '',
      date_from:state.dateFrom || '',
      date_to:state.dateTo || '',
      limit:300
    });

    const selected = new Set(state.filters[key] || []);
    const options = (data.options || []).filter(value => String(value || '').trim());

    if(!options.length){
      list.innerHTML = '<div class="option-empty">Nenhuma opção encontrada</div>';
      return;
    }

    list.innerHTML = options.map(option => {
      const checked = selected.has(option);
      return `
        <button
          type="button"
          class="option-item${checked ? ' selected' : ''}"
          data-value="${escapeAttr(option)}"
          title="${escapeAttr(option)}"
          role="option"
          aria-selected="${checked ? 'true' : 'false'}">
          <span>${escapeHtml(option)}</span><i aria-hidden="true">${checked ? '✓' : ''}</i>
        </button>`;
    }).join('') + `
      <div class="option-count">
        Exibindo ${options.length.toLocaleString('pt-BR')} de ${Number(data.total || options.length).toLocaleString('pt-BR')}
      </div>`;

    list.querySelectorAll('.option-item').forEach(item => {
      item.onclick = event => {
        event.stopPropagation();
        const value = item.dataset.value;
        const set = new Set(state.filters[key] || []);
        if(set.has(value)) set.delete(value);
        else set.add(value);
        state.filters[key] = Array.from(set);
        window.invalidateOperationalViewContextV114?.(key);
        updateFilterUI();
        state.page = 1;
        scheduleDashboard();
        loadOptions(wrapper);
      };
    });
  }catch(error){
    list.innerHTML = `<div class="option-empty">${escapeHtml(error.message || 'Não foi possível carregar as opções.')}</div>`;
  }
}

function closeAllPopovers(except=null){
  document.querySelectorAll('.smart-select').forEach(wrapper => {
    if(except && wrapper === except) return;
    wrapper.querySelector('.option-popover')?.classList.remove('open');
    wrapper.classList.remove('open-select');
    wrapper.querySelector('.smart-trigger')?.setAttribute('aria-expanded', 'false');
  });
}

function activeFilterEntries(){
  const entries = [];

  for(const [key, values] of Object.entries(state.filters || {})){
    const cleanValues = (values || []).map(String).filter(value => value.trim());
    if(!cleanValues.length) continue;
    entries.push({
      key,
      type:'filter',
      label:getFilterLabel(key),
      text:cleanValues.length === 1 ? cleanValues[0] : `${cleanValues.length} selecionados`,
      values:cleanValues
    });
  }

  const search = String(state.search || '').trim();
  if(search){
    entries.push({
      key:'__SEARCH__',
      type:'search',
      label:'Busca',
      text:search,
      values:[search]
    });
  }

  if(state.dateFrom){
    entries.push({key:'__DATE_FROM__', type:'advanced', label:'Recebido de', text:state.dateFrom, values:[state.dateFrom]});
  }
  if(state.dateTo){
    entries.push({key:'__DATE_TO__', type:'advanced', label:'Recebido até', text:state.dateTo, values:[state.dateTo]});
  }
  if(state.valueMin !== ''){
    entries.push({
      key:'__VALUE_MIN__',
      type:'advanced',
      label:'Valor mínimo',
      text:Number(state.valueMin || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}),
      values:[state.valueMin]
    });
  }
  if(state.valueMax !== ''){
    entries.push({
      key:'__VALUE_MAX__',
      type:'advanced',
      label:'Valor máximo',
      text:Number(state.valueMax || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}),
      values:[state.valueMax]
    });
  }

  return entries;
}

function clearFilterEntry(key){
  if(key === '__SEARCH__'){
    state.search = '';
    if($('globalSearch')) $('globalSearch').value = '';
    updateSearchUI();
  }else if(key === '__DATE_FROM__'){
    state.dateFrom = '';
    hydrateAdvancedSearch();
  }else if(key === '__DATE_TO__'){
    state.dateTo = '';
    hydrateAdvancedSearch();
  }else if(key === '__VALUE_MIN__'){
    state.valueMin = '';
    hydrateAdvancedSearch();
  }else if(key === '__VALUE_MAX__'){
    state.valueMax = '';
    hydrateAdvancedSearch();
  }else{
    state.filters[key] = [];
    window.invalidateOperationalViewContextV114?.(key);
  }

  state.page = 1;
  updateFilterUI();
  savePreferences();

  if(key === '__SEARCH__'){
    if(state.activeTab === 'base') loadRowsSafely();
  }else{
    scheduleDashboard();
  }
}

function filterContextDescription(entries){
  const hasOperational = entries.some(entry => ['ETAPA','SLA STATUS','FAIXA ATRASO'].includes(entry.key));
  const hasSearch = entries.some(entry => entry.type === 'search');
  const hasAdvanced = entries.some(entry => entry.type === 'advanced');

  if(hasOperational && (hasSearch || hasAdvanced)){
    return 'KPIs mantêm o contexto geral; a fila e a base usam a etapa, a busca e os limites aplicados.';
  }
  if(hasOperational){
    return 'KPIs mantêm o contexto geral; a fila e a Base de Tratativa usam o filtro operacional.';
  }
  if(hasSearch || hasAdvanced){
    return 'A busca e os limites avançados afetam a Base de Tratativa.';
  }
  return 'Toda a visão está sendo calculada no contexto selecionado.';
}

function updateFilterUI(){
  document.querySelectorAll('.smart-select').forEach(wrapper => {
    const key = wrapper.dataset.key;
    const label = wrapper.dataset.label || key;
    const values = state.filters[key] || [];
    const trigger = wrapper.querySelector('.smart-trigger');
    const value = wrapper.querySelector('.smart-value');

    trigger.classList.toggle('has-value', values.length > 0);
    if(values.length === 1) value.textContent = values[0];
    else if(values.length > 1) value.textContent = `${values.length} selecionados`;
    else value.textContent = 'Todos';

    value.title = values.length ? values.join(', ') : `Todos os itens de ${label}`;
  });

  renderActiveFilters();
  window.syncQuickChips?.();
  window.renderGlobalContextV100?.();
}

function renderActiveFilters(){
  const drawerSummary = $('drawerFilterSummary');
  const entries = activeFilterEntries();
  const count = entries.length;
  const countHost = $('activeFilterCount');
  const openButton = $('btnOpenFilters');

  if(countHost) countHost.textContent = String(count);
  if(openButton){
    openButton.classList.toggle('has-filters', count > 0);
    openButton.setAttribute(
      'aria-label',
      count
        ? `Abrir ${count} filtro${count === 1 ? '' : 's'} ativo${count === 1 ? '' : 's'}`
        : 'Abrir resumo dos filtros'
    );
  }

  if(drawerSummary){
    drawerSummary.innerHTML = count
      ? entries.map(entry => `
          <span>
            <b>${escapeHtml(entry.label)}:</b>
            ${escapeHtml(entry.text)}
          </span>`).join('')
      : 'Nenhum filtro ativo.';
  }
}

function getFilterLabel(key){
  if(key === 'ETAPA') return 'Etapa';
  if(key === 'SLA STATUS') return 'Prazo';
  if(key === 'FAIXA ATRASO') return 'Atraso';
  if(key === 'DONO DA AÇÃO') return 'Dono da ação';
  const definition = state.mainFilters.find(item => item.key === key);
  return definition ? definition.label : key;
}
