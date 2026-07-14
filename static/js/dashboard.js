'use strict';

async function loadDashboard(sequence=null){
  const requestSequence=sequence||++state.dashboardSeq;
  const query=dashboardQuery();
  const cacheKey=JSON.stringify(query);
  const cached=cacheGet(cacheKey,90000);
  if(cached){
    state.currentDashboard=cached;
    renderDashboardData(cached);
    return;
  }
  const data=await api('/api/dashboard',query);
  if(requestSequence!==state.dashboardSeq) return;
  cacheSet(cacheKey,data);
  state.currentDashboard=data;
  renderDashboardData(data);
}

function renderDashboardData(data){
  const k=data.kpis||{};
  setText('kValorPendente',k.valor_pendente_compacto||'R$ 0',k.valor_pendente_fmt||'');
  setText('kValorPendenteSub',`${formatNumber(k.pendentes||0)} RCs em andamento`);
  setText('kPendencias',formatNumber(k.pendentes||0));
  setText('kPendenciasSub',`${formatMoney(k.valor_pendente||0,true)} no processo`);
  setText('kPctConcluido',k.pct_concluido||'0%');
  setText('kConcluidoSub',`${formatNumber(k.concluidas||0)} de ${formatNumber(k.total_rcs||0)} RCs`);
  setText('kValorForaSla',k.valor_sem_lancamento_compacto||'R$ 0',k.valor_sem_lancamento_fmt||'');
  setText('kValorForaSlaSub',`${formatNumber(k.rcs_sem_lancamento||0)} RCs no PCM`);
  setText('kCriticas',formatNumber(k.rcs_criticas||0));
  setText('kCriticasSub',`${formatMoney(k.valor_critico||0,true)} · acima de ${BUSINESS_RULES.aging.critical} dias`);

  renderOldestPending(k);
  renderKpiComparisons(data.comparison);
  renderExecutiveSummary(data.executive_summary||{});
  renderProcess(data.etapas||[],'processCards');
  renderProcess(data.etapas||[],'processCardsBase');
  renderTopPriorities(data.top_prioridades||[]);
  renderRankings(data.rankings||{});
  renderHistory(data.history||null,data.comparison||null);
  renderQuality(data.quality||{});
  bindKpiActions();
}

function renderKpiComparisons(comparison){
  const configs=[
    ['deltaPending',comparison?.pending,'pending'],
    ['deltaCompletion',comparison?.completion_percent,'completion'],
    ['deltaValue',comparison?.pending_value,'money'],
    ['deltaPcm',comparison?.pcm_queue,'pending'],
    ['deltaCritical',comparison?.critical,'pending'],
  ];
  configs.forEach(([id,value,type])=>{
    const element=$(id);
    if(!element) return;
    if(!comparison||value===null||value===undefined||Number(value)===0){
      element.hidden=true;
      return;
    }
    const number=Number(value);
    const positive=number>0;
    let text='';
    if(type==='money') text=`${positive?'↑':'↓'} ${formatMoney(Math.abs(number),true)}`;
    else if(type==='completion') text=`${positive?'↑':'↓'} ${Math.abs(number).toFixed(1).replace('.',',')} p.p.`;
    else text=`${positive?'↑':'↓'} ${formatNumber(Math.abs(number))}`;
    const good=type==='completion'?positive:!positive;
    element.textContent=text;
    element.className=`kpi-delta ${good?'good':'bad'}`;
    element.hidden=false;
  });
  const compared=$('comparisonLabel');
  if(compared){
    if(comparison?.compared_at){
      const date=new Date(comparison.compared_at);
      compared.textContent=`Comparado com ${Number.isNaN(date.getTime())?'a atualização anterior':date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`;
      compared.hidden=false;
    }else compared.hidden=true;
  }
}

function renderOldestPending(k){
  const card=$('kpiMaisParadoCard');
  const value=$('kMaiorAtraso');
  const context=$('kMaiorAtrasoSub');
  if(!card||!value||!context) return;
  const days=Number(k.maior_atraso_dias||0);
  card.dataset.days=String(days);
  card.classList.remove('age-ok','age-attention','age-high','age-critical','age-severe');
  card.classList.add(`age-${ageTone(days)}`);
  value.innerHTML=`<span class="oldest-number">${formatNumber(days)}</span><span class="oldest-unit">dias</span>`;
  if(!days){
    context.innerHTML='<span class="oldest-empty">Sem pendência</span>';
    card.dataset.stage='';
    card.dataset.search='';
    return;
  }
  const stage=String(k.maior_atraso_etapa||'');
  const reference=[k.maior_atraso_label_tipo,k.maior_atraso_label].filter(Boolean).join(' ');
  context.innerHTML=`
    <span class="oldest-stage ${stageClass(stage)}"><i></i>${escapeHtml(displayStage(stage))}</span>
    <span class="oldest-divider">·</span>
    <span class="oldest-reference">${escapeHtml(reference)}</span>`;
  card.dataset.stage=stage;
  card.dataset.search=String(k.maior_atraso_label||'');
  card.dataset.rowId=String(k.maior_atraso_row_id||'');
  card.title=[
    `${formatNumber(days)} dias`,
    displayStage(stage),
    reference,
    k.maior_atraso_fornecedor,
    k.maior_atraso_valor_full,
  ].filter(Boolean).join(' · ');
}

function displayStage(stage){
  const normalized=normalizeText(stage);
  if(normalized==='SEM LANCAMENTO') return 'Sem lançamento';
  if(normalized==='SEM PEDIDO') return 'Sem pedido';
  if(normalized==='SEM NF') return 'Sem NF';
  if(normalized==='CONCLUIDO') return 'Concluído';
  return cleanText(stage)||'Não informado';
}

function bindKpiActions(){
  const actions={
    kpiValorAndamentoCard:()=>openBaseWithContext({filters:{PENDING_ONLY:['1']}}),
    kpiPendenciasCard:()=>openBaseWithContext({filters:{PENDING_ONLY:['1']}}),
    kpiConcluidoCard:()=>openBaseWithContext({filters:{ETAPA:['CONCLUÍDO']}}),
    kpiFocoPcmCard:()=>openBaseWithContext({filters:{ETAPA:['SEM LANÇAMENTO']}}),
    kpiCriticasCard:()=>openBaseWithContext({filters:{CRITICAL_ONLY:['1']},ageMin:BUSINESS_RULES.aging.critical}),
    kpiMaisParadoCard:()=>{
      const card=$('kpiMaisParadoCard');
      if(!card?.dataset.search) return;
      openBaseWithContext({
        filters:{ETAPA:card.dataset.stage?[card.dataset.stage]:[]},
        search:card.dataset.search,
        searchScope:'ALL',
      });
    },
  };
  Object.entries(actions).forEach(([id,handler])=>{
    const element=$(id);
    if(!element||element.dataset.bound==='1') return;
    element.dataset.bound='1';
    element.addEventListener('click',handler);
  });
}

function openBaseWithContext(context={}){
  const additions=context.filters||{};
  if(!Object.prototype.hasOwnProperty.call(additions,'PENDING_ONLY')) state.filters.PENDING_ONLY=[];
  if(!Object.prototype.hasOwnProperty.call(additions,'CRITICAL_ONLY')) state.filters.CRITICAL_ONLY=[];
  if(Object.prototype.hasOwnProperty.call(additions,'PENDING_ONLY') || Object.prototype.hasOwnProperty.call(additions,'CRITICAL_ONLY')){
    state.filters.ETAPA=[];
  }
  Object.entries(additions).forEach(([key,values])=>{ state.filters[key]=Array.isArray(values)?values:[]; });
  if(context.search!==undefined) state.search=String(context.search||'');
  if(context.searchScope) state.searchScope=context.searchScope;
  if(context.ageMin!==undefined) state.ageMin=context.ageMin;
  if(context.ageMax!==undefined) state.ageMax=context.ageMax;
  state.page=1;
  state.selectedRowIds.clear();
  hydrateControlsFromState();
  updateFilterUI();
  switchTab('base');
  refreshAll(false);
}

function renderExecutiveSummary(summary){
  const host=$('executiveSummary');
  if(!host) return;
  const completion=Number(summary.completion_percent||0);
  const focus=summary.focus||null;
  const items=[
    {label:'Concluído',value:formatPercent(completion),action:'completed'},
    {label:'No PCM',value:formatNumber(summary.pcm_queue||0),action:'pcm'},
    {label:'Sem pedido',value:formatNumber(summary.without_order||0),action:'order'},
    {label:'Sem NF',value:formatNumber(summary.without_invoice||0),action:'invoice'},
  ];
  host.innerHTML=`
    <div class="summary-metrics">
      ${items.map(item=>`<button type="button" class="summary-metric" data-summary-action="${item.action}">
        <strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span>
      </button>`).join('')}
    </div>
    <button type="button" class="summary-focus${focus?'':' empty'}" id="summaryFocusButton" ${focus?'':'disabled'}>
      <span>Primeiro foco</span>
      <strong>${focus?escapeHtml(focus.fornecedor):'Nenhuma tratativa pendente'}</strong>
      <small>${focus?`${escapeHtml(focus.qtd_fmt)} · ${escapeHtml(focus.valor_fmt)} · máx. ${formatNumber(focus.maxDias)} dias`:'A fila atual está concluída'}</small>
      <i aria-hidden="true">Abrir →</i>
    </button>`;
  host.querySelectorAll('[data-summary-action]').forEach(button=>{
    button.addEventListener('click',()=>{
      const action=button.dataset.summaryAction;
      if(action==='completed') openBaseWithContext({filters:{ETAPA:['CONCLUÍDO']}});
      if(action==='pcm') openBaseWithContext({filters:{ETAPA:['SEM LANÇAMENTO']}});
      if(action==='order') openBaseWithContext({filters:{ETAPA:['SEM PEDIDO']}});
      if(action==='invoice') openBaseWithContext({filters:{ETAPA:['SEM NF']}});
    });
  });
  $('summaryFocusButton')?.addEventListener('click',()=>{
    if(!focus) return;
    openBaseWithContext({filters:{
      ETAPA:[focus.etapa],
      FORNECEDOR:[focus.fornecedor],
      EFFECTIVE_OWNER:[focus.owner],
    }});
  });
}

function renderProcess(stages,hostId){
  const host=$(hostId);
  if(!host) return;
  if(!stages.length){
    host.innerHTML='<div class="empty-state">Sem etapas para o contexto atual.</div>';
    return;
  }
  host.innerHTML=stages.map(stage=>{
    const completed=stage.etapa==='CONCLUÍDO';
    const detail=completed
      ? `${formatNumber(stage.qtd)} concluídas`
      : `média ${Number(stage.media_dias||0).toFixed(1).replace('.',',')} · máx. ${formatNumber(stage.max_dias||0)} dias`;
    const critical=!completed&&Number(stage.criticas||0)>0
      ? `<span class="stage-critical">${formatNumber(stage.criticas)} acima de ${BUSINESS_RULES.aging.critical}d</span>`
      : '<span class="stage-critical muted">Dentro do limite</span>';
    return `<button type="button" class="process-card ${stageClass(stage.etapa)}" data-stage="${escapeAttr(stage.etapa)}" style="--stage-color:${escapeAttr(stage.cor||'#60758A')}">
      <div class="process-heading"><span><i></i>${escapeHtml(displayStage(stage.etapa))}</span><em>${escapeHtml(stage.percentual_formatado||'0%')}</em></div>
      <div class="process-values"><strong>${formatNumber(stage.qtd)}</strong><b>${escapeHtml(stage.valor_formatado||'R$ 0')}</b></div>
      <div class="process-detail"><span>${escapeHtml(detail)}</span>${critical}</div>
    </button>`;
  }).join('');
  host.querySelectorAll('.process-card').forEach(button=>{
    button.addEventListener('click',()=>openBaseWithContext({filters:{ETAPA:[button.dataset.stage]}}));
  });
}

function renderTopPriorities(items){
  const host=$('topPrioridades');
  if(!host) return;
  if(!items.length){
    host.innerHTML='<div class="empty-state">Sem prioridade pendente no contexto atual.</div>';
    return;
  }
  host.innerHTML=items.slice(0,5).map((item,index)=>`
    <div class="priority-row ${stageClass(item.etapa)}">
      <button type="button" class="priority-open" data-priority-index="${index}">
        <span class="priority-rank">${index+1}</span>
        <span class="priority-copy"><strong>${escapeHtml(item.action)}</strong><b>${escapeHtml(item.fornecedor)}</b><small>${escapeHtml(item.reason)} · média ${Number(item.avgDias||0).toFixed(1).replace('.',',')} dias</small></span>
        <span class="priority-value"><strong>${escapeHtml(item.valor_fmt)}</strong><small>Depende de ${escapeHtml(item.owner)}</small></span>
        <i class="priority-arrow" aria-hidden="true">→</i>
      </button>
      <button type="button" class="priority-copy-codes" data-copy-priority="${index}" title="Copiar RCs deste grupo">Copiar RCs</button>
    </div>`).join('');
  host.querySelectorAll('[data-priority-index]').forEach(button=>{
    button.addEventListener('click',()=>{
      const item=items[Number(button.dataset.priorityIndex)];
      if(!item) return;
      openBaseWithContext({filters:{
        ETAPA:[item.etapa],
        FORNECEDOR:[item.fornecedor],
        EFFECTIVE_OWNER:[item.owner],
      }});
    });
  });
  host.querySelectorAll('[data-copy-priority]').forEach(button=>{
    button.addEventListener('click',async()=>{
      const item=items[Number(button.dataset.copyPriority)];
      if(!item) return;
      await copyText((item.codes||[]).join('\n'));
      showToast(`${formatNumber(item.codes?.length||0)} código${item.codes?.length===1?'':'s'} copiado${item.codes?.length===1?'':'s'}.`);
    });
  });
}

function renderRankings(rankings){
  const mode=state.rankingMode==='total'?'total':'pending';
  document.querySelectorAll('[data-ranking-mode]').forEach(button=>{
    button.classList.toggle('active',button.dataset.rankingMode===mode);
    button.setAttribute('aria-pressed',String(button.dataset.rankingMode===mode));
  });
  renderRankingList('supplierRanking',mode==='pending'?rankings.suppliers_pending:rankings.suppliers_total,'FORNECEDOR');
  renderRankingList('requesterRanking',mode==='pending'?rankings.requesters_pending:rankings.requesters_total,'SOLICITANTE');
  const subtitle=mode==='pending'?'Valores ainda em andamento':'Valores totais movimentados';
  document.querySelectorAll('[data-ranking-subtitle]').forEach(el=>{el.textContent=subtitle;});
}

function renderRankingList(hostId,items,dimension){
  const host=$(hostId);
  if(!host) return;
  const valid=(items||[]).filter(item=>normalizeText(item.label)!=='NAO INFORMADO'&&Number(item.value||0)>0).slice(0,5);
  if(!valid.length){
    host.innerHTML='<div class="empty-state">Sem dados para o contexto atual.</div>';
    return;
  }
  const max=Math.max(...valid.map(item=>Number(item.value||0)),1);
  host.innerHTML=valid.map((item,index)=>{
    const width=Math.max(5,Number(item.value||0)/max*100);
    return `<button type="button" class="ranking-row" data-ranking-value="${escapeAttr(item.label)}">
      <span class="ranking-position">${index+1}</span>
      <span class="ranking-main"><strong title="${escapeAttr(item.label)}">${escapeHtml(item.label)}</strong><small>${formatNumber(item.qtd||0)} RCs · máx. ${formatNumber(item.maxDias||0)} dias</small><i style="--ranking-width:${width.toFixed(2)}%"></i></span>
      <span class="ranking-value">${escapeHtml(item.formatted||formatMoney(item.value,true))}</span>
    </button>`;
  }).join('');
  host.querySelectorAll('.ranking-row').forEach(button=>{
    button.addEventListener('click',()=>openBaseWithContext({filters:{[dimension]:[button.dataset.rankingValue]}}));
  });
}


function renderHistory(history,comparison){
  const host=$('historyPanel');
  const subtitle=$('historySubtitle');
  if(!host) return;

  if(!history){
    if(subtitle) subtitle.textContent='Disponível na visão sem filtros';
    host.innerHTML='<div class="history-empty"><strong>Histórico preservado</strong><span>Limpe os filtros para comparar as atualizações gerais da base.</span></div>';
    return;
  }

  const recent=Array.isArray(history.recent)?history.recent:[];
  const movements=history.movements||{};
  const hasPrevious=Boolean(history.previous)||recent.length>1;
  if(subtitle){
    subtitle.textContent=hasPrevious
      ? `${formatNumber(history.count||recent.length)} atualizações preservadas`
      : 'O comparativo aparecerá após a próxima atualização';
  }

  const metrics=[
    {
      label:'Entraram na fila',
      value:hasPrevious?formatNumber(movements.entered||0):'—',
      hint:'novas pendências',
      tone:Number(movements.entered||0)>0?'bad':'neutral',
    },
    {
      label:'Resolvidas',
      value:hasPrevious?formatNumber(movements.resolved||0):'—',
      hint:'saíram da fila',
      tone:Number(movements.resolved||0)>0?'good':'neutral',
    },
    {
      label:'Saldo da fila',
      value:hasPrevious?`${Number(movements.net||0)>0?'+':''}${formatNumber(movements.net||0)}`:'—',
      hint:'entradas menos resolvidas',
      tone:Number(movements.net||0)<0?'good':Number(movements.net||0)>0?'bad':'neutral',
    },
    {
      label:'Variação financeira',
      value:hasPrevious?`${Number(movements.pending_value_change||0)>0?'+':''}${formatMoney(movements.pending_value_change||0,true)}`:'—',
      hint:'valor ainda pendente',
      tone:Number(movements.pending_value_change||0)<0?'good':Number(movements.pending_value_change||0)>0?'bad':'neutral',
    },
  ];

  const ordered=[...recent].reverse();
  const maxPending=Math.max(1,...ordered.map(item=>Number(item.pending||0)));
  const trend=ordered.length
    ? `<div class="history-trend" aria-label="Evolução da quantidade de pendências">
        <div class="history-trend-head"><strong>Pendências por atualização</strong><small>${ordered.length===1?'Primeiro registro histórico':'mais antigo → mais recente'}</small></div>
        <div class="history-bars">${ordered.map((item,index)=>{
          const width=Math.max(4,Number(item.pending||0)/maxPending*100);
          const date=new Date(item.generated_at);
          const dateText=Number.isNaN(date.getTime())?'Atualização':date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
          const current=index===ordered.length-1;
          return `<div class="history-bar-row ${current?'current':''}" title="${escapeAttr(`${dateText}: ${formatNumber(item.pending||0)} pendências · ${formatMoney(item.pending_value||0,true)}`)}">
            <span>${escapeHtml(dateText)}</span>
            <i><b style="--history-width:${width.toFixed(2)}%"></b></i>
            <strong>${formatNumber(item.pending||0)}</strong>
          </div>`;
        }).join('')}</div>
      </div>`
    : '<div class="history-empty"><strong>Sem snapshots anteriores</strong><span>Execute a atualização novamente para iniciar a comparação.</span></div>';

  host.innerHTML=`
    <div class="history-metrics">${metrics.map(item=>`
      <div class="history-metric ${item.tone}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <small>${escapeHtml(item.hint)}</small>
      </div>`).join('')}</div>
    ${trend}`;
}

function renderQuality(quality){
  const host=$('qualityPanel');
  if(!host) return;
  const score=Number(quality.score||0);
  const tone=score>=98?'good':score>=95?'attention':'bad';
  const issues=[
    ['Sem fornecedor',quality.missing_supplier],
    ['Sem data de recebimento',quality.missing_date],
    ['Etapa não reconhecida',quality.unknown_stage],
    ['Valor negativo',quality.negative_value],
    ['RCs duplicadas',quality.duplicate_requests],
  ];
  host.innerHTML=`
    <div class="quality-score ${tone}">
      <span>Qualidade da base</span><strong>${escapeHtml(quality.score_fmt||'0%')}</strong>
      <small>${formatNumber(quality.issues||0)} inconsistência${Number(quality.issues||0)===1?'':'s'} principal${Number(quality.issues||0)===1?'':'is'}</small>
    </div>
    <div class="quality-items">${issues.map(([label,value])=>`
      <div class="quality-item"><span>${escapeHtml(label)}</span><strong>${formatNumber(value||0)}</strong></div>`).join('')}</div>`;
}

function setRankingMode(mode){
  state.rankingMode=mode==='total'?'total':'pending';
  savePreferences();
  if(state.currentDashboard) renderRankings(state.currentDashboard.rankings||{});
}
