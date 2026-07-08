async function loadRows(seq=null){
  const requestSeq = seq || ++state.rowsSeq;
  const data = await api('/api/rows', tableQuery());
  if(seq && seq !== state.dashboardSeq) return;
  if(!seq && requestSeq !== state.rowsSeq) return;
  state.page = data.page;
  const table = $('dataTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  thead.innerHTML = '<tr>' + data.columns.map(c => renderHeader(c)).join('') + '</tr>';
  tbody.innerHTML = data.rows.map(row => `<tr class="${stageClass(row._ETAPA)}">` + data.columns.map(c => renderCell(c, row[c], row._ETAPA, row)).join('') + '</tr>').join('');
  thead.querySelectorAll('th.sortable').forEach(th => th.onclick = () => sortBy(th.dataset.col));
  $('tableCounter').textContent = `${Number(data.from).toLocaleString('pt-BR')}-${Number(data.to).toLocaleString('pt-BR')} de ${Number(data.total).toLocaleString('pt-BR')} registros`;
  $('pageInfo').textContent = `${data.page}/${data.pages}`;
  $('prevPage').disabled = data.page <= 1;
  $('nextPage').disabled = data.page >= data.pages;
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
    const normalized = String(val || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const etapaNorm = String(etapa || row.ETAPA || '').toUpperCase();
    const dias = parseInt(String(row['DIAS PARADO'] || row._DIAS_PARADO || '0').replace(/[^0-9]/g, ''), 10) || 0;
    let level = normalized.includes('concluido') ? 'done' : 'ok';
    let display = 'Rotina';

    if(etapaNorm === 'CONCLUÍDO' || etapaNorm === 'CONCLUIDO'){
      level = 'done'; display = 'Concluído';
    } else if(dias >= 30){
      level = 'critical'; display = 'Muito parado';
    } else if(etapaNorm === 'SEM LANÇAMENTO' || etapaNorm === 'SEM LANCAMENTO'){
      level = dias >= 15 ? 'attention' : 'ok'; display = 'Conferir lançamento';
    } else if(etapaNorm === 'SEM PEDIDO'){
      level = dias >= 15 ? 'attention' : 'ok'; display = 'Acompanhar pedido';
    } else if(etapaNorm === 'SEM NF'){
      level = dias >= 15 ? 'attention' : 'ok'; display = 'Conferir NF';
    } else if(normalized.includes('critico')){
      level = 'critical'; display = 'Muito parado';
    } else if(normalized.includes('atencao')){
      level = 'attention'; display = 'Acompanhar';
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
    return `<td class="${cls}" title="Valor total: ${safeTitle}"><span class="money-cell">${emptyDash(val)}</span></td>`;
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
