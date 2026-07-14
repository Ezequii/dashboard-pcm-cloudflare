async function loadRows(seq=null){
  const requestSeq = seq || ++state.rowsSeq;
  const data = await api('/api/rows', tableQuery());
  if(seq && seq !== state.dashboardSeq) return;
  if(!seq && requestSeq !== state.rowsSeq) return;
  state.page = data.page;
  const table = $('dataTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  // V90: mantém os dados intactos, mas coloca o valor total junto do orçamento,
  // antes dos nomes, para a liderança enxergar dinheiro sem rolar horizontalmente.
  const preferredOrder = [
    'ETAPA','DIAS PARADO','SLA STATUS','DONO DA AÇÃO','FAIXA ATRASO',
    'DATA DE RECEBIMENTO','DATA LANÇAMENTO','Nº ORÇAMENTO FINAL','VALOR TOTAL',
    'FORNECEDOR','SOLICITANTE','PREFIXO','EQUIPAMENTO','Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA'
  ];
  const sourceColumns = Array.isArray(data.columns) ? data.columns : [];
  const columns = [
    ...preferredOrder.filter(col => sourceColumns.includes(col)),
    ...sourceColumns.filter(col => !preferredOrder.includes(col))
  ];
  thead.innerHTML = '<tr>' + columns.map(c => renderHeader(c)).join('') + '</tr>';
  tbody.innerHTML = data.rows.map(row => `<tr class="${stageClass(row._ETAPA)}">` + columns.map(c => renderCell(c, row[c], row._ETAPA, row)).join('') + '</tr>').join('');
  thead.querySelectorAll('th.sortable').forEach(th => th.onclick = () => sortBy(th.dataset.col));
  $('tableCounter').textContent = `${Number(data.from).toLocaleString('pt-BR')}-${Number(data.to).toLocaleString('pt-BR')} de ${Number(data.total).toLocaleString('pt-BR')} registros`;
  $('pageInfo').textContent = `${data.page}/${data.pages}`;
  $('prevPage').disabled = data.page <= 1;
  $('nextPage').disabled = data.page >= data.pages;
  updateSearchUI(data.total);
}

function headerInfo(col){
  const map = {
    'ETAPA': ['Etapa', 'situação'],
    'DIAS PARADO': ['Dias parado', 'prioridade'],
    'SLA STATUS': ['Atenção', 'tratativa'],
    'DONO DA AÇÃO': ['Depende de', 'responsável'],
    'FAIXA ATRASO': ['Tempo parado', 'faixa'],
    'DATA DE RECEBIMENTO': ['Recebido em', 'entrada no PCM'],
    'DATA LANÇAMENTO': ['Lançado em', 'lançamento no sistema'],
    'Nº ORÇAMENTO FINAL': ['Orçamento', 'nº final'],
    'PREFIXO': ['Prefixo', 'ativo/centro'],
    'EQUIPAMENTO': ['Equipamento', 'descrição'],
    'FORNECEDOR': ['Fornecedor', 'empresa'],
    'VALOR TOTAL': ['Valor total', 'R$'],
    'SOLICITANTE': ['Solicitante', 'responsável'],
    'Nº REQUISIÇÃO': ['Requisição', 'RC'],
    'Nº PEDIDO DE COMPRA': ['Pedido de compra', 'PC']
  };
  return map[col] || [col, ''];
}

function renderHeader(col){
  const active = state.sortCol === col;
  const directionText = active ? (state.sortDir === 'asc' ? 'crescente' : 'decrescente') : 'sem ordenação';
  const [main, sub] = headerInfo(col);
  return `<th class="sortable ${colClass(col)}${active ? ' active-sort' : ''}" data-col="${escapeAttr(col)}" title="Clique para ordenar por ${escapeAttr(col)} (${directionText})">
    <span class="th-label"><span class="th-main">${escapeHtml(main)}</span>${sub ? `<span class="th-sub">${escapeHtml(sub)}</span>` : ''}</span><span class="sort-icon">${sortMark(col)}</span>
  </th>`;
}

function emptyDash(val){
  return String(val || '').trim() ? escapeHtml(val) : '<span class="empty-dash">—</span>';
}

function parseCurrencyValue(value){
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if(!raw) return 0;
  let clean = raw.replace(/R\$/gi,'').replace(/\s/g,'').replace(/[^0-9,.-]/g,'');
  if(clean.includes(',')) clean = clean.replace(/\./g,'').replace(',','.');
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}
function formatCurrencyBR(value){
  return parseCurrencyValue(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
}

function renderCell(col, value, etapa, row={}){
  const val = value || '';
  const cls = colClass(col);
  const safeTitle = escapeAttr(val || '');
  if(col === 'ETAPA'){
    return `<td class="${cls}"><span class="tag-etapa ${stageClass(val || etapa)}">${escapeHtml(val || etapa || '')}</span></td>`;
  }
  if(col === 'DIAS PARADO'){
    const dias = parseInt(String(val || '0').replace(/[^0-9]/g, ''), 10) || 0;
    let level = 'ok';
    if(dias > 30) level = 'very-critical';
    else if(dias > 15) level = 'critical';
    else if(dias > 7) level = 'attention';
    return `<td class="${cls}" title="Dias parado: ${safeTitle}"><span class="delay-badge ${level}">${escapeHtml(val || '0 dias')}</span></td>`;
  }
  if(col === 'SLA STATUS'){
    // V83: Usa o valor de SLA STATUS já calculado no backend (tratamento_dados.py)
    // Thresholds backend: SEM LANÇAMENTO (5+ crítico, 3+ atenção), SEM PEDIDO (8+ crítico, 5+ atenção), SEM NF (11+ crítico, 8+ atenção), 30+ sempre crítico
    const slaValue = String(val || '').trim().toUpperCase();
    const etapaNorm = String(etapa || row.ETAPA || '').toUpperCase();
    const dias = parseInt(String(row['DIAS PARADO'] || row._DIAS_PARADO || '0').replace(/[^0-9]/g, ''), 10) || 0;
    
    let level = 'ok';
    let display = 'Rotina';
    
    // Usa o valor de SLA STATUS do backend como fonte oficial
    if(slaValue === 'CONCLUÍDO' || slaValue === 'CONCLUIDO'){
      level = 'done';
      display = 'Concluído';
    } else if(slaValue === 'CRÍTICO'){
      level = 'critical';
      display = 'Muito parado';
    } else if(slaValue === 'ATENÇÃO'){
      level = 'attention';
      if(etapaNorm === 'SEM LANÇAMENTO' || etapaNorm === 'SEM LANCAMENTO'){
        display = 'Conferir lançamento';
      } else if(etapaNorm === 'SEM PEDIDO'){
        display = 'Acompanhar pedido';
      } else if(etapaNorm === 'SEM NF'){
        display = 'Conferir NF';
      } else {
        display = 'Acompanhar';
      }
    } else {
      // OK ou valor não reconhecido
      level = 'ok';
      if(etapaNorm === 'SEM LANÇAMENTO' || etapaNorm === 'SEM LANCAMENTO'){
        display = 'Conferir lançamento';
      } else if(etapaNorm === 'SEM PEDIDO'){
        display = 'Acompanhar pedido';
      } else if(etapaNorm === 'SEM NF'){
        display = 'Conferir NF';
      } else {
        display = 'Rotina';
      }
    }
    return `<td class="${cls}" title="Tratativa: ${escapeAttr(display)} · ${Number(dias).toLocaleString('pt-BR')} dias"><span class="sla-badge ${level}">${escapeHtml(display)}</span></td>`;
  }
  if(col === 'DONO DA AÇÃO'){
    return `<td class="${cls}" title="Depende de: ${safeTitle}"><span class="owner-pill">${emptyDash(val)}</span></td>`;
  }
  if(col === 'FAIXA ATRASO'){
    return `<td class="${cls}" title="Tempo parado: ${safeTitle}"><span class="delay-range">${emptyDash(val)}</span></td>`;
  }
  if(col === 'DATA DE RECEBIMENTO'){
    const content = String(val || '').trim() ? `<span class="date-chip received">${escapeHtml(val)}</span>` : `<span class="date-chip missing">Sem data</span>`;
    return `<td class="${cls}" title="Data de recebimento: ${safeTitle}">${content}</td>`;
  }
  if(col === 'DATA LANÇAMENTO'){
    const content = String(val || '').trim() ? `<span class="date-chip launched">${escapeHtml(val)}</span>` : `<span class="date-chip pending">Sem lançamento</span>`;
    return `<td class="${cls}" title="Data de lançamento: ${safeTitle}">${content}</td>`;
  }
  if(col === 'Nº ORÇAMENTO FINAL'){
    return `<td class="${cls}" title="Orçamento: ${safeTitle}"><span class="orcamento-pill">${emptyDash(val)}</span></td>`;
  }
  if(col === 'FORNECEDOR'){
    return `<td class="${cls}" title="Fornecedor: ${safeTitle}"><span class="supplier-text">${emptyDash(val)}</span></td>`;
  }
  if(col === 'SOLICITANTE'){
    return `<td class="${cls}" title="Solicitante: ${safeTitle}"><span class="person-text">${emptyDash(val)}</span></td>`;
  }
  if(col === 'VALOR TOTAL'){
    const formatted = formatCurrencyBR(row._VALOR_TOTAL ?? val);
    return `<td class="${cls} money-td-v89" title="Valor total: ${escapeAttr(formatted)}"><span class="money-cell money-cell-v89">${escapeHtml(formatted)}</span></td>`;
  }
  if(col === 'Nº REQUISIÇÃO' || col === 'Nº PEDIDO DE COMPRA' || col === 'PREFIXO'){
    return `<td class="${cls}" title="${safeTitle}"><span class="code-cell">${emptyDash(val)}</span></td>`;
  }
  return `<td class="${cls}" title="${safeTitle}">${emptyDash(val)}</td>`;
}

function colClass(col){
  return 'col-' + String(col || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sortMark(col){
  if(state.sortCol !== col) return '↕';
  return state.sortDir === 'asc' ? '↑' : '↓';
}
function defaultSortDir(col){ return DESC_FIRST_COLUMNS.has(col) ? 'desc' : 'asc'; }
function sortBy(col){
  if(state.sortCol === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  else { state.sortCol = col; state.sortDir = defaultSortDir(col); }
  state.page = 1;
  savePreferences();
  loadRows();
}
