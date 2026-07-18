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

  window.syncQuickChips?.();
  window.renderGlobalContextV100?.();
}

