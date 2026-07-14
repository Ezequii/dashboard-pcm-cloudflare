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

async function loadDashboard(seq=null){
  const requestSeq = seq || ++state.dashboardSeq;
  const query = dashboardQuery();
  const cacheKey = `${state.dataVersion || __STATIC_DATA_VERSION || 'sem-versao'}:${JSON.stringify(query)}`;
  const cached = cacheGet(cacheKey, BUSINESS_RULES.refresh.dashboardCacheMs);
  if(cached){
    renderDashboardData(cached);
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
  setText('kMaiorAtraso', `${Number(k.maior_atraso_dias || 0).toLocaleString('pt-BR')} dias`);
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
  const host = $('kMaiorAtrasoSub');
  const card = $('kpiMaisParadoCard');
  if(!host) return;

  const dias = Number(k.maior_atraso_dias || 0);
  const code = String(k.maior_atraso_label || '').trim();
  const codeType = String(k.maior_atraso_label_tipo || 'Referência').trim();
  const etapa = String(k.maior_atraso_etapa || '').trim();
  const stageLabel = stageDisplayName(etapa);
  const tone = stageClass(etapa);
  const isEmpty = !dias || !code || code.toLowerCase().includes('sem pend');

  if(card){
    card.classList.remove('oldest-red-v93','oldest-amber-v93','oldest-blue-v93','oldest-gray-v93','oldest-clickable-v93');
    card.removeAttribute('role');
    card.removeAttribute('tabindex');
    card.onclick = null;
    card.onkeydown = null;
  }

  if(isEmpty){
    host.className = '';
    host.textContent = 'Sem pendência';
    host.title = k.maior_atraso_detail || 'Tudo concluído';
    return;
  }

  const cardTone = tone === 'stage-red' ? 'oldest-red-v93' : tone === 'stage-amber' ? 'oldest-amber-v93' : tone === 'stage-blue' ? 'oldest-blue-v93' : 'oldest-gray-v93';
  host.className = 'oldest-context-v95';
  host.innerHTML = `
    <span class="oldest-mini-panel-v96">
      <span class="oldest-stage-chip-v95 ${tone}"><i></i><span>${escapeHtml(stageLabel || 'Outra pendência')}</span></span>
      <span class="oldest-ref-pill-v96"><span>${escapeHtml(codeType)}</span><b>${escapeHtml(code)}</b></span>
    </span>`;

  const fullValue = k.maior_atraso_valor_full || k.maior_atraso_valor || '';
  const details = [
    `${dias.toLocaleString('pt-BR')} dias`,
    stageLabel,
    `${codeType} ${code}`,
    k.maior_atraso_fornecedor,
    fullValue
  ].filter(Boolean).join(' · ');
  host.title = details;

  if(card){
    card.classList.add(cardTone, 'oldest-clickable-v93');
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label', `${details}. Clique para localizar na base.`);
    const open = () => {
      state.filters['DONO DA AÇÃO'] = [];
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
      if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); open(); }
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
  const search = $('globalSearch');
  const scope = $('searchScope');
  if(search) search.value = '';
  if(scope) scope.value = 'ALL';
  updateSearchUI?.();
}

function openBaseFromKpi(etapa=null){
  clearKpiNavigationState();
  state.filters.ETAPA = Array.isArray(etapa) ? etapa : (etapa ? [etapa] : []);
  state.filters['DONO DA AÇÃO'] = [];
  updateFilterUI();
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
  makeKpiActionable('kpiValorAndamentoCard', 'Abrir todas as RCs em andamento na Base de Tratativa', () => openBaseFromKpi(PENDING_STAGES));
  makeKpiActionable('kpiPendenciasCard', 'Abrir todas as RCs em andamento na Base de Tratativa', () => openBaseFromKpi(PENDING_STAGES));
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
  refreshAll(false);
}

function filterStageAndOpenBase(etapa){
  clearKpiNavigationState();
  if(etapa){
    state.filters.ETAPA = [etapa];
    state.filters['DONO DA AÇÃO'] = [];
    state.page = 1;
    updateFilterUI();
  }
  switchTab('base');
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
  state.filters['DONO DA AÇÃO'] = [];
  state.filters[column] = [label];
  state.page = 1;
  updateFilterUI();
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
          <strong>${escapeHtml(item.label_display || item.label || '')}</strong>
          <span class="ranking-track-v88"><i style="--ranking-width:${width.toFixed(2)}%"></i></span>
        </span>
        <span class="ranking-meta-v96">
          <em>${escapeHtml(item.formatted || compactCurrency(value))}</em>
          <small>${qtd.toLocaleString('pt-BR')} RC${qtd !== 1 ? 's' : ''}</small>
        </span>
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
    <button type="button" class="priority-row-v33 ${stageClass(x.etapa)}" data-etapa="${escapeAttr(x.etapa || '')}" data-fornecedor="${escapeAttr(x.fornecedor || '')}" data-owner="${escapeAttr(x.owner_team || '')}" title="${escapeAttr(x.fornecedor || '')} · ${escapeAttr(x.valor_full || x.valor_fmt || '')}">
      <div class="priority-rank">${idx + 1}</div>
      <div class="priority-main"><strong>${escapeHtml(x.action || x.codigo || '')}</strong><span>${escapeHtml(x.fornecedor_exibicao || x.fornecedor || '')}</span></div>
      <div class="priority-meta"><b>${escapeHtml(x.valor_fmt || '')}</b><span>${escapeHtml(x.qtd_fmt || '')} · máx. ${Number(x.dias || 0).toLocaleString('pt-BR')} dias</span></div>
      <div class="priority-owner" title="${escapeAttr(x.owner_team || '')}">${escapeHtml(shortOwnerLabel(x.owner_team || ''))}</div>
    </button>`).join('');
  host.querySelectorAll('.priority-row-v33').forEach(btn => {
    btn.onclick = () => {
      clearKpiNavigationState();
      state.filters.ETAPA = btn.dataset.etapa ? [btn.dataset.etapa] : [];
      state.filters.FORNECEDOR = btn.dataset.fornecedor ? [btn.dataset.fornecedor] : [];
      state.filters['DONO DA AÇÃO'] = btn.dataset.owner ? [btn.dataset.owner] : [];
      state.page = 1;
      updateFilterUI();
      switchTab('base');
    };
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
