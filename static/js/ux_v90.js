
(function(){
  'use strict';

  const byId = id => document.getElementById(id);

  function updateSearchState(){
    const input = byId('globalSearch');
    const clear = byId('btnClearSearch');
    if(!input || !clear) return;
    const hasValue = Boolean(input.value.trim());
    clear.hidden = !hasValue;
    clear.setAttribute('aria-label', hasValue ? 'Limpar pesquisa atual' : 'Nenhuma pesquisa para limpar');
  }

  function bindKeyboardShortcuts(){
    document.addEventListener('keydown', event => {
      const tag = (event.target && event.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable;

      if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'){
        event.preventDefault();
        if(typeof switchTab === 'function' && !document.body.classList.contains('active-tab-base')) switchTab('base');
        setTimeout(() => {
          const input = byId('globalSearch');
          input?.focus();
          input?.select();
        }, 40);
        return;
      }

      if(event.key === 'Escape'){
        if(typeof closeExportMenu === 'function') closeExportMenu();
        if(typeof closeFilterDrawer === 'function') closeFilterDrawer();
        const input = byId('globalSearch');
        if(document.activeElement === input && input?.value){
          input.value = '';
          input.dispatchEvent(new Event('input', {bubbles:true}));
        }
      }

      if(!typing && event.key === '/'){
        event.preventDefault();
        if(typeof switchTab === 'function' && !document.body.classList.contains('active-tab-base')) switchTab('base');
        setTimeout(() => byId('globalSearch')?.focus(), 40);
      }
    });
  }

  function improveButtons(){
    const refresh = byId('btnRefresh');
    if(refresh){
      refresh.title = 'Recarregar os dados';
      refresh.addEventListener('click', () => {
        const original = refresh.textContent;
        refresh.dataset.originalText = original;
        refresh.textContent = 'Atualizando…';
        const observer = new MutationObserver(() => {
          if(!document.body.classList.contains('loading')){
            refresh.textContent = refresh.dataset.originalText || 'Recarregar';
            observer.disconnect();
          }
        });
        observer.observe(document.body,{attributes:true,attributeFilter:['class']});
      });
    }

    const table = byId('dataTable');
    if(table){
      table.setAttribute('aria-label','Base detalhada de requisições');
      table.setAttribute('role','grid');
    }
  }

  function bindSearchUX(){
    const input = byId('globalSearch');
    if(!input) return;
    input.setAttribute('aria-describedby','searchHelp');
    input.addEventListener('input', updateSearchState);
    input.addEventListener('search', updateSearchState);
    updateSearchState();
  }

  function boot(){
    bindKeyboardShortcuts();
    bindSearchUX();
    improveButtons();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
