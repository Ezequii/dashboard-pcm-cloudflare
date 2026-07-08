function buildSmartFilters(){
  const main = $('mainFilters');
  main.innerHTML = '';
  state.mainFilters.forEach(def => main.appendChild(createSmartSelect(def)));
}

function createSmartSelect(def){
  state.filters[def.key] = state.filters[def.key] || [];
  const wrap = document.createElement('div');
  wrap.className = 'smart-select';
  wrap.dataset.key = def.key;
  wrap.dataset.label = def.label;
  wrap.innerHTML = `
    <button type="button" class="smart-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="smart-title">${escapeHtml(def.label)}</span>
      <strong class="smart-value">Todos</strong>
      <span class="smart-caret">⌄</span>
    </button>
    <div class="option-popover" role="listbox">
      <div class="popover-search"><input class="smart-search" type="search" placeholder="Pesquisar ${escapeAttr(def.label.toLowerCase())}" /></div>
      <div class="option-tools">
        <button type="button" data-action="all">Selecionar exibidos</button>
        <button type="button" data-action="clear">Limpar</button>
      </div>
      <div class="option-list"><div class="option-empty">Carregando...</div></div>
    </div>`;
  const trigger = wrap.querySelector('.smart-trigger');
  const search = wrap.querySelector('.smart-search');
  trigger.addEventListener('click', (ev) => { ev.stopPropagation(); toggleOptions(wrap); });
  search.addEventListener('input', debounce(() => loadOptions(wrap), 220));
  search.addEventListener('click', (ev) => ev.stopPropagation());
  wrap.querySelector('[data-action="all"]').onclick = (ev) => {
    ev.stopPropagation();
    const opts = Array.from(wrap.querySelectorAll('.option-item')).map(x => x.dataset.value).filter(Boolean);
    state.filters[def.key] = Array.from(new Set([...(state.filters[def.key] || []), ...opts]));
    updateFilterUI();
    state.page = 1;
    scheduleDashboard();
    loadOptions(wrap);
  };
  wrap.querySelector('[data-action="clear"]').onclick = (ev) => {
    ev.stopPropagation();
    state.filters[def.key] = [];
    search.value = '';
    updateFilterUI();
    state.page = 1;
    scheduleDashboard();
    loadOptions(wrap);
  };
  return wrap;
}

function toggleOptions(wrap){
  const isOpen = wrap.querySelector('.option-popover').classList.contains('open');
  closeAllPopovers(wrap);
  if(isOpen){
    wrap.querySelector('.option-popover').classList.remove('open');
    wrap.classList.remove('open-select');
    wrap.querySelector('.smart-trigger').setAttribute('aria-expanded', 'false');
    return;
  }
  wrap.querySelector('.option-popover').classList.add('open');
  wrap.classList.add('open-select');
  wrap.querySelector('.smart-trigger').setAttribute('aria-expanded', 'true');
  wrap.querySelector('.smart-search').focus();
  loadOptions(wrap);
}

async function loadOptions(wrap){
  const key = wrap.dataset.key;
  const search = wrap.querySelector('.smart-search');
  const list = wrap.querySelector('.option-list');
  list.innerHTML = '<div class="option-empty">Carregando...</div>';
  try{
    const data = await api('/api/options', {
      filters: state.filters,
      search: '',
      filter_key: key,
      option_search: search.value || '',
      date_from: state.dateFrom || '',
      date_to: state.dateTo || '',
      limit: 100,
    });
    const selected = new Set(state.filters[key] || []);
    const options = (data.options || []).filter(x => String(x || '').trim());
    if(!options.length){ list.innerHTML = '<div class="option-empty">Nenhuma opção encontrada</div>'; return; }
    list.innerHTML = options.map(opt => {
      const checked = selected.has(opt);
      return `<button type="button" class="option-item${checked ? ' selected' : ''}" data-value="${escapeAttr(opt)}" title="${escapeAttr(opt)}">
        <span>${escapeHtml(opt)}</span><i>${checked ? '✓' : ''}</i>
      </button>`;
    }).join('') + `<div class="option-count">Exibindo ${options.length} de ${Number(data.total || options.length).toLocaleString('pt-BR')}</div>`;
    list.querySelectorAll('.option-item').forEach(item => {
      item.onclick = (ev) => {
        ev.stopPropagation();
        const value = item.dataset.value;
        const set = new Set(state.filters[key] || []);
        if(set.has(value)) set.delete(value); else set.add(value);
        state.filters[key] = Array.from(set);
        updateFilterUI();
        state.page = 1;
        scheduleDashboard();
        loadOptions(wrap);
      };
    });
  }catch(err){
    list.innerHTML = `<div class="option-empty">${escapeHtml(err.message)}</div>`;
  }
}

function closeAllPopovers(except=null){
  document.querySelectorAll('.smart-select').forEach(wrap => {
    if(except && wrap === except) return;
    wrap.querySelector('.option-popover')?.classList.remove('open');
    wrap.classList.remove('open-select');
    wrap.querySelector('.smart-trigger')?.setAttribute('aria-expanded', 'false');
  });
}

function updateFilterUI(){
  document.querySelectorAll('.smart-select').forEach(wrap => {
    const key = wrap.dataset.key;
    const label = wrap.dataset.label || key;
    const values = state.filters[key] || [];
    const trigger = wrap.querySelector('.smart-trigger');
    const value = wrap.querySelector('.smart-value');
    trigger.classList.toggle('has-value', values.length > 0);
    value.textContent = values.length ? `${values.length} selecionado${values.length > 1 ? 's' : ''}` : 'Todos';
    value.title = values.length ? values.join(', ') : `Todos os itens de ${label}`;
  });
  renderActiveFilters();
}

function renderActiveFilters(){
  const host = $('activeFilters');
  if(!host) return;
  const active = [];
  for(const [key, values] of Object.entries(state.filters)){
    if(values && values.length){
      const label = getFilterLabel(key);
      const text = values.length === 1 ? values[0] : `${values.length} selecionados`;
      active.push({key, label, text, values});
    }
  }
  if(!active.length){
    host.innerHTML = '';
    host.classList.remove('has-context');
    return;
  }
  host.classList.add('has-context');
  const priority = active.find(x => ['ETAPA','SLA STATUS','FAIXA ATRASO'].includes(x.key)) || active[0];
  let title = priority.text;
  let detail = 'Cards gerais mantidos; fila e base filtradas';
  if(priority.key === 'ETAPA' && priority.values.length === 1){
    detail = `Fila e base: apenas ${priority.text}`;
  }else if(priority.key === 'SLA STATUS'){
    detail = 'Fila e base com itens em atenção';
  }else if(priority.key === 'FAIXA ATRASO'){
    detail = 'Fila e base por tempo parado';
  }else if(active.length > 1){
    detail = `${active.length} filtros ativos`;
  }
  const clearButtons = active.slice(0, 3).map(x => `<button class="active-filter-mini" data-key="${escapeAttr(x.key)}" title="Limpar ${escapeAttr(x.label)}">${escapeHtml(x.label)} ×</button>`).join('');
  host.innerHTML = `
    <div class="filter-context-chip-v35">
      <span>Painel filtrado</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(detail)}</small>
      <div class="filter-mini-actions">${clearButtons}<button class="active-filter-clear" data-clear-all="1">Limpar</button></div>
    </div>`;
  host.querySelectorAll('[data-key]').forEach(btn => {
    btn.onclick = () => {
      state.filters[btn.dataset.key] = [];
      updateFilterUI();
      state.page = 1;
      scheduleDashboard();
    };
  });
  host.querySelector('[data-clear-all]')?.addEventListener('click', () => clearAll());
}

function getFilterLabel(key){
  if(key === 'ETAPA') return 'Situação';
  if(key === 'SLA STATUS') return 'Prazo';
  if(key === 'FAIXA ATRASO') return 'Atraso';
  if(key === 'DONO DA AÇÃO') return 'Dono da ação';
  const def = state.mainFilters.find(x => x.key === key);
  return def ? def.label : key;
}
