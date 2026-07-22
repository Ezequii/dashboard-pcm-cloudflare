
(() => {
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const icons={
    overview:'<svg viewBox="0 0 24 24"><path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z"/></svg>',
    track:'<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    analytics:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>',
    import:'<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M4 19h16"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8 7.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.4 18l.3 2.6h4L15 18a7 7 0 0 0 1.6-1.1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 0-1z"/></svg>'
  };
  const shell=document.createElement('div'); shell.className='ws-shell';
  shell.innerHTML=`<aside class="ws-sidebar">
    <div class="ws-brand"><img src="/static/logo_amaggi.png" alt="AMAGGI"><span>PCM</span></div>
    <nav class="ws-nav" aria-label="Menu principal">
      <button class="is-active" data-ws-view="overview">${icons.overview}<span>Visão Geral</span></button>
      <button data-ws-view="tracking">${icons.track}<span>Acompanhamento</span></button>
      <button data-ws-view="analytics">${icons.analytics}<span>Análises</span></button>
      <button data-ws-view="imports">${icons.import}<span>Importações</span></button>
      <button data-ws-view="settings">${icons.settings}<span>Configurações</span></button>
    </nav>
    <div class="ws-sidebar-foot"><div class="ws-avatar">P</div><div class="ws-user"><strong>PCM</strong><small>Workspace operacional</small></div></div>
  </aside>
  <header class="ws-top"><div class="ws-breadcrumb">PCM / <strong id="wsCrumb">Visão Geral</strong></div><div class="ws-top-actions">
    <button class="ws-search-trigger" id="wsSearchOpen"><span>⌕ &nbsp; Pesquisar requisição, ORC, pedido...</span><kbd>⌘ K</kbd></button>
    <button class="ws-icon-btn" id="wsTheme" title="Alternar tema" aria-label="Alternar tema"><svg viewBox="0 0 24 24"><path d="M20 15.5A8 8 0 1 1 8.5 4 6.5 6.5 0 0 0 20 15.5z"/></svg></button>
  </div></header>`;
  document.body.prepend(shell);
  document.body.classList.add('ws-v200');
  const main=q('#mainContent');
  if(!main) return;
  const legacy=[...main.children];
  const overview=document.createElement('div'); overview.className='ws-view is-active'; overview.dataset.wsPanel='overview';
  overview.innerHTML=`<div class="ws-page-head"><div><h1>Visão Geral</h1><p>O que merece atenção na operação do PCM.</p></div><div class="ws-page-head-actions"><button class="ws-btn" id="wsRefresh">Atualizar dados</button></div></div>
  <div class="ws-notice-grid"><div class="ws-stat"><small>Em andamento</small><strong id="wsOpen">—</strong><em>registros ativos</em></div><div class="ws-stat"><small>Precisam de atenção</small><strong id="wsAttention">—</strong><em>priorize exceções</em></div><div class="ws-stat"><small>ORCs / OSs</small><strong id="wsOrcs">—</strong><em>em acompanhamento</em></div><div class="ws-stat"><small>Base carregada</small><strong id="wsBase">—</strong><em>registros disponíveis</em></div></div>
  <div class="ws-attention"><h2>O que precisa da sua atenção</h2><button data-jump="tracking"><span>Registros em andamento para tratar</span><span>Ver acompanhamento →</span></button><button data-jump="tracking"><span>Consultar solicitações, ORCs e pedidos</span><span>Pesquisar →</span></button></div>`;
  const tracking=document.createElement('div'); tracking.className='ws-view'; tracking.dataset.wsPanel='tracking';
  tracking.innerHTML=`<div class="ws-page-head"><div><h1>Acompanhamento</h1><p>Encontre, consulte e trate solicitações sem perder o contexto.</p></div></div><div class="ws-command"><label class="ws-command-search"><span>⌕</span><input id="wsTrackSearch" placeholder="Buscar requisição, ORC, pedido, fornecedor, solicitante..."><span>⌘ K</span></label><div class="ws-quick"><button class="ws-chip is-active">Todas</button><button class="ws-chip">Em andamento</button><button class="ws-chip">Atenção</button><button class="ws-chip">Concluídas</button></div></div>`;
  const legacyWrap=document.createElement('div'); legacyWrap.id='wsLegacyOperational';
  legacy.forEach(el=>legacyWrap.appendChild(el)); tracking.appendChild(legacyWrap);
  const analytics=document.createElement('div'); analytics.className='ws-view'; analytics.dataset.wsPanel='analytics'; analytics.innerHTML=`<div class="ws-page-head"><div><h1>Análises</h1><p>Entenda gargalos e tempo de fluxo sem transformar a operação em um painel de BI.</p></div></div><div class="ws-placeholder"><h2>Onde o fluxo está travando?</h2><p>A fundação desta área está pronta. Na próxima evolução, os indicadores existentes serão reorganizados por perguntas operacionais, sempre com acesso aos registros que originam cada análise.</p></div>`;
  const imports=document.createElement('div'); imports.className='ws-view'; imports.dataset.wsPanel='imports'; imports.innerHTML=`<div class="ws-page-head"><div><h1>Importações</h1><p>Valide alterações antes de incorporá-las à base operacional.</p></div></div><div class="ws-placeholder"><h2>Importação segura e explicável</h2><p>O pipeline XLSX existente foi preservado. Esta área será a interface de validação: novos registros, alterações, inconsistências e confirmação antes da aplicação.</p></div>`;
  const settings=document.createElement('div'); settings.className='ws-view'; settings.dataset.wsPanel='settings'; settings.innerHTML=`<div class="ws-page-head"><div><h1>Configurações</h1><p>Preferências do workspace e parâmetros administrativos.</p></div></div><div class="ws-placeholder"><h2>Configurações sem complexidade desnecessária</h2><p>Permissões e segurança existentes continuam preservadas. Configurações operacionais serão adicionadas aqui apenas quando houver necessidade real.</p></div>`;
  main.append(overview,tracking,analytics,imports,settings);
  const modal=document.createElement('div'); modal.className='ws-modal'; modal.id='wsModal'; modal.innerHTML=`<div class="ws-palette"><input id="wsPaletteInput" placeholder="Pesquisar requisição, ORC, pedido, fornecedor..."><p>Digite para pesquisar. A busca usa a base operacional já existente.</p></div>`; document.body.append(modal);
  const names={overview:'Visão Geral',tracking:'Acompanhamento',analytics:'Análises',imports:'Importações',settings:'Configurações'};
  function show(v){qa('.ws-view').forEach(x=>x.classList.toggle('is-active',x.dataset.wsPanel===v));qa('.ws-nav button').forEach(x=>x.classList.toggle('is-active',x.dataset.wsView===v));q('#wsCrumb').textContent=names[v]; if(v==='tracking') setTimeout(()=>q('#wsTrackSearch')?.focus(),50)}
  qa('[data-ws-view]').forEach(b=>b.onclick=()=>show(b.dataset.wsView)); qa('[data-jump]').forEach(b=>b.onclick=()=>show(b.dataset.jump));
  q('#wsTheme').onclick=()=>{const d=document.documentElement; const dark=d.dataset.wsTheme==='dark'; d.dataset.wsTheme=dark?'light':'dark'; localStorage.setItem('pcm-ws-theme',d.dataset.wsTheme)};
  document.documentElement.dataset.wsTheme=localStorage.getItem('pcm-ws-theme')||'light';
  const open=()=>{modal.classList.add('is-open');setTimeout(()=>q('#wsPaletteInput').focus(),0)}; const close=()=>modal.classList.remove('is-open');
  q('#wsSearchOpen').onclick=open; modal.onclick=e=>{if(e.target===modal)close()}; document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}if(e.key==='Escape')close()});
  const syncSearch=(value)=>{const candidates=['#searchInput','#baseSearch','#tableSearch','input[type="search"]']; for(const s of candidates){const el=q(s);if(el){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true}}return false};
  q('#wsTrackSearch').addEventListener('input',e=>syncSearch(e.target.value)); q('#wsPaletteInput').addEventListener('keydown',e=>{if(e.key==='Enter'){show('tracking');syncSearch(e.target.value);q('#wsTrackSearch').value=e.target.value;close()}});
  q('#wsRefresh').onclick=()=>q('#btnRefresh')?.click();
  function hydrate(){const txt=(id)=>q(id)?.textContent?.trim(); const rows=qa('tbody tr').filter(r=>r.offsetParent!==null).length; q('#wsBase').textContent=rows||'—'; q('#wsOpen').textContent=txt('#kPendencias')||'—';q('#wsOrcs').textContent=txt('#kPendencias')||'—';q('#wsAttention').textContent=txt('#kAtrasados')||txt('#kCriticos')||'—'}
  setTimeout(hydrate,1200); setInterval(hydrate,5000);
})();
