// v34 motion helpers: microinterações funcionais, respeitando preferência do usuário.
const v34ReducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
let v34PrefersReducedMotion = !!v34ReducedMotionQuery.matches;
v34ReducedMotionQuery.addEventListener?.('change', (event) => { v34PrefersReducedMotion = !!event.matches; });

function v34MarkUpdated(el){
  if(!el || v34PrefersReducedMotion) return;
  const target = el.closest('.kpi-card,.executive-comment-v33,.chart-card,.action-card-v33') || el;
  target.classList.remove('text-updated');
  void target.offsetWidth;
  target.classList.add('text-updated');
  window.clearTimeout(target._v34UpdateTimer);
  target._v34UpdateTimer = window.setTimeout(() => target.classList.remove('text-updated'), 620);
}

function normalizedDashboardCacheKey(query){
  const sortedFilters = Object.fromEntries(
    Object.entries(query.filters || {})
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key, values]) => [key, [...(values || [])].map(String).sort()])
  );
  return JSON.stringify({
    version:state.dataVersion || '',
    filters:sortedFilters,
    date_from:query.date_from || '',
    date_to:query.date_to || '',
    value_min:query.value_min,
    value_max:query.value_max
  });
}

async function loadDashboard(seq=null){
  const requestSeq = seq || ++state.dashboardSeq;
  const query = baseQuery();
  const cacheKey = normalizedDashboardCacheKey(query);
  const cached = cacheGet(cacheKey, 120000);
  if(cached){
    if(requestSeq === state.dashboardSeq) renderDashboardData(cached);
    return;
  }
  const data = await api('/api/dashboard', query);
  if(requestSeq !== state.dashboardSeq) return;
  cacheSet(cacheKey, data);
  renderDashboardData(data);
}

function renderDashboardData(data){
  const k = data.kpis || {};
  const total = Number(k.total_rcs || 0).toLocaleString('pt-BR');
  const pend = Number(k.pendentes || 0).toLocaleString('pt-BR');
  const concluidas = Number(k.concluidas || 0).toLocaleString('pt-BR');

  const stageMap = new Map((data.etapas || []).map(item => [String(item.etapa || '').toUpperCase(), item]));
  const semLanc = stageMap.get('SEM LANÇAMENTO') || {};
  const semPedido = stageMap.get('SEM PEDIDO') || {};
  const semNf = stageMap.get('SEM NF') || {};
  const semLancQtd = Number(semLanc.qtd || k.rcs_sem_lancamento || k.rcs_fora_sla || 0);
  const semPedidoQtd = Number(semPedido.qtd || data.farol?.sem_pedido || 0);
  const semNfQtd = Number(semNf.qtd || data.farol?.sem_nf || 0);
  const acompanhamentoValor = Number(semPedido.valor || 0) + Number(semNf.valor || 0);

  setText('kValorPendente', k.valor_pendente_compacto || k.valor_pendente || 'R$ 0', k.valor_pendente || 'R$ 0');
  setText('kValorPendenteSub', `${compactCurrency(Number(semLanc.valor || 0))} PCM · ${compactCurrency(acompanhamentoValor)} acompanhamento`);
  setText('kPendencias', pend);
  setText('kPendenciasSub', `${semLancQtd.toLocaleString('pt-BR')} lançamento · ${semPedidoQtd.toLocaleString('pt-BR')} pedido · ${semNfQtd.toLocaleString('pt-BR')} NF`);
  setText('kPctConcluido', k.pct_concluido || '0%');
  setText('kConcluidoSub', `${concluidas} de ${total} RCs`);
  renderOldestPending(k);
  setText('kValorForaSla', k.valor_sem_lancamento_compacto || k.valor_fora_sla_compacto || k.valor_fora_sla || 'R$ 0', k.valor_sem_lancamento || k.valor_fora_sla || 'R$ 0');
  setText('kValorForaSlaSub', `${semLancQtd.toLocaleString('pt-BR')} RCs · ${semLanc.percentual_formatado || '0%'} da base`);

  renderFarol(data.farol || {}, {pendentes: Number(k.pendentes || 0), semLancamento: semLancQtd});
  bindSmartKpiActions();
  renderExecutiveComment(data.comentario_executivo || 'Resumo executivo indisponível para o filtro atual.');

  // Compatibilidade com ids antigos caso alguma customização local ainda use.
  setText('kTotalRCs', total);
  setText('kValor', k.valor_total_compacto || k.valor_total, k.valor_total);
  setText('kValorTotal', k.valor_total_compacto || k.valor_total, k.valor_total);
  setText('kTicketTempo', k.ticket_tempo_dias || '0 dias', k.ticket_tempo_dias || '0 dias');
  setText('kFornecedores', Number(k.fornecedores || 0).toLocaleString('pt-BR'));
  setText('kTotalSub', `${total} RCs filtradas`);

  renderProcess(data.etapas || []);
  renderProcess(data.etapas || [], 'processCardsBase');
  renderInsights(data.alerts || {});
  renderTopSuppliers(data.charts?.top_fornecedores || []);
  renderTopPriorities(data.top5_prioridades || []);
  renderTopRequesters(data.charts?.custo_solicitante || []);
  deferCharts(data);
  syncQuickChips();
}

function deferCharts(data){
  if(state.activeTab !== 'visao') return;
  const job = () => {
    renderBars('chartFornecedoresPendentes', data.charts?.top_fornecedores_pendentes || data.charts?.top_fornecedores || [], 'green');
  };
  if('requestIdleCallback' in window) requestIdleCallback(job, {timeout: 500});
  else requestAnimationFrame(job);
}

function setText(id, text, title=null){
  const el = $(id);
  if(!el) return;
  const next = String(text ?? '');
  const changed = el.textContent !== next;
  el.textContent = next;
  if(title) el.title = title;
  if(changed) v34MarkUpdated(el);
}

function stageDisplayName(etapa){
  const n = String(etapa || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if(n.includes('SEM LANCAMENTO')) return 'Sem lançamento';
  if(n.includes('SEM PEDIDO')) return 'Sem pedido';
  if(n.includes('SEM NF')) return 'Sem NF';
  if(n.includes('CONCLUIDO')) return 'Concluído';
  return etapa ? 'Outra pendência' : '';
}

function renderOldestPending(k){
  const valueHost = $('kMaiorAtraso');
  const contextHost = $('kMaiorAtrasoSub');
  const card = $('kpiMaisParadoCard');
  if(!valueHost || !contextHost) return;

  const dias = Number(k.maior_atraso_dias || 0);
  const code = String(k.maior_atraso_label || '').trim();
  const codeType = String(k.maior_atraso_label_tipo || 'Referência').trim();
  const etapa = String(k.maior_atraso_etapa || '').trim();
  const stageLabel = stageDisplayName(etapa);
  const stageTone = stageClass(etapa);
  const isEmpty = !dias || !code || code.toLowerCase().includes('sem pend');

  if(card){
    card.classList.remove(
      'oldest-red-v93',
      'oldest-amber-v93',
      'oldest-blue-v93',
      'oldest-gray-v93',
      'oldest-clickable-v93'
    );
    card.removeAttribute('role');
    card.removeAttribute('tabindex');
    card.removeAttribute('aria-label');
    card.onclick = null;
    card.onkeydown = null;
  }

  valueHost.className = 'oldest-value-v96';
  valueHost.innerHTML = `
    <span class="oldest-days-number-v96">${Math.max(0, dias).toLocaleString('pt-BR')}</span>
    <span class="oldest-days-unit-v96">dias</span>`;

  if(isEmpty){
    contextHost.className = 'oldest-context-v96';
    contextHost.innerHTML = '<span class="oldest-empty-v96">Sem pendência</span>';
    contextHost.title = k.maior_atraso_detail || 'Tudo concluído';
    if(card) card.classList.add('oldest-gray-v93');
    return;
  }

  const cardTone = dias > 60
    ? 'oldest-red-v93'
    : dias >= 31
      ? 'oldest-amber-v93'
      : 'oldest-blue-v93';

  const referenceText = [codeType, code].filter(Boolean).join(' ');
  contextHost.className = 'oldest-context-v96';
  contextHost.innerHTML = `
    <span class="oldest-stage-v96 ${stageTone}">
      <i aria-hidden="true"></i>
      <span>${escapeHtml(stageLabel || 'Outra pendência')}</span>
    </span>
    <span class="oldest-separator-v96" aria-hidden="true">·</span>
    <span class="oldest-reference-v96">${escapeHtml(referenceText)}</span>`;

  const fullValue = k.maior_atraso_valor_full || k.maior_atraso_valor || '';
  const details = [
    `${dias.toLocaleString('pt-BR')} dias`,
    stageLabel,
    referenceText,
    k.maior_atraso_fornecedor,
    fullValue
  ].filter(Boolean).join(' · ');
  contextHost.title = details;

  if(card){
    card.classList.add(cardTone, 'oldest-clickable-v93');
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label', `${details}. Clique para localizar na base.`);
    const open = () => {
      if(etapa){
        state.filters.ETAPA = [etapa];
        updateFilterUI();
      }
      state.search = code;
      state.searchScope = 'ALL';
      const search = $('globalSearch');
      const scope = $('searchScope');
      if(search) search.value = code;
      if(scope) scope.value = 'ALL';
      updateSearchUI?.();
      state.page = 1;
      switchTab('base');
    };
    card.onclick = open;
    card.onkeydown = (ev) => {
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        open();
      }
    };
  }
}

function renderFarol(farol, context={}){
  const card = $('farolRegional');
  if(!card) return;
  const status = String(farol.status || 'BOM').toUpperCase();
  card.classList.remove('farol-ok','farol-atencao','farol-critico','farol-revisar','farol-excelente');
  const cls = status.includes('REV') ? 'farol-revisar' : (status.includes('AT') ? 'farol-atencao' : (status.includes('EXC') ? 'farol-excelente' : 'farol-ok'));
  card.classList.add(cls);
  setText('kFarolStatus', status);
  const pendentes = Number(context.pendentes || 0).toLocaleString('pt-BR');
  const semLanc = Number(context.semLancamento || 0).toLocaleString('pt-BR');
  const subtitle = `${pendentes} em andamento · ${semLanc} no PCM`;
  setText('kFarolSub', subtitle, `${farol.label || 'Operação saudável'} · ${farol.detail || ''}`);
}

function clearKpiNavigationState(){
  state.search = '';
  state.searchScope = 'ALL';
  state.page = 1;
  state.filters.ETAPA = [];
  state.filters['SLA STATUS'] = [];
  state.filters['FAIXA ATRASO'] = [];
  state.filters['DONO DA AÇÃO'] = [];
  const search = $('globalSearch');
  const scope = $('searchScope');
  if(search) search.value = '';
  if(scope) scope.value = 'ALL';
  updateSearchUI?.();
}

function openBaseFromKpi(etapas=null){
  clearKpiNavigationState();
  const values = Array.isArray(etapas) ? etapas.filter(Boolean) : (etapas ? [etapas] : []);
  state.filters.ETAPA = values;
  updateFilterUI();
  savePreferences();
  switchTab('base');
}

function makeKpiActionable(id, label, handler){
  const card = $(id);
  if(!card || card.dataset.kpiActionBound === '1') return;
  card.dataset.kpiActionBound = '1';
  card.classList.add('kpi-actionable-v94');
  card.setAttribute('role','button');
  card.setAttribute('tabindex','0');
  card.setAttribute('aria-label', label);
  card.title = label;
  card.addEventListener('click', handler);
  card.addEventListener('keydown', event => {
    if(event.key === 'Enter' || event.key === ' '){
      event.preventDefault();
      handler();
    }
  });
}

function bindSmartKpiActions(){
  const pendingStages = ['SEM LANÇAMENTO','SEM PEDIDO','SEM NF'];
  makeKpiActionable('kpiValorAndamentoCard', 'Abrir somente as RCs em andamento na Base de Tratativa', () => openBaseFromKpi(pendingStages));
  makeKpiActionable('kpiPendenciasCard', 'Abrir somente as RCs em andamento na Base de Tratativa', () => openBaseFromKpi(pendingStages));
  makeKpiActionable('kpiConcluidoCard', 'Abrir as RCs concluídas na Base de Tratativa', () => openBaseFromKpi('CONCLUÍDO'));
  makeKpiActionable('kpiFocoPcmCard', 'Abrir as RCs sem lançamento, foco direto do PCM', () => openBaseFromKpi('SEM LANÇAMENTO'));
}


function renderExecutiveComment(text){
  const el = $('executiveComment');
  if(!el) return;
  el.textContent = normalizeExecutiveComment(text);
}

function normalizeExecutiveComment(text){
  const raw = String(text || '').replace(/^Resumo do dia:\s*/i, '').trim();
  return raw
    .replace(/maior concentração em /i, 'Maior gargalo: ')
    .replace(/, com /i, ' — ')
    .replace(/ parado\. Fornecedor crítico:/i, ' parado. Cobrar:')
    .replace(/\. Prioridade:/i, '. Prioridade:')
    .replace(/ · SEM LANÇAMENTO · /i, ' · ')
    .replace(/ · SEM PEDIDO · /i, ' · ')
    .replace(/ · SEM NF · /i, ' · ')
    .replace(/ · dono /i, ' · Dono: ');
}

function stageReviewText(etapa, qtd){
  const n = Number(qtd || 0).toLocaleString('pt-BR');
  if(!Number(qtd || 0)) return 'na rotina';
  if(etapa === 'SEM LANÇAMENTO') return `${n} para conferir lançamento`;
  if(etapa === 'SEM PEDIDO') return `${n} em acompanhamento`;
  if(etapa === 'SEM NF') return `${n} para conferir NF`;
  return `${n} em tratativa`;
}
function stageTopBadgeText(etapa, qtd){
  // V80: removido para evitar duas contagens diferentes no mesmo card.
  // O número oficial da etapa fica no título e no rodapé do card.
  return '';
}

function renderProcess(etapas, hostId=null){
  const selected = new Set(state.filters.ETAPA || []);
  const markup = etapas.map(e => {
    const active = selected.has(e.etapa);
    const cls = stageClass(e.etapa);
    const stageQty = Number(e.qtd || 0);
    const crit = Number(e.criticas || 0);
    const prazoTexto = e.etapa === 'CONCLUÍDO' ? 'concluído' : stageReviewText(e.etapa, stageQty);
    return `
    <button type="button" class="process-card ${cls} ${active ? 'active' : ''}" style="--stage:${e.cor};--stage-soft:${hexToRgba(e.cor, .10)}" data-etapa="${escapeAttr(e.etapa)}" aria-pressed="${active ? 'true' : 'false'}" title="Clique para filtrar: ${escapeAttr(e.etapa)} | Valor: ${escapeAttr(e.valor_completo || e.valor_formatado || '')}">
      <div class="process-top">
        <span class="stage-dot" aria-hidden="true"></span>
        <span class="stage">${escapeHtml(e.etapa)}</span>
      </div>
      <div class="process-main">
        <strong class="num">${Number(e.qtd).toLocaleString('pt-BR')}</strong>
        <span>${escapeHtml(e.valor_formatado || '')}</span>
      </div>
      <div class="process-foot">
        <span>${escapeHtml(e.percentual_formatado)}</span>
        <strong>${escapeHtml(prazoTexto)}</strong>
      </div>
      ${stageTopBadgeText(e.etapa, crit) ? `<div class="stage-critical-badge">${stageTopBadgeText(e.etapa, crit)}</div>` : ''}
    </button>`;
  }).join('');
  const hosts = hostId ? [$(hostId)].filter(Boolean) : Array.from(document.querySelectorAll('.process-cards-host:not(#processCardsBase)'));
  hosts.forEach(host => {
    host.innerHTML = markup;
    host.querySelectorAll('.process-card').forEach(card => {
      card.onclick = () => toggleProcessFilter(card.dataset.etapa);
    });
  });
}

function toggleProcessFilter(etapa){
  const current = state.filters.ETAPA || [];
  state.filters.ETAPA = current.includes(etapa) ? [] : [etapa];
  state.page = 1;
  updateFilterUI();
  refreshAll(false).catch(error => console.error('Falha ao aplicar filtro de etapa:', error));
}

function filterContextAndOpenBase({etapa='', fornecedor='', owner='' } = {}){
  clearKpiNavigationState();
  if(etapa) state.filters.ETAPA = [etapa];
  if(fornecedor) state.filters.FORNECEDOR = [fornecedor];
  if(owner) state.filters['DONO DA AÇÃO'] = [owner];
  state.page = 1;
  updateFilterUI();
  savePreferences();
  switchTab('base');
}

function filterStageAndOpenBase(etapa){
  filterContextAndOpenBase({etapa});
}

function toneColor(name){
  const n = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if(n.includes('sem-lancamento') || n.includes('sem lancamento')) return '#D32F2F';
  if(n.includes('sem-pedido') || n.includes('sem pedido')) return '#F2A900';
  if(n.includes('sem-nf') || n.includes('sem nf')) return '#00629E';
  return '#23A067';
}


function hasUsefulAction(x){
  const kind = String(x?.kind || '');
  const main = String(x?.main || '');
  const value = String(x?.value || '');
  const text = `${main} ${value}`.toLowerCase();
  if(kind === 'old') return !text.includes('0 dias') && !main.toLowerCase().includes('sem pend');
  if(text.includes('sem pendência')) return false;
  if(text.includes('0 rc')) return false;
  if(value.trim() === 'R$ 0,00') return false;
  return true;
}

function shortOwnerLabel(label){
  const raw = String(label || '').trim();
  const n = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if(n.includes('fornecedor')) return 'Depende do fornecedor';
  if(n.includes('compras') || n.includes('coupa')) return 'Depende de compras';
  if(n.includes('pcm')) return 'Depende do PCM';
  if(n.includes('responsavel')) return 'Depende da etapa';
  return raw.length > 22 ? `${raw.slice(0, 22)}…` : raw;
}



function validValueRanking(items){
  return (items || []).filter(item => {
    const label = String(item?.label || '').trim();
    const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return label && normalized !== 'NAO INFORMADO' && Number(item?.value || 0) > 0;
  });
}

function filterDimensionAndOpenBase(column, value){
  const label = String(value || '').trim();
  if(!label) return;
  clearKpiNavigationState();
  state.filters[column] = [label];
  state.page = 1;
  updateFilterUI();
  savePreferences();
  switchTab('base');
}

function renderRankingRows(host, items, dimension){
  const rows = validValueRanking(items).slice(0, 3);
  if(!rows.length){
    host.innerHTML = `<div class="empty-state">Sem ${dimension === 'FORNECEDOR' ? 'fornecedores' : 'solicitantes'} para o filtro atual</div>`;
    return;
  }
  const maxValue = Math.max(...rows.map(item => Number(item.value || 0)), 1);
  host.innerHTML = rows.map((item, index) => {
    const value = Number(item.value || 0);
    const width = Math.max(8, Math.min(100, value / maxValue * 100));
    const qtd = Number(item.qtd || 0);
    return `
      <button type="button" class="ranking-row-v88" data-ranking-value="${escapeAttr(item.label || '')}" title="Filtrar ${dimension === 'FORNECEDOR' ? 'fornecedor' : 'solicitante'}: ${escapeAttr(item.label || '')} · ${escapeAttr(item.full || item.formatted || '')}">
        <span class="ranking-position-v88">${index + 1}</span>
        <span class="ranking-content-v88">
          <strong>${escapeHtml(item.display_label || item.label || '')}</strong>
          <small>${qtd.toLocaleString('pt-BR')} RC${qtd !== 1 ? 's' : ''}</small>
          <span class="ranking-track-v88"><i style="--ranking-width:${width.toFixed(2)}%"></i></span>
        </span>
        <em>${escapeHtml(item.formatted || compactCurrency(value))}</em>
      </button>`;
  }).join('');
  host.querySelectorAll('.ranking-row-v88').forEach(button => {
    button.onclick = () => filterDimensionAndOpenBase(dimension, button.dataset.rankingValue || '');
  });
}

function renderTopSuppliers(items){
  const host = $('actionNowList');
  if(!host) return;
  renderRankingRows(host, items, 'FORNECEDOR');
}

function renderTopRequesters(items){
  const host = $('ownersCriticos');
  if(!host) return;
  renderRankingRows(host, items, 'SOLICITANTE');
}

function renderActionNow(actions){
  const host = $('actionNowList');
  if(!host) return;
  const useful = (actions || []).filter(hasUsefulAction);
  const rows = useful.length ? useful.slice(0, 4) : (actions || []).slice(0, 2);
  if(!rows.length){
    host.innerHTML = '<div class="empty-state">Sem ação pendente no filtro atual</div>';
    return;
  }
  host.innerHTML = rows.map(x => `
    <button type="button" class="action-card-v33 ${escapeAttr(x.kind || '')}" data-etapa="${escapeAttr(x.etapa || '')}" title="Abrir base filtrada: ${escapeAttr(x.detail || x.title || '')}">
      <span>${escapeHtml(x.title || '')}</span>
      <strong>${escapeHtml(x.main || '')}</strong>
      <em>${escapeHtml(x.value || '')}</em>
      <small title="${escapeAttr(x.owner || x.detail || '')}">${escapeHtml(shortOwnerLabel(x.owner || x.detail || ''))}</small>
    </button>`).join('');
  host.querySelectorAll('.action-card-v33').forEach(btn => {
    btn.onclick = () => filterStageAndOpenBase(btn.dataset.etapa || '');
  });
}

function renderTopPriorities(rows){
  const host = $('topPrioridades');
  if(!host) return;
  const items = (rows || []).slice(0, 4);
  if(!items.length){ host.innerHTML = '<div class="empty-state">Sem prioridade pendente</div>'; return; }
  host.innerHTML = items.map((x, idx) => `
    <button
      type="button"
      class="priority-row-v33 ${stageClass(x.etapa)}"
      data-etapa="${escapeAttr(x.etapa || '')}"
      data-fornecedor="${escapeAttr(x.fornecedor_filter || x.fornecedor || '')}"
      data-owner="${escapeAttr(x.owner_filter || '')}"
      title="Abrir ${escapeAttr(x.etapa || 'pendência')} de ${escapeAttr(x.fornecedor_filter || x.fornecedor || '')} · ${escapeAttr(x.valor_full || x.valor_fmt || '')}">
      <div class="priority-rank">${idx + 1}</div>
      <div class="priority-main"><strong>${escapeHtml(x.action || x.codigo || '')}</strong><span>${escapeHtml(x.fornecedor || '')}</span></div>
      <div class="priority-meta"><b>${escapeHtml(x.valor_fmt || '')}</b><span>${escapeHtml(x.reason || `${Number(x.dias || 0).toLocaleString('pt-BR')} dias`)}</span></div>
      <div class="priority-owner" title="${escapeAttr(x.owner_team || '')}">${escapeHtml(shortOwnerLabel(x.owner_team || ''))}</div>
    </button>`).join('');
  host.querySelectorAll('.priority-row-v33').forEach(button => {
    button.onclick = () => filterContextAndOpenBase({
      etapa:button.dataset.etapa || '',
      fornecedor:button.dataset.fornecedor || '',
      owner:button.dataset.owner || ''
    });
  });
}

function renderOwners(items){
  const host = $('ownersCriticos');
  if(!host) return;
  const rows = (items || []).slice(0, 4);
  if(!rows.length){ host.innerHTML = '<span class="empty-mini">Sem responsáveis críticos</span>'; return; }
  host.innerHTML = rows.map(x => `
    <div class="owner-row-v33" title="${escapeAttr(x.full || x.formatted || '')}">
      <span>${escapeHtml(shortOwnerLabel(x.label || ''))}</span>
      <strong>${escapeHtml(x.formatted || String(x.value || 0))}</strong>
    </div>`).join('');
}

function renderInsights(alerts){
  const attention = $('attentionList');
  const aging = $('agingList');
  if(attention){
    const items = alerts?.atencao || [];
    attention.innerHTML = items.length ? items.map(x => `
      <div class="attention-item" style="--tone:${toneColor(x.tone || x.label)}" title="${escapeAttr(x.full || x.detail || '')}">
        <span>${escapeHtml(x.label)}</span>
        <strong>${escapeHtml(x.value || '0')}</strong>
        <small>${escapeHtml(x.detail || '')}</small>
      </div>`).join('') : '<div class="empty-state">Sem pendências no filtro atual</div>';
  }
  if(aging){
    const rows = alerts?.idade_pendencias || [];
    aging.innerHTML = rows.length ? rows.map(x => `
      <div class="aging-row" style="--tone:${toneColor(x.tone || x.label)}" title="Mais antiga: ${escapeAttr(x.maximo || '')}">
        <div class="aging-stage">${escapeHtml(x.label)}</div>
        <div class="aging-metric"><span>Média</span><strong>${escapeHtml(x.media || '0 dias')}</strong></div>
        <div class="aging-metric"><span>Mais antiga</span><strong>${escapeHtml(x.maximo || '0 dias')}</strong></div>
      </div>`).join('') : '<div class="empty-state">Sem idade de pendência</div>';
  }
}

function renderBars(id, items, tone){
  const el = $(id);
  if(!el) return;
  const rows = (items || []).slice(0, 6);
  if(!rows.length){ el.innerHTML = '<div class="empty-state">Sem dados para o filtro atual</div>'; return; }
  const max = Math.max(...rows.map(x => Number(x.value)||0), 1);
  el.innerHTML = rows.map((x, idx) => {
    const w = Math.max(3, (Number(x.value)||0) / max * 100);
    const detail = x.meta || (x.qtd ? `${Number(x.qtd).toLocaleString('pt-BR')} RCs` : '');
    return `<div class="bar-row ${tone}" title="${escapeAttr(`${x.label} - ${x.full || x.formatted || x.value}`)}">
      <div class="bar-rank">${idx + 1}</div>
      <div class="bar-label-group"><div class="bar-label" title="${escapeAttr(x.label)}">${escapeHtml(x.label)}</div>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</div>
      <div class="bar-track"><div class="bar-fill" style="--bar-w:${(w/100).toFixed(4)}"></div></div>
      <div class="bar-value">${escapeHtml(x.formatted || String(x.value))}</div>
    </div>`;
  }).join('');
}

function compactCurrency(value){
  const val = Number(value) || 0;
  const abs = Math.abs(val);
  if(abs >= 1000000) return `R$ ${(val/1000000).toFixed(1).replace('.', ',')} mi`;
  if(abs >= 1000) return `R$ ${(val/1000).toFixed(0).replace('.', ',')} mil`;
  return val.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

/* ==========================================================================
   V98 — clareza executiva e operação orientada à ação
   ========================================================================== */
(() => {
  "use strict";

  const originalRenderDashboardDataV98 = window.renderDashboardData;
  let currentDashboardV98 = null;
  let prioritySortV98 = "priority";
  const rankingModeV98 = { supplier: "pending", requester: "pending" };

  const getStageV98 = (data, stage) =>
    (data?.etapas || []).find((item) => String(item.etapa || "").toUpperCase() === stage) || {};

  const numberV98 = (value) => Number(value || 0);
  const intV98 = (value) => numberV98(value).toLocaleString("pt-BR");
  const pctV98 = (value) => `${numberV98(value).toFixed(1).replace(".", ",")}%`;

  function contextLabelV98(){
    const labels = Object.entries(state.filters || {})
      .filter(([, values]) => Array.isArray(values) && values.length)
      .map(([key, values]) => {
        const definition = (state.mainFilters || []).find((item) => item.key === key);
        const label = definition?.label || key;
        return `${label}: ${values.length === 1 ? values[0] : `${values.length} selecionados`}`;
      });

    return labels.length ? `Visão filtrada · ${labels.slice(0, 2).join(" · ")}${labels.length > 2 ? " · +" + (labels.length - 2) : ""}` : "Visão geral";
  }

  function summarySnapshotV98(data){
    const k = data?.kpis || {};
    const semLanc = getStageV98(data, "SEM LANÇAMENTO");
    const pendValue = (data?.etapas || [])
      .filter((item) => String(item.etapa || "").toUpperCase() !== "CONCLUÍDO")
      .reduce((sum, item) => sum + numberV98(item.valor), 0);
    const total = numberV98(k.total_rcs);
    const completed = numberV98(k.concluidas);

    return {
      version: String(state.dataVersion || state.generatedAt || "sem-versao"),
      context: JSON.stringify(
        Object.fromEntries(
          Object.entries(state.filters || {})
            .filter(([key]) => !["ETAPA", "SLA STATUS", "FAIXA ATRASO"].includes(key))
            .sort(([a], [b]) => a.localeCompare(b))
        )
      ),
      pendingValue: pendValue,
      pending: numberV98(k.pendentes),
      completion: total ? completed / total * 100 : 0,
      pcm: numberV98(semLanc.qtd || k.rcs_sem_lancamento),
      critical: numberV98(k.critical_pending),
      oldest: numberV98(k.maior_atraso_dias)
    };
  }

  function getPreviousSnapshotV98(snapshot){
    const storageKey = "pcm_v98_dashboard_snapshots";
    let store = {};

    try {
      store = JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (_) {
      store = {};
    }

    const contextKey = snapshot.context || "{}";
    const record = store[contextKey] || {};
    let previous = record.previous || null;

    if (!record.current) {
      store[contextKey] = { current: snapshot, previous: null };
    } else if (record.current.version !== snapshot.version) {
      previous = record.current;
      store[contextKey] = { current: snapshot, previous: record.current };
    } else {
      store[contextKey] = { current: snapshot, previous: record.previous || null };
      previous = record.previous || null;
    }

    const keys = Object.keys(store);
    if (keys.length > 12) {
      keys.slice(0, keys.length - 12).forEach((key) => delete store[key]);
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
    } catch (_) {
      // O dashboard continua funcionando quando o armazenamento está bloqueado.
    }

    return previous;
  }

  function updateTrendV98(id, current, previous, options = {}){
    const element = $(id);
    if (!element) return;

    element.classList.remove("is-good", "is-bad", "is-neutral");
    if (!previous || !Number.isFinite(numberV98(previous))) {
      element.classList.add("is-neutral");
      element.textContent = options.fallback || "Comparação após a próxima atualização";
      return;
    }

    const delta = numberV98(current) - numberV98(previous);
    const absolute = Math.abs(delta);
    const threshold = numberV98(options.threshold || 0.001);

    if (absolute < threshold) {
      element.classList.add("is-neutral");
      element.textContent = "Sem mudança desde a atualização anterior";
      return;
    }

    const improvement = options.higherIsBetter ? delta > 0 : delta < 0;
    element.classList.add(improvement ? "is-good" : "is-bad");

    let formatted;
    if (options.kind === "currency") formatted = compactCurrency(absolute);
    else if (options.kind === "percent") formatted = `${absolute.toFixed(1).replace(".", ",")} p.p.`;
    else formatted = intV98(absolute);

    element.textContent = `${delta > 0 ? "↑" : "↓"} ${formatted} desde a atualização anterior`;
  }

  function renderTrendsV98(data){
    const snapshot = summarySnapshotV98(data);
    const previous = getPreviousSnapshotV98(snapshot);
    updateTrendV98("trendValorPendente", snapshot.pendingValue, previous?.pendingValue, {kind:"currency"});
    updateTrendV98("trendPendencias", snapshot.pending, previous?.pending);
    updateTrendV98("trendConcluido", snapshot.completion, previous?.completion, {
      kind:"percent",
      higherIsBetter:true,
      fallback:`Meta: ${numberV98(window.BUSINESS_RULES?.targets?.completionPercent || 95)}%`
    });
    updateTrendV98("trendPcmQueue", snapshot.pcm, previous?.pcm, {
      fallback:`Limite operacional: ${numberV98(window.BUSINESS_RULES?.targets?.maxPcmQueue || 40)} RCs`
    });
    updateTrendV98("trendCritical", snapshot.critical, previous?.critical, {
      fallback:`Critério: acima de ${numberV98(window.BUSINESS_RULES?.aging?.critical || 30)} dias`
    });
    updateTrendV98("trendOldest", snapshot.oldest, previous?.oldest, {
      fallback:snapshot.oldest ? "Maior idade entre as pendências" : "Sem pendência aberta"
    });
  }

  function renderCompletionProgressV98(data){
    const k = data?.kpis || {};
    const total = numberV98(k.total_rcs);
    const completed = numberV98(k.concluidas);
    const completion = total ? completed / total * 100 : 0;
    const target = numberV98(window.BUSINESS_RULES?.targets?.completionPercent || 95);
    const progress = $("completionProgressV98");
    const marker = $("completionTargetV98");

    if (progress) progress.style.width = `${Math.max(0, Math.min(100, completion))}%`;
    if (marker) {
      marker.style.left = `${Math.max(0, Math.min(100, target))}%`;
      marker.title = `Meta de conclusão: ${target}%`;
    }
  }

  function renderCriticalKpiV98(data){
    const k = data?.kpis || {};
    const threshold = numberV98(k.critical_threshold_days || window.BUSINESS_RULES?.aging?.critical || 30);
    const critical = numberV98(k.critical_pending);
    const value = numberV98(k.critical_pending_value);
    const card = $("farolRegional");

    setText("kFarolStatus", intV98(critical));
    setText(
      "kFarolSub",
      `${critical === 1 ? "RC" : "RCs"} acima de ${threshold} dias · ${compactCurrency(value)}`,
      `${critical.toLocaleString("pt-BR")} ${critical === 1 ? "RC" : "RCs"} acima de ${threshold} dias · ${brMoney(value)}`
    );

    if (!card) return;
    card.classList.toggle("has-critical-v98", critical > 0);
    card.classList.toggle("is-clear-v98", critical === 0);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${critical} pendências acima de ${threshold} dias. Abrir na base.`);

    const open = () => {
      state.filters["FAIXA ATRASO"] = ["30+ dias"];
      state.page = 1;
      updateFilterUI();
      switchTab("base");
    };

    card.onclick = open;
    card.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    };
  }

  function renderExecutiveSummaryV98(data){
    const k = data?.kpis || {};
    const semLanc = getStageV98(data, "SEM LANÇAMENTO");
    const semPedido = getStageV98(data, "SEM PEDIDO");
    const semNf = getStageV98(data, "SEM NF");
    const total = numberV98(k.total_rcs);
    const completed = numberV98(k.concluidas);
    const completion = numberV98(k.pct_concluido_valor || (total ? completed / total * 100 : 0));

    setText("quickCompletion", pctV98(completion));
    setText("quickPcm", intV98(semLanc.qtd));
    setText("quickOrder", intV98(semPedido.qtd));
    setText("quickNf", intV98(semNf.qtd));
    setText("summaryContextV98", contextLabelV98());

    document.querySelectorAll("[data-summary-filter]").forEach((button) => {
      button.onclick = () => filterContextAndOpenBase({ etapa: button.dataset.summaryFilter || "" });
    });

    const focus = (data?.top5_prioridades || [])[0];
    const focusButton = $("firstFocusV98");
    if (!focus) {
      setText("focusSupplierV98", "Nenhuma pendência prioritária");
      setText("focusMetaV98", "A fila do contexto atual está concluída");
      setText("focusActionV98", "Sem ação");
      if (focusButton) {
        focusButton.disabled = true;
        focusButton.onclick = null;
      }
      return;
    }

    setText("focusSupplierV98", focus.fornecedor || "Fornecedor não informado");
    setText(
      "focusMetaV98",
      `${focus.action || "Tratar pendência"} · ${focus.qtd_fmt || `${intV98(focus.qtd)} RCs`} · ${focus.valor_fmt || compactCurrency(focus.valor)} · máximo ${intV98(focus.dias)} dias`
    );
    setText("focusActionV98", focus.action || "Abrir");

    if (focusButton) {
      focusButton.disabled = false;
      focusButton.onclick = () => filterContextAndOpenBase({
        etapa: focus.etapa || "",
        fornecedor: focus.fornecedor_filter || focus.fornecedor || "",
        owner: focus.owner_filter || ""
      });
    }
  }

  window.renderProcess = function renderProcessV98(etapas, hostId = null){
    const selected = new Set(state.filters.ETAPA || []);
    const markup = (etapas || []).map((stage) => {
      const active = selected.has(stage.etapa);
      const cls = stageClass(stage.etapa);
      const quantity = numberV98(stage.qtd);
      const outOfSla = numberV98(stage.fora_sla);
      const maxDays = numberV98(stage.max_dias);
      const isCompleted = String(stage.etapa || "").toUpperCase() === "CONCLUÍDO";
      const footer = isCompleted
        ? `${escapeHtml(stage.percentual_formatado || "0%")} da base · fluxo concluído`
        : `${escapeHtml(stage.percentual_formatado || "0%")} da base · máximo ${intV98(maxDays)} dias`;
      const slaLabel = !isCompleted && outOfSla > 0
        ? `<span class="process-sla-v98">${intV98(outOfSla)} fora do prazo</span>`
        : `<span class="process-sla-v98 is-clear">Dentro do acompanhamento</span>`;

      return `
        <button
          type="button"
          class="process-card process-card-v98 ${cls} ${active ? "active" : ""}"
          style="--stage:${stage.cor};--stage-soft:${hexToRgba(stage.cor, .10)}"
          data-etapa="${escapeAttr(stage.etapa)}"
          aria-pressed="${active ? "true" : "false"}"
          title="Abrir ${escapeAttr(stage.etapa)} · ${escapeAttr(stage.valor_completo || stage.valor_formatado || "")}">
          <div class="process-top">
            <span class="stage-dot" aria-hidden="true"></span>
            <span class="stage">${escapeHtml(stage.etapa)}</span>
          </div>
          <div class="process-main process-main-v98">
            <strong class="num">${intV98(quantity)}</strong>
            <span title="${escapeAttr(stage.valor_completo || "")}">${escapeHtml(stage.valor_formatado || compactCurrency(stage.valor))}</span>
          </div>
          <div class="process-foot process-foot-v98"><span>${footer}</span></div>
          ${slaLabel}
        </button>`;
    }).join("");

    const hosts = hostId
      ? [$(hostId)].filter(Boolean)
      : Array.from(document.querySelectorAll(".process-cards-host:not(#processCardsBase)"));

    hosts.forEach((host) => {
      host.innerHTML = markup || '<div class="empty-state">Nenhuma etapa disponível</div>';
      host.querySelectorAll(".process-card").forEach((card) => {
        card.onclick = () => toggleProcessFilter(card.dataset.etapa);
      });
    });
  };

  function sortedPrioritiesV98(){
    const rows = [...(currentDashboardV98?.top5_prioridades || [])];
    const sorters = {
      priority: (a, b) => numberV98(b.score) - numberV98(a.score),
      age: (a, b) => numberV98(b.dias) - numberV98(a.dias),
      value: (a, b) => numberV98(b.valor) - numberV98(a.valor),
      quantity: (a, b) => numberV98(b.qtd) - numberV98(a.qtd)
    };
    return rows.sort(sorters[prioritySortV98] || sorters.priority).slice(0, 4);
  }

  function bindPrioritySortV98(){
    document.querySelectorAll("[data-priority-sort]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.prioritySort === prioritySortV98);
      button.onclick = () => {
        prioritySortV98 = button.dataset.prioritySort || "priority";
        bindPrioritySortV98();
        window.renderTopPriorities(currentDashboardV98?.top5_prioridades || []);
      };
    });
  }

  window.renderTopPriorities = function renderTopPrioritiesV98(rows){
    const host = $("topPrioridades");
    if (!host) return;
    if (Array.isArray(rows) && currentDashboardV98) currentDashboardV98.top5_prioridades = rows;

    const items = sortedPrioritiesV98();
    bindPrioritySortV98();

    if (!items.length) {
      host.innerHTML = '<div class="empty-state">Sem prioridade pendente</div>';
      return;
    }

    host.innerHTML = items.map((item, index) => `
      <button
        type="button"
        class="priority-row-v33 priority-row-v98 ${stageClass(item.etapa)}"
        data-etapa="${escapeAttr(item.etapa || "")}"
        data-fornecedor="${escapeAttr(item.fornecedor_filter || item.fornecedor || "")}"
        data-owner="${escapeAttr(item.owner_filter || "")}"
        title="Abrir ${escapeAttr(item.etapa || "pendência")} de ${escapeAttr(item.fornecedor_filter || item.fornecedor || "")}">
        <span class="priority-rank">${index + 1}</span>
        <span class="priority-main priority-main-v98">
          <small>${escapeHtml(item.action || item.codigo || "Tratar pendência")}</small>
          <strong>${escapeHtml(item.fornecedor || "Fornecedor não informado")}</strong>
          <span>${intV98(item.qtd)} RC${numberV98(item.qtd) !== 1 ? "s" : ""} · ${escapeHtml(item.valor_fmt || compactCurrency(item.valor))} · máximo ${intV98(item.dias)} dias</span>
        </span>
        <span class="priority-owner-v98">
          <small>Depende de</small>
          <strong>${escapeHtml(shortOwnerLabel(item.owner_team || "Responsável"))}</strong>
        </span>
        <span class="priority-open-v98">Abrir <i aria-hidden="true">→</i></span>
      </button>`).join("");

    host.querySelectorAll(".priority-row-v98").forEach((button) => {
      button.onclick = () => filterContextAndOpenBase({
        etapa: button.dataset.etapa || "",
        fornecedor: button.dataset.fornecedor || "",
        owner: button.dataset.owner || ""
      });
    });
  };

  function rankingItemsV98(kind){
    const charts = currentDashboardV98?.charts || {};
    const pending = rankingModeV98[kind] === "pending";

    if (kind === "supplier") {
      return pending ? (charts.top_fornecedores_pendentes || []) : (charts.top_fornecedores || []);
    }
    return pending ? (charts.solicitantes_pendentes || []) : (charts.custo_solicitante || []);
  }

  function renderRankingKindV98(kind){
    const isSupplier = kind === "supplier";
    const host = $(isSupplier ? "actionNowList" : "ownersCriticos");
    if (!host) return;

    renderRankingRows(host, rankingItemsV98(kind), isSupplier ? "FORNECEDOR" : "SOLICITANTE");
    setText(
      isSupplier ? "supplierRankingSubtitleV98" : "requesterRankingSubtitleV98",
      rankingModeV98[kind] === "pending" ? "Maior valor pendente" : "Maior valor movimentado"
    );
  }

  function bindRankingModesV98(){
    document.querySelectorAll("[data-ranking-kind][data-ranking-mode]").forEach((button) => {
      const kind = button.dataset.rankingKind;
      const mode = button.dataset.rankingMode;
      button.classList.toggle("is-active", rankingModeV98[kind] === mode);
      button.onclick = () => {
        rankingModeV98[kind] = mode;
        bindRankingModesV98();
        renderRankingKindV98(kind);
      };
    });
  }

  window.renderTopSuppliers = function renderTopSuppliersV98(){
    renderRankingKindV98("supplier");
  };

  window.renderTopRequesters = function renderTopRequestersV98(){
    renderRankingKindV98("requester");
  };

  window.renderFarol = function renderFarolV98(){
    renderCriticalKpiV98(currentDashboardV98 || {});
  };

  window.renderDashboardData = function renderDashboardDataV98(data){
    currentDashboardV98 = data || {};
    originalRenderDashboardDataV98(data);
    renderExecutiveSummaryV98(data);
    renderCompletionProgressV98(data);
    renderCriticalKpiV98(data);
    renderTrendsV98(data);
    bindPrioritySortV98();
    bindRankingModesV98();
  };
})();
