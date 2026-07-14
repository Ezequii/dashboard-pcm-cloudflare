
/* Dashboard PCM V100 — consolidação funcional sem dependências externas */
const V100_PENDING_STAGES = ['SEM LANÇAMENTO','SEM PEDIDO','SEM NF'];
const V100_RULES = Object.freeze({
  aging:{attention:8, high:16, critical:30, severe:60},
  targets:{completionPercent:95, maxPcmQueue:40}
});

async function checkForDataUpdates(){
  try{
    const version = await getDataVersion();
    if(!version) return false;
    const changed = Boolean(__STATIC_DATA_VERSION && version !== __STATIC_DATA_VERSION);
    if(changed){
      __STATIC_DATA = null;
      cacheClear();
    }
    return changed;
  }catch(err){
    console.warn('Falha ao verificar atualização:', err);
    return false;
  }
}

function v100FilterSummary(){
  const parts = [];
  for(const def of (state.mainFilters || [])){
    const values = state.filters?.[def.key] || [];
    if(values.length) parts.push(`${def.label}: ${values.join(', ')}`);
  }
  if(state.dateFrom) parts.push(`De: ${state.dateFrom}`);
  if(state.dateTo) parts.push(`Até: ${state.dateTo}`);
  if(state.valueMin !== '') parts.push(`Valor mín.: ${Number(state.valueMin).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`);
  if(state.valueMax !== '') parts.push(`Valor máx.: ${Number(state.valueMax).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`);
  if(state.search) parts.push(`Busca: ${state.search}`);
  return parts;
}

function renderActiveFilterBarV100(){
  const bar = $('activeFilterBar');
  const summary = $('activeFilterSummary');
  if(!bar || !summary) return;
  const parts = v100FilterSummary();
  bar.hidden = !parts.length;
  summary.textContent = parts.join(' · ');
  summary.title = parts.join(' · ');
}

function v100SyncUrl(){
  try{
    const payload = {};
    Object.entries(state.filters || {}).forEach(([key,value])=>{ if(Array.isArray(value) && value.length) payload[key]=value; });
    if(state.dateFrom) payload.dateFrom=state.dateFrom;
    if(state.dateTo) payload.dateTo=state.dateTo;
    if(state.valueMin !== '') payload.valueMin=state.valueMin;
    if(state.valueMax !== '') payload.valueMax=state.valueMax;
    const url = new URL(location.href);
    if(Object.keys(payload).length) url.searchParams.set('f', btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
    else url.searchParams.delete('f');
    history.replaceState(null,'',url);
  }catch(err){}
}

function v100LoadUrlFilters(){
  try{
    const encoded = new URL(location.href).searchParams.get('f');
    if(!encoded) return;
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    Object.entries(payload).forEach(([key,value])=>{
      if(Array.isArray(value)) state.filters[key]=value;
      else if(['dateFrom','dateTo','valueMin','valueMax'].includes(key)) state[key]=value;
    });
  }catch(err){
    console.warn('Filtro compartilhado inválido.', err);
  }
}

function openBaseWithContextV100({etapa='', fornecedor='', solicitante=''}={}){
  clearKpiNavigationState();
  state.filters.ETAPA = etapa ? [etapa] : [];
  if(fornecedor) state.filters.FORNECEDOR = [fornecedor];
  if(solicitante) state.filters.SOLICITANTE = [solicitante];
  state.page = 1;
  updateFilterUI();
  renderActiveFilterBarV100();
  switchTab('base');
}

function openAllPendingV100(){
  clearKpiNavigationState();
  state.filters.ETAPA = [...V100_PENDING_STAGES];
  state.page = 1;
  updateFilterUI();
  switchTab('base');
}

function bindSmartKpiActions(){
  makeKpiActionable('kpiValorAndamentoCard','Abrir todas as RCs em andamento',openAllPendingV100);
  makeKpiActionable('kpiPendenciasCard','Abrir todas as RCs em andamento',openAllPendingV100);
  makeKpiActionable('kpiConcluidoCard','Abrir RCs concluídas',()=>openBaseWithContextV100({etapa:'CONCLUÍDO'}));
  makeKpiActionable('kpiFocoPcmCard','Abrir RCs sem lançamento',()=>openBaseWithContextV100({etapa:'SEM LANÇAMENTO'}));
}

function renderTopPriorities(rows){
  const host = $('topPrioridades');
  if(!host) return;
  const items = (rows || []).slice(0,4);
  if(!items.length){ host.innerHTML='<div class="empty-state">Sem prioridade pendente</div>'; return; }
  host.innerHTML = items.map((x,idx)=>`
    <button type="button" class="priority-row-v33 ${stageClass(x.etapa)}"
      data-etapa="${escapeAttr(x.etapa||'')}"
      data-fornecedor="${escapeAttr(x.fornecedor||'')}"
      data-solicitante="${escapeAttr(x.solicitante||'')}"
      title="Abrir exatamente este contexto">
      <div class="priority-rank">${idx+1}</div>
      <div class="priority-main">
        <strong>${escapeHtml(x.action||x.codigo||'')}</strong>
        <span>${escapeHtml(x.fornecedor||'')}</span>
        <small class="priority-extra-v100">${escapeHtml(x.owner_team||'')}</small>
      </div>
      <div class="priority-meta">
        <b>${escapeHtml(x.valor_fmt||'')}</b>
        <span>${escapeHtml(x.reason||`${Number(x.dias||0).toLocaleString('pt-BR')} dias`)}</span>
      </div>
      <div class="priority-owner">Abrir →</div>
    </button>`).join('');
  host.querySelectorAll('.priority-row-v33').forEach(btn=>{
    btn.onclick=()=>openBaseWithContextV100({
      etapa:btn.dataset.etapa||'',
      fornecedor:btn.dataset.fornecedor||'',
      solicitante:btn.dataset.solicitante||''
    });
  });
}

function renderExecutiveComment(text){
  const el=$('executiveComment');
  if(!el) return;
  const raw=normalizeExecutiveComment(text);
  const kpis = window.__V100_LAST_KPIS || {};
  const stage = window.__V100_LAST_STAGES || new Map();
  const semLanc=Number(stage.get('SEM LANÇAMENTO')?.qtd||0);
  const semPedido=Number(stage.get('SEM PEDIDO')?.qtd||0);
  const semNf=Number(stage.get('SEM NF')?.qtd||0);
  el.innerHTML=`
    <span class="v100-metric"><b>${escapeHtml(kpis.pct_concluido||'0%')}</b><span>concluído</span></span>
    <span class="v100-metric"><b>${semLanc.toLocaleString('pt-BR')}</b><span>no PCM</span></span>
    <span class="v100-metric"><b>${semPedido.toLocaleString('pt-BR')}</b><span>sem pedido</span></span>
    <span class="v100-metric"><b>${semNf.toLocaleString('pt-BR')}</b><span>sem NF</span></span>
    <span class="v100-focus">${escapeHtml(raw)}</span>`;
}

const __v100RenderDashboardOriginal = renderDashboardData;
renderDashboardData = function(data){
  window.__V100_LAST_KPIS = data?.kpis || {};
  window.__V100_LAST_STAGES = new Map((data?.etapas||[]).map(item=>[String(item.etapa||'').toUpperCase(),item]));
  __v100RenderDashboardOriginal(data);
  const k=data?.kpis||{};
  const critical=Number(k.pendencias_criticas||k.rcs_criticas||0);
  const status=$('kFarolStatus');
  const sub=$('kFarolSub');
  const card=$('farolRegional');
  if(status) status.textContent=critical.toLocaleString('pt-BR');
  if(sub) sub.textContent=critical ? 'RCs acima do limite de atenção' : 'Nenhuma pendência crítica';
  card?.querySelector('.kpi-copy span')?.replaceChildren(document.createTextNode('Pendências críticas'));
  renderActiveFilterBarV100();
  v100SyncUrl();
  renderQualityV100();
};

function renderProcess(etapas,hostId=null){
  const selected=new Set(state.filters.ETAPA||[]);
  const markup=(etapas||[]).map(e=>{
    const active=selected.has(e.etapa);
    const maxAge=Number(e.max_dias||e.maior_atraso_dias||e.maximo_dias||0);
    const ageText=e.etapa==='CONCLUÍDO'?'concluído':(maxAge?`máx. ${maxAge} dias`:`${Number(e.criticas||0)} acima do SLA`);
    return `<button type="button" class="process-card ${stageClass(e.etapa)} ${active?'active':''}"
      style="--stage:${e.cor};--stage-soft:${hexToRgba(e.cor,.10)}"
      data-etapa="${escapeAttr(e.etapa)}" aria-pressed="${active?'true':'false'}">
      <div class="process-top"><span class="stage-dot" aria-hidden="true"></span><span class="stage">${escapeHtml(e.etapa)}</span></div>
      <div class="process-main"><strong class="num">${Number(e.qtd||0).toLocaleString('pt-BR')}</strong><span>${escapeHtml(e.valor_formatado||'')}</span></div>
      <div class="process-foot"><span>${escapeHtml(e.percentual_formatado||'')}</span><strong class="${maxAge>V100_RULES.aging.critical?'age-max-v100':''}">${escapeHtml(ageText)}</strong></div>
    </button>`;
  }).join('');
  const hosts=hostId?[$(hostId)].filter(Boolean):Array.from(document.querySelectorAll('.process-cards-host:not(#processCardsBase)'));
  hosts.forEach(host=>{
    host.innerHTML=markup;
    host.querySelectorAll('.process-card').forEach(card=>card.onclick=()=>toggleProcessFilter(card.dataset.etapa));
  });
}

async function renderQualityV100(){
  const score=$('qualityScore'), issues=$('qualityIssues'), updated=$('qualityUpdated');
  if(!score||!issues) return;
  try{
    const db=await loadStaticData();
    const rows=db?.rows||[];
    const count=(fn)=>rows.reduce((n,r)=>n+(fn(r)?1:0),0);
    const missingSupplier=count(r=>!String(r.FORNECEDOR||'').trim());
    const missingDate=count(r=>!String(r['DATA DE RECEBIMENTO']||'').trim());
    const unknownStage=count(r=>!['SEM LANÇAMENTO','SEM PEDIDO','SEM NF','CONCLUÍDO'].includes(String(r.ETAPA||'').toUpperCase()));
    const negative=count(r=>parseCurrencyValue(r['VALOR TOTAL'])<0);
    const total=Math.max(1,rows.length);
    const defects=missingSupplier+missingDate+unknownStage+negative;
    const pct=Math.max(0,100-(defects/total*100));
    score.textContent=`${pct.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
    score.style.color=pct>=98?'var(--v100-success)':pct>=95?'var(--v100-warning)':'var(--v100-danger)';
    const list=[
      [missingSupplier,'sem fornecedor'],
      [missingDate,'sem data de recebimento'],
      [unknownStage,'com etapa não reconhecida'],
      [negative,'com valor negativo']
    ];
    issues.innerHTML=list.map(([n,label])=>`<span class="quality-chip-v100 ${n?'warn':''}">${n.toLocaleString('pt-BR')} ${label}</span>`).join('');
    if(updated && db.generated_at){
      const dt=new Date(db.generated_at);
      updated.textContent=`Base gerada em ${dt.toLocaleString('pt-BR')}`;
    }
  }catch(err){
    score.textContent='Indisponível';
    issues.innerHTML='<span class="quality-chip-v100 warn">Não foi possível validar a base</span>';
  }
}

function exportPdf(){
  const previous=state.activeTab;
  switchTab('visao');
  setTimeout(()=>{
    window.print();
    if(previous!=='visao') switchTab(previous);
  },100);
}

document.addEventListener('DOMContentLoaded',()=>{
  v100LoadUrlFilters();
  $('btnClearContext')?.addEventListener('click',()=>clearAll());
  const oldUpdate=window.updateFilterUI;
  if(typeof oldUpdate==='function'){
    window.updateFilterUI=function(){
      const result=oldUpdate.apply(this,arguments);
      renderActiveFilterBarV100();
      v100SyncUrl();
      return result;
    };
  }
  window.addEventListener('unhandledrejection',event=>{
    const box=$('systemStatus');
    if(!box) return;
    box.hidden=false;
    box.textContent=`Não foi possível concluir uma operação: ${event.reason?.message||'erro inesperado'}. Tente recarregar os dados.`;
  });
});
