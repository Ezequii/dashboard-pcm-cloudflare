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
  setText('kConcluidoSub', `${concluidas} de ${total} ORCs/OSs`);
  renderOldestPending(k);
  setText('kValorForaSla', k.valor_sem_lancamento_compacto || k.valor_fora_sla_compacto || k.valor_fora_sla || 'R$ 0', k.valor_sem_lancamento || k.valor_fora_sla || 'R$ 0');
  setText('kValorForaSlaSub', `${semLancQtd.toLocaleString('pt-BR')} ORCs/OSs · ${semLanc.percentual_formatado || '0%'} da base`);

  bindSmartKpiActions();

  // Compatibilidade com ids antigos caso alguma customização local ainda use.
  setText('kTotalRCs', total);
  setText('kValor', k.valor_total_compacto || k.valor_total, k.valor_total);
  setText('kValorTotal', k.valor_total_compacto || k.valor_total, k.valor_total);
  setText('kTicketTempo', k.ticket_tempo_dias || '0 dias', k.ticket_tempo_dias || '0 dias');
  setText('kFornecedores', Number(k.fornecedores || 0).toLocaleString('pt-BR'));
  setText('kTotalSub', `${total} registros filtrados`);

  window.renderExecutiveV991?.(data);
  window.renderBaseV991?.(data);
  syncQuickChips();
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

function resetOperationalContextForExactCaseV994a5(){
  Object.keys(state.filters || {}).forEach(key => {
    state.filters[key] = [];
  });
  state.search = '';
  state.multiSearchTerms = [];
  state.multiSearchMode = 'ANY';
  state.dateFrom = '';
  state.dateTo = '';
  state.valueMin = '';
  state.valueMax = '';
  state.page = 1;
}

function renderOldestPending(k){
  const valueHost = $('kMaiorAtraso');
  const contextHost = $('kMaiorAtrasoSub');
  const card = $('kpiMaisParadoCard');
  if(!valueHost || !contextHost) return;

  const days = Math.max(
    0,
    Number(k.maior_atraso_dias || 0)
  );
  const stage = String(
    k.maior_atraso_etapa || ''
  ).trim();
  const supplier = String(
    k.maior_atraso_fornecedor || ''
  ).trim();
  const orc = String(
    k.maior_atraso_orc || ''
  ).trim();
  const serviceOrder = String(
    k.maior_atraso_os || ''
  ).trim();
  const fallbackCode = String(
    k.maior_atraso_label || ''
  ).trim();
  const fallbackType = String(
    k.maior_atraso_label_tipo || 'Referência'
  ).trim();
  const searchValue = String(
    k.maior_atraso_search_value
    || orc
    || serviceOrder
    || fallbackCode
    || ''
  ).trim();
  const searchScope = String(
    k.maior_atraso_search_scope
    || 'DOCUMENTO'
  ).trim().toUpperCase();
  const stageLabel = stageDisplayName(stage);
  const stageTone = stageClass(stage);
  const references = [
    orc ? `ORC ${orc}` : '',
    serviceOrder ? `OS ${serviceOrder}` : ''
  ].filter(Boolean);
  const referenceText = references.length
    ? references.join(' · ')
    : [fallbackType, fallbackCode].filter(Boolean).join(' ');
  const isEmpty = !days
    || !searchValue
    || fallbackCode.toLowerCase().includes('sem pend');

  if(card){
    card.classList.remove(
      'oldest-red-v93',
      'oldest-amber-v93',
      'oldest-blue-v93',
      'oldest-gray-v93',
      'oldest-clickable-v93',
      'oldest-exact-v994a5'
    );
    card.removeAttribute('aria-label');
    card.onclick = null;
    card.onkeydown = null;
  }

  valueHost.className = 'oldest-value-v96';
  valueHost.innerHTML = `
    <span class="oldest-days-number-v96">${days.toLocaleString('pt-BR')}</span>
    <span class="oldest-days-unit-v96">dias</span>`;

  if(isEmpty){
    contextHost.className = 'oldest-context-v96';
    contextHost.innerHTML = `
      <span class="oldest-empty-v96">
        Sem ORC ou OS identificada
      </span>`;
    contextHost.title = k.maior_atraso_detail
      || 'Não foi possível localizar uma referência operacional.';
    if(card) card.classList.add('oldest-gray-v93');
    return;
  }

  const cardTone = days > 60
    ? 'oldest-red-v93'
    : days >= 31
      ? 'oldest-amber-v93'
      : 'oldest-blue-v93';

  contextHost.className = 'oldest-context-v96 oldest-context-v994a5';
  contextHost.innerHTML = `
    <span class="oldest-stage-v96 ${stageTone}">
      <i aria-hidden="true"></i>
      <span>${escapeHtml(stageLabel || 'Outra pendência')}</span>
    </span>
    <span class="oldest-reference-list-v994a5">
      ${references.length
        ? references.map(reference => `
            <b class="oldest-reference-chip-v994a5">
              ${escapeHtml(reference)}
            </b>`).join('')
        : `
          <b class="oldest-reference-chip-v994a5">
            ${escapeHtml(referenceText)}
          </b>`}
    </span>
    <span class="oldest-open-v994a5">
      Abrir caso <b aria-hidden="true">→</b>
    </span>`;

  const fullValue = k.maior_atraso_valor_full
    || k.maior_atraso_valor
    || '';
  const details = [
    `${days.toLocaleString('pt-BR')} dias`,
    stageLabel,
    referenceText,
    supplier,
    fullValue
  ].filter(Boolean).join(' · ');
  contextHost.title = details;

  if(card){
    card.classList.add(
      cardTone,
      'oldest-clickable-v93',
      'oldest-exact-v994a5'
    );
    card.setAttribute(
      'aria-label',
      `${details}. Abrir exatamente este caso na Base de Tratativa.`
    );

    const open = () => {
      resetOperationalContextForExactCaseV994a5();

      if(stage) state.filters.ETAPA = [stage];
      if(supplier) state.filters.FORNECEDOR = [supplier];
      window.setOperationalViewContextV114?.(
        'PENDENCIA_MAIS_ANTIGA',
        'Pendência mais antiga',
        state.filters
      );

      state.search = searchValue;
      state.searchScope = searchScope;

      const search = $('globalSearch');
      const scope = $('searchScope');
      if(search) search.value = searchValue;
      if(scope) scope.value = searchScope;

      updateFilterUI?.();
      updateSearchUI?.();
      hydrateAdvancedSearch?.();
      savePreferences?.();
      switchTab('base');
    };

    card.onclick = open;
    card.onkeydown = event => {
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        open();
      }
    };
  }
}

function clearKpiNavigationState(){
  state.search = '';
  state.searchScope = 'ALL';
  state.page = 1;
  state.filters.ETAPA = [];
  state.filters['SLA STATUS'] = [];
  state.filters['FAIXA ATRASO'] = [];
  state.filters['DONO DA AÇÃO'] = [];
  window.invalidateOperationalViewContextV114?.();
  const search = $('globalSearch');
  const scope = $('searchScope');
  if(search) search.value = '';
  if(scope) scope.value = 'ALL';
  updateSearchUI?.();
}

function openBaseFromKpi(etapas=null, viewContext=null){
  clearKpiNavigationState();
  const values = Array.isArray(etapas) ? etapas.filter(Boolean) : (etapas ? [etapas] : []);
  state.filters.ETAPA = values;

  const fallbackContext = values.length === 1
    ? window.stageViewContextV114?.(values[0])
    : values.length
      ? {id:'EM_ANDAMENTO', label:'Em andamento'}
      : {id:'TODAS', label:'Geral'};
  const resolvedContext = viewContext || fallbackContext || {id:'PERSONALIZADA', label:'Personalizada'};
  window.setOperationalViewContextV114?.(
    resolvedContext.id,
    resolvedContext.label,
    state.filters
  );

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
  makeKpiActionable(
    'kpiValorAndamentoCard',
    'Abrir somente as ORCs e OSs em andamento na Base de Tratativa',
    () => openBaseFromKpi(
      pendingStages,
      {id:'VALOR_ANDAMENTO', label:'Valor em andamento'}
    )
  );
  makeKpiActionable(
    'kpiPendenciasCard',
    'Abrir somente as ORCs e OSs em andamento na Base de Tratativa',
    () => openBaseFromKpi(
      pendingStages,
      {id:'ORCS_OSS_ANDAMENTO', label:'ORÇs/OSs em andamento'}
    )
  );
  makeKpiActionable(
    'kpiConcluidoCard',
    'Abrir as ORCs e OSs concluídas na Base de Tratativa',
    () => openBaseFromKpi(
      'CONCLUÍDO',
      {id:'PROCESSO_CONCLUIDO', label:'Processo concluído'}
    )
  );
  makeKpiActionable(
    'kpiFocoPcmCard',
    'Abrir as ORCs e OSs sem lançamento, foco direto do PCM',
    () => openBaseFromKpi(
      'SEM LANÇAMENTO',
      {id:'PRIMEIRO_FOCO', label:'Primeiro foco recomendado'}
    )
  );
}


function toggleProcessFilter(etapa){
  const current = state.filters.ETAPA || [];
  const removing = current.includes(etapa);
  state.filters.ETAPA = removing ? [] : [etapa];

  const viewContext = removing
    ? {id:'TODAS', label:'Geral'}
    : window.stageViewContextV114?.(etapa);
  window.setOperationalViewContextV114?.(
    viewContext?.id || 'PERSONALIZADA',
    viewContext?.label || 'Personalizada',
    state.filters
  );

  state.page = 1;
  updateFilterUI();
  refreshAll(false).catch(error => console.error('Falha ao aplicar filtro de etapa:', error));
}

function filterContextAndOpenBase({etapa='', fornecedor='', owner='' } = {}){
  clearKpiNavigationState();
  if(etapa) state.filters.ETAPA = [etapa];
  if(fornecedor) state.filters.FORNECEDOR = [fornecedor];
  if(owner) state.filters['DONO DA AÇÃO'] = [owner];

  const viewContext = etapa
    ? window.stageViewContextV114?.(etapa)
    : {id:'TODAS', label:'Geral'};
  window.setOperationalViewContextV114?.(
    viewContext?.id || 'TODAS',
    viewContext?.label || 'Geral',
    state.filters
  );

  state.page = 1;
  updateFilterUI();
  savePreferences();
  switchTab('base');
}




function filterDimensionAndOpenBase(column, value, scope="all"){
  const label = String(value || '').trim();
  if(!label) return;

  clearKpiNavigationState();
  state.filters[column] = [label];

  if(scope === "pending"){
    state.filters.ETAPA = [
      "SEM LANÇAMENTO",
      "SEM PEDIDO",
      "SEM NF"
    ];
    window.setOperationalViewContextV114?.(
      'EM_ANDAMENTO',
      'Em andamento',
      state.filters
    );
  }else{
    state.filters.ETAPA = [];
    window.setOperationalViewContextV114?.(
      'TODAS',
      'Geral',
      state.filters
    );
  }

  state.page = 1;
  updateFilterUI();
  savePreferences();
  switchTab('base');
}

function compactCurrency(value){
  const val = Number(value) || 0;
  const abs = Math.abs(val);
  if(abs >= 1000000) return `R$ ${(val/1000000).toFixed(1).replace('.', ',')} mi`;
  if(abs >= 1000) return `R$ ${(val/1000).toFixed(0).replace('.', ',')} mil`;
  return val.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

/* ==========================================================================
   V99.2 — renderização fiel ao mockup com polimento
   ========================================================================== */
(() => {
  "use strict";

  let rankingScopeV994a6 = "all";
  let latestExecutiveDataV994a6 = null;

  const numberV991 = (value) => Number(value || 0);
  const intV991 = (value) => numberV991(value).toLocaleString("pt-BR");

  const stageIconsV991 = {
    "SEM LANÇAMENTO": `
      <svg viewBox="0 0 24 24"><path d="m4 19 3.8-.8L19 7l-3-3L4.8 15.2zM13.8 6.2l3 3"/></svg>`,
    "SEM PEDIDO": `
      <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6H17a2 2 0 0 0 2-1.6L20.5 8H7M10 20h.01M17 20h.01"/></svg>`,
    "SEM NF": `
      <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/></svg>`,
    "CONCLUÍDO": `
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>`
  };

  function openCriticalV991(){
    clearKpiNavigationState();
    state.filters["FAIXA ATRASO"] = ["30+ dias"];
    window.setOperationalViewContextV114?.(
      'ATRASO_30_MAIS',
      'Pendências com 30+ dias',
      state.filters
    );
    updateFilterUI();
    savePreferences();
    switchTab("base");
  }

  function renderCompletionV991(data){
    const kpis = data?.kpis || {};
    const total = numberV991(kpis.total_rcs);
    const completed = numberV991(kpis.concluidas);
    const percent = Math.max(
      0,
      Math.min(
        100,
        numberV991(
          kpis.pct_concluido_valor ||
          (total ? completed / total * 100 : 0)
        )
      )
    );
    const progress = document.getElementById("completionProgressV991");
    if(progress) progress.value = percent;
  }

  function renderFocusV991(data){
    const focus = (data?.top5_prioridades || [])[0];
    const button = document.getElementById("firstFocusV991");

    if(!button) return;

    if(!focus){
      setText("focusSupplierV991", "Nenhuma prioridade pendente");
      setText("focusActionV991", "O contexto atual não possui itens para tratar");
      setText("focusMetaV991", "—");
      button.disabled = true;
      button.onclick = null;
      return;
    }

    const quantity = numberV991(focus.qtd);
    setText("focusSupplierV991", focus.fornecedor || "Fornecedor não informado");
    const focusSupplierNode = document.getElementById("focusSupplierV991");
    if(focusSupplierNode){
      focusSupplierNode.title = focus.fornecedor || "Fornecedor não informado";
    }
    setText("focusActionV991", focus.action || "Tratar pendência");
    setText(
      "focusMetaV991",
      `${intV991(quantity)} ${quantity === 1 ? "ORC/OS" : "ORCs/OSs"} · ` +
      `${focus.valor_fmt || compactCurrency(focus.valor)} · ` +
      `${intV991(focus.dias)} dias`
    );

    button.disabled = false;
    button.onclick = () => filterContextAndOpenBase({
      etapa: focus.etapa || "",
      fornecedor: focus.fornecedor_filter || focus.fornecedor || "",
      owner: focus.owner_filter || ""
    });
  }

  function renderCriticalV991(data){
    const kpis = data?.kpis || {};
    const count = numberV991(kpis.critical_pending || kpis.rcs_criticas);
    setText("kFarolStatus", intV991(count));
    setText(
      "kFarolSub",
      kpis.critical_pending_value_compacto
        ? `${kpis.critical_pending_value_compacto} em valor`
        : "Acima de 30 dias"
    );

    const card = document.getElementById("farolRegional");
    if(card) card.onclick = openCriticalV991;
  }

  const FLOW_STAGE_ORDER_V994A2 = Object.freeze([
    "SEM LANÇAMENTO",
    "SEM PEDIDO",
    "SEM NF",
    "CONCLUÍDO"
  ]);

  function normalizeFlowStageV994a2(value){
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function buildFlowStagesV994a2(data){
    const sourceStages = Array.isArray(data?.etapas) ? data.etapas : [];
    const sourceByStage = new Map(
      sourceStages.map(stage => [
        normalizeFlowStageV994a2(stage.etapa),
        stage
      ])
    );

    return FLOW_STAGE_ORDER_V994A2.map(stageName => {
      const source = sourceByStage.get(
        normalizeFlowStageV994a2(stageName)
      );
      return {
        etapa:stageName,
        qtd:0,
        valor:0,
        valor_formatado:"R$ 0",
        percentual:0,
        max_dias:0,
        idade_media:0,
        fora_sla:0,
        criticas:0,
        ...(source || {}),
        etapa:stageName,
        canonical_stage:stageName
      };
    });
  }

  window.buildFlowStagesV994a2 = buildFlowStagesV994a2;

  function renderFlowV991(data){
    const host = document.getElementById("processCards");
    if(!host) return;

    const stages = buildFlowStagesV994a2(data);
    const selected = new Set(
      (state.filters.ETAPA || []).map(normalizeFlowStageV994a2)
    );

    const totalRecords = Math.max(
      1,
      stages.reduce((sum, stage) => sum + numberV991(stage.qtd), 0)
    );

    host.innerHTML = stages.map((stage, index) => {
      const displayName = stage.canonical_stage || FLOW_STAGE_ORDER_V994A2[index];
      const iconKey = String(displayName || "").toUpperCase();
      const name = normalizeFlowStageV994a2(displayName);
      const completed = name === "CONCLUIDO";
      const quantity = numberV991(stage.qtd);
      const outside = numberV991(stage.fora_sla);
      const maxDays = completed ? 0 : numberV991(stage.max_dias);
      const averageDays = completed ? 0 : numberV991(stage.idade_media);
      const percentage = Number.isFinite(Number(stage.percentual))
        ? numberV991(stage.percentual)
        : quantity / totalRecords * 100;
      const active = selected.has(name);

      const status = completed
        ? "Fluxo concluído"
        : outside > 0
          ? `${intV991(outside)} fora do prazo`
          : quantity > 0
            ? "Dentro do prazo"
            : "Sem registros";

      const statusClass = outside > 0 && !completed
        ? "is-alert"
        : completed
          ? "is-complete"
          : "";

      const stageLabel = stage.etapa || displayName;
      const aria = [
        stageLabel,
        `${intV991(quantity)} requisições`,
        stage.valor_formatado || compactCurrency(stage.valor),
        `${percentage.toFixed(1).replace(".", ",")}% da base`,
        completed ? "etapa concluída" : `máximo de ${intV991(maxDays)} dias`,
        status
      ].join(". ");

      return `
        <button
          type="button"
          class="flow-step-v991 flow-step-v994a2 ${stageClass(stageLabel)} ${active ? "is-active" : ""}"
          data-etapa="${escapeAttr(stageLabel)}"
          aria-pressed="${active ? "true" : "false"}"
          aria-label="${escapeAttr(aria)}">
          <span class="flow-sequence-v994a2" aria-hidden="true">${index + 1}</span>
          <span class="flow-icon-v991" aria-hidden="true">
            ${stageIconsV991[iconKey] || stageIconsV991[name] || stageIconsV991["SEM NF"]}
          </span>
          <small>${escapeHtml(stageLabel)}</small>
          <span class="flow-main-metrics-v994a2">
            <strong>${intV991(quantity)}</strong>
            <em>${escapeHtml(stage.valor_formatado || compactCurrency(stage.valor))}</em>
          </span>
          <span class="flow-context-v994a2">
            <b>${percentage.toFixed(1).replace(".", ",")}% da base</b>
            <b>${completed ? "Concluído" : `${intV991(maxDays)} dias máx.`}</b>
          </span>
          <span class="flow-average-v994a2">
            ${completed ? "Processo finalizado" : `Média: ${averageDays.toFixed(1).replace(".", ",")} dias`}
          </span>
          <mark class="${statusClass}">${status}</mark>
          <span class="flow-open-v994a2">Abrir na base <b aria-hidden="true">→</b></span>
        </button>`;
    }).join("");

    host.querySelectorAll(".flow-step-v994a2").forEach((button) => {
      button.onclick = () => toggleProcessFilter(button.dataset.etapa || "");
    });
  }

  function renderPrioritiesV991(data){
    const host = document.getElementById("topPrioridades");
    if(!host) return;

    const items = (data?.top5_prioridades || []).slice(0, 3);

    if(!items.length){
      host.innerHTML = '<div class="empty-state">Sem prioridades pendentes</div>';
      return;
    }

    host.innerHTML = items.map((item, index) => {
      const quantity = numberV991(item.qtd);
      return `
        <button
          type="button"
          class="priority-row-v991"
          data-etapa="${escapeAttr(item.etapa || "")}"
          data-fornecedor="${escapeAttr(item.fornecedor_filter || item.fornecedor || "")}"
          data-owner="${escapeAttr(item.owner_filter || "")}">
          <span class="priority-rank-v991">${index + 1}</span>
          <span class="priority-main-v991">
            <strong title="${escapeAttr(item.fornecedor || "Fornecedor não informado")}">${escapeHtml(item.fornecedor || "Fornecedor não informado")}</strong>
            <small>${escapeHtml(item.action || "Tratar pendência")}</small>
          </span>
          <span class="priority-data-v991">
            ${intV991(quantity)} ${quantity === 1 ? "ORC/OS" : "ORCs/OSs"}
            <b>·</b>
            ${escapeHtml(item.valor_fmt || compactCurrency(item.valor))}
            <b>·</b>
            ${intV991(item.dias)} dias
          </span>
          <span class="priority-arrow-v991" aria-hidden="true">→</span>
        </button>`;
    }).join("");

    host.querySelectorAll(".priority-row-v991").forEach((button) => {
      button.onclick = () => filterContextAndOpenBase({
        etapa: button.dataset.etapa || "",
        fornecedor: button.dataset.fornecedor || "",
        owner: button.dataset.owner || ""
      });
    });
  }

  function renderRankingV991(hostId, rows, dimension){
    const host = document.getElementById(hostId);
    if(!host) return;

    const items = (rows || []).slice(0, 3);
    if(!items.length){
      host.innerHTML = '<div class="empty-state">Sem dados no contexto atual</div>';
      return;
    }

    const maxValue = Math.max(
      1,
      ...items.map(item => numberV991(item.value))
    );

    host.innerHTML = items.map((item, index) => {
      const label = item.display_label
        || item.label
        || 'Não informado';
      const quantity = numberV991(item.qtd);
      const critical = numberV991(item.critical_count);
      const maxDays = numberV991(item.max_days);
      const percent = Math.max(
        3,
        Math.min(
          100,
          numberV991(item.value) / maxValue * 100
        )
      );
      const operationalMeta = rankingScopeV994a6 === "pending"
        ? [
            `${intV991(quantity)} em andamento`,
            critical
              ? `${intV991(critical)} crítica${critical === 1 ? '' : 's'}`
              : 'sem crítica > 30 dias',
            `máx. ${intV991(maxDays)} dias`
          ].join(' · ')
        : [
            `${intV991(quantity)} registros`,
            critical
              ? `${intV991(critical)} crítica${critical === 1 ? '' : 's'}`
              : 'sem crítica > 30 dias',
            `máx. ${intV991(maxDays)} dias`
          ].join(' · ');

      return `
        <button
          type="button"
          class="ranking-row-v991 ranking-row-v994a5"
          data-value="${escapeAttr(item.label || label)}"
          aria-label="${escapeAttr(
            `${label}. ${operationalMeta}. ${item.full || item.formatted || ''}. Abrir base filtrada.`
          )}">
          <span class="ranking-rank-v991">${index + 1}</span>
          <span class="ranking-name-v991 ranking-name-v994a5">
            <strong title="${escapeAttr(item.label || label)}">
              ${escapeHtml(label)}
            </strong>
            <small>${escapeHtml(operationalMeta)}</small>
            <progress
              class="ranking-progress-v991"
              max="100"
              value="${percent.toFixed(2)}">
            </progress>
          </span>
          <span class="ranking-qty-v991 ranking-qty-v994a5">
            <b>${intV991(quantity)}</b>
            <small>${rankingScopeV994a6 === "pending" ? "em andamento" : "registros"}</small>
          </span>
          <span
            class="ranking-value-v991 ranking-value-v994a5"
            title="${escapeAttr(item.full || '')}">
            <strong>${escapeHtml(item.formatted || compactCurrency(item.value))}</strong>
            <small>Abrir base →</small>
          </span>
        </button>`;
    }).join('');

    host.querySelectorAll('.ranking-row-v994a5').forEach(button => {
      button.onclick = () => filterDimensionAndOpenBase(
        dimension,
        button.dataset.value || '',
        rankingScopeV994a6
      );
    });
  }

  function rankingRowsV994a6(data, dimension){
    const charts = data?.charts || {};
    const pending = rankingScopeV994a6 === "pending";

    if(dimension === "FORNECEDOR"){
      return pending
        ? (charts.top_fornecedores_pendentes || [])
        : (charts.top_fornecedores || []);
    }

    return pending
      ? (charts.solicitantes_pendentes || [])
      : (charts.custo_solicitante || []);
  }

  function updateRankingScopeUIV994a6(){
    const description = document.getElementById(
      "rankingScopeDescriptionV994a6"
    );
    const supplierTitle = document.getElementById(
      "supplierRankingTitleV994a6"
    );
    const requesterTitle = document.getElementById(
      "requesterRankingTitleV994a6"
    );
    const pending = rankingScopeV994a6 === "pending";

    if(description){
      description.textContent = pending
        ? "Somente registros ainda em andamento."
        : "Visão geral de todos os registros.";
    }
    if(supplierTitle){
      supplierTitle.textContent = pending
        ? "Fornecedores com maior valor em andamento"
        : "Fornecedores com maior valor geral";
    }
    if(requesterTitle){
      requesterTitle.textContent = pending
        ? "Solicitantes com maior valor em andamento"
        : "Solicitantes com maior valor geral";
    }

    document
      .querySelectorAll("[data-ranking-scope]")
      .forEach(button => {
        const active = button.dataset.rankingScope === rankingScopeV994a6;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
  }

  function renderRankingsV994a6(data){
    latestExecutiveDataV994a6 = data || {};
    updateRankingScopeUIV994a6();

    renderRankingV991(
      "actionNowList",
      rankingRowsV994a6(data, "FORNECEDOR"),
      "FORNECEDOR"
    );
    renderRankingV991(
      "ownersCriticos",
      rankingRowsV994a6(data, "SOLICITANTE"),
      "SOLICITANTE"
    );
  }

  function bindRankingScopeV994a6(){
    document
      .querySelectorAll("[data-ranking-scope]")
      .forEach(button => {
        button.onclick = () => {
          const nextScope = button.dataset.rankingScope;
          if(!["all", "pending"].includes(nextScope)) return;
          rankingScopeV994a6 = nextScope;
          renderRankingsV994a6(latestExecutiveDataV994a6 || {});
        };
      });
  }

  function openRankingContextV994a6(){
    clearKpiNavigationState();
    if(rankingScopeV994a6 === "pending"){
      state.filters.ETAPA = [
        "SEM LANÇAMENTO",
        "SEM PEDIDO",
        "SEM NF"
      ];
      window.setOperationalViewContextV114?.(
        'EM_ANDAMENTO',
        'Em andamento',
        state.filters
      );
    }else{
      state.filters.ETAPA = [];
      window.setOperationalViewContextV114?.(
        'TODAS',
        'Geral',
        state.filters
      );
    }
    state.page = 1;
    updateFilterUI();
    savePreferences();
    switchTab("base");
  }

  function bindFooterActionsV991(){
    const allPriorities = document.getElementById("openAllPrioritiesV991");
    const allSuppliers = document.getElementById("openAllSuppliersV991");
    const allRequesters = document.getElementById("openAllRequestersV991");

    if(allPriorities) allPriorities.onclick = () => openBaseFromKpi(
      ["SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"],
      {id:'EM_ANDAMENTO', label:'Em andamento'}
    );
    if(allSuppliers) allSuppliers.onclick = openRankingContextV994a6;
    if(allRequesters) allRequesters.onclick = openRankingContextV994a6;
  }

  window.renderExecutiveV991 = function renderExecutiveV991(data){
    renderCompletionV991(data);
    renderFocusV991(data);
    renderCriticalV991(data);
    renderFlowV991(data);
    renderPrioritiesV991(data);
    renderRankingsV994a6(data);
    bindRankingScopeV994a6();
    bindFooterActionsV991();
  };

  window.renderBaseV991 = function renderBaseV991(data){
    const kpis = data?.kpis || {};
    const hint = document.getElementById("baseOverviewHintV991");
    if(hint){
      hint.textContent =
        `${intV991(kpis.pendentes)} pendentes · ` +
        `${kpis.valor_pendente_compacto || kpis.valor_pendente || "R$ 0"} em andamento · ` +
        `ordem: lançamento → pedido → NF → concluído`;
    }
  };
})();
