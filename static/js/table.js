'use strict';

const DEFAULT_COLUMN_ORDER = [
  'ETAPA','DIAS PARADO','SLA STATUS','DONO DA AÇÃO',
  'DATA DE RECEBIMENTO','DATA LANÇAMENTO','Nº ORÇAMENTO FINAL','VALOR TOTAL',
  'FORNECEDOR','SOLICITANTE','PREFIXO','EQUIPAMENTO','Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA',
  'FAIXA ATRASO',
];

async function loadRows(sequence=null){
  const requestSequence=sequence||++state.rowsSeq;
  const data=await api('/api/rows',tableQuery());
  if(requestSequence!==state.rowsSeq) return;
  state.page=data.page;
  state.currentRows=data.rows||[];
  state.currentColumns=data.columns||[];
  state.currentTotal=Number(data.total||0);
  if(!state.visibleColumns.length){
    state.visibleColumns=[
      ...DEFAULT_COLUMN_ORDER.filter(column=>data.columns.includes(column)),
      ...data.columns.filter(column=>!DEFAULT_COLUMN_ORDER.includes(column)),
    ];
  }else{
    state.visibleColumns=state.visibleColumns.filter(column=>data.columns.includes(column));
    if(!state.visibleColumns.length) state.visibleColumns=data.columns.slice();
  }
  renderDataTable(data);
  renderSelectionToolbar();
  renderColumnChooser();
}

function renderDataTable(data){
  const table=$('dataTable');
  if(!table) return;
  table.className=`density-${state.density}`;
  const columns=state.visibleColumns.filter(column=>data.columns.includes(column));
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  const allPageSelected=data.rows.length>0&&data.rows.every(row=>state.selectedRowIds.has(Number(row._ROW_ID)));
  thead.innerHTML=`<tr>
    <th class="select-column"><input id="selectPageRows" type="checkbox" aria-label="Selecionar todos os registros desta página" ${allPageSelected?'checked':''}/></th>
    ${columns.map(renderHeader).join('')}
    <th class="actions-column"><span class="sr-only">Ações</span></th>
  </tr>`;
  if(!data.rows.length){
    tbody.innerHTML=`<tr><td colspan="${columns.length+2}" class="table-empty"><strong>Nenhum registro encontrado</strong><span>Revise os filtros ou a busca aplicada.</span></td></tr>`;
  }else{
    tbody.innerHTML=data.rows.map(row=>{
      const id=Number(row._ROW_ID||0);
      const selected=state.selectedRowIds.has(id);
      return `<tr class="${stageClass(row._ETAPA)}${selected?' selected-row':''}" data-row-id="${id}">
        <td class="select-column"><input type="checkbox" class="row-select" aria-label="Selecionar registro ${id}" data-row-select="${id}" ${selected?'checked':''}/></td>
        ${columns.map(column=>renderCell(column,row[column],row)).join('')}
        <td class="actions-column"><button type="button" class="row-detail-button" data-row-detail="${id}" aria-label="Abrir detalhes do registro ${id}">Detalhes</button></td>
      </tr>`;
    }).join('');
  }
  bindTableInteractions();
  setText('tableCounter',`${formatNumber(data.from)}–${formatNumber(data.to)} de ${formatNumber(data.total)} registros`);
  setText('pageInfo',`${data.page}/${data.pages}`);
  $('prevPage').disabled=data.page<=1;
  $('nextPage').disabled=data.page>=data.pages;
  updateSearchStatus(data.total);
}

function headerInfo(column){
  const map={
    'ETAPA':['Etapa','situação'],
    'DIAS PARADO':['Dias parado','prioridade'],
    'SLA STATUS':['Atenção','tratativa'],
    'DONO DA AÇÃO':['Depende de','responsável'],
    'FAIXA ATRASO':['Faixa','tempo parado'],
    'DATA DE RECEBIMENTO':['Recebido em','entrada'],
    'DATA LANÇAMENTO':['Lançado em','sistema'],
    'Nº ORÇAMENTO FINAL':['Orçamento','referência'],
    'FORNECEDOR':['Fornecedor','empresa'],
    'SOLICITANTE':['Solicitante','responsável'],
    'PREFIXO':['Prefixo','ativo'],
    'EQUIPAMENTO':['Equipamento','descrição'],
    'VALOR TOTAL':['Valor total','R$'],
    'Nº REQUISIÇÃO':['Requisição','RC'],
    'Nº PEDIDO DE COMPRA':['Pedido','PC'],
  };
  return map[column]||[column,''];
}

function renderHeader(column){
  const [title,subtitle]=headerInfo(column);
  const active=state.sortCol===column;
  const ariaSort=active?(state.sortDir==='asc'?'ascending':'descending'):'none';
  return `<th class="sortable ${columnClass(column)}${active?' active-sort':''}" data-sort-column="${escapeAttr(column)}" aria-sort="${ariaSort}">
    <button type="button" class="sort-button" title="Ordenar por ${escapeAttr(title)}">
      <span><strong>${escapeHtml(title)}</strong>${subtitle?`<small>${escapeHtml(subtitle)}</small>`:''}</span>
      <i aria-hidden="true">${active?(state.sortDir==='asc'?'↑':'↓'):'↕'}</i>
    </button>
  </th>`;
}

function renderCell(column,value,row){
  const className=columnClass(column);
  const text=cleanText(value);
  if(column==='ETAPA'){
    return `<td class="${className}"><span class="stage-tag ${stageClass(text||row._ETAPA)}">${escapeHtml(displayStage(text||row._ETAPA))}</span></td>`;
  }
  if(column==='DIAS PARADO'){
    const days=Number(row._DIAS_PARADO||String(text).replace(/[^0-9]/g,'')||0);
    return `<td class="${className}"><span class="age-badge ${ageTone(days)}">${formatNumber(days)} dias</span></td>`;
  }
  if(column==='VALOR TOTAL'||column==='VALOR PEÇAS'||column==='VALOR SERVIÇO'){
    return `<td class="${className} money-cell" title="${escapeAttr(text)}">${escapeHtml(text||'R$ 0,00')}</td>`;
  }
  if(column==='SLA STATUS'){
    const days=Number(row._DIAS_PARADO||0);
    const label=days>=BUSINESS_RULES.aging.severe?'Muito crítico'
      :days>=BUSINESS_RULES.aging.critical?'Crítico'
      :days>=BUSINESS_RULES.aging.high?'Prioridade'
      :days>=BUSINESS_RULES.aging.attention?'Acompanhar'
      :'Rotina';
    return `<td class="${className}"><span class="status-pill ${ageTone(days)}">${label}</span></td>`;
  }
  const isCode=['Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA','Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE','PREFIXO'].includes(column);
  if(!text) return `<td class="${className}"><span class="empty-dash">—</span></td>`;
  const highlighted=highlightSearch(text);
  if(isCode){
    return `<td class="${className} code-cell"><span title="${escapeAttr(text)}">${highlighted}</span><button type="button" class="cell-copy" data-copy-value="${escapeAttr(text)}" aria-label="Copiar ${escapeAttr(text)}">⧉</button></td>`;
  }
  return `<td class="${className}" title="${escapeAttr(text)}"><span class="cell-text">${highlighted}</span></td>`;
}

function highlightSearch(value){
  const escaped=escapeHtml(value);
  const terms=splitSearchTerms(state.search);
  if(!terms.length) return escaped;
  const rawTokens=terms.flatMap(term=>term.split(' ')).filter(token=>token.length>=2).slice(0,8);
  if(!rawTokens.length) return escaped;
  let output=escaped;
  rawTokens.forEach(token=>{
    const safe=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    output=output.replace(new RegExp(`(${safe})`,'ig'),'<mark>$1</mark>');
  });
  return output;
}

function columnClass(column){
  return `col-${normalizeText(column).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`;
}

function bindTableInteractions(){
  $('selectPageRows')?.addEventListener('change',event=>{
    state.currentRows.forEach(row=>{
      const id=Number(row._ROW_ID||0);
      if(event.target.checked) state.selectedRowIds.add(id);
      else state.selectedRowIds.delete(id);
    });
    renderDataTable({
      columns:state.currentColumns,
      rows:state.currentRows,
      total:state.currentTotal,
      page:state.page,
      pages:Math.max(1,Math.ceil(state.currentTotal/state.pageSize)),
      from:state.currentTotal?(state.page-1)*state.pageSize+1:0,
      to:Math.min(state.page*state.pageSize,state.currentTotal),
    });
    renderSelectionToolbar();
  });
  document.querySelectorAll('[data-row-select]').forEach(input=>{
    input.addEventListener('change',()=>{
      const id=Number(input.dataset.rowSelect);
      if(input.checked) state.selectedRowIds.add(id);
      else state.selectedRowIds.delete(id);
      input.closest('tr')?.classList.toggle('selected-row',input.checked);
      renderSelectionToolbar();
    });
  });
  document.querySelectorAll('[data-row-detail]').forEach(button=>{
    button.addEventListener('click',()=>openRowDetails(Number(button.dataset.rowDetail)));
  });
  document.querySelectorAll('[data-sort-column]').forEach(header=>{
    header.querySelector('button')?.addEventListener('click',()=>sortBy(header.dataset.sortColumn));
  });
  document.querySelectorAll('[data-copy-value]').forEach(button=>{
    button.addEventListener('click',async event=>{
      event.stopPropagation();
      await copyText(button.dataset.copyValue);
      showToast('Valor copiado.');
    });
  });
}

function sortBy(column){
  if(state.sortCol===column) state.sortDir=state.sortDir==='asc'?'desc':'asc';
  else{
    state.sortCol=column;
    state.sortDir=DESC_FIRST_COLUMNS.has(column)?'desc':'asc';
  }
  state.page=1;
  savePreferences();
  loadRows();
}

function renderSelectionToolbar(){
  const toolbar=$('selectionToolbar');
  if(!toolbar) return;
  const count=state.selectedRowIds.size;
  toolbar.hidden=count===0;
  if(!count) return;
  setText('selectedCount',`${formatNumber(count)} selecionado${count===1?'':'s'}`);
}

async function copySelectedSummaries(){
  if(!state.selectedRowIds.size) return;
  const db=await loadStaticData();
  const rows=db.rows.filter(row=>state.selectedRowIds.has(Number(row._ROW_ID||0)));
  const summaries=rows.map(row=>[
    `RC ${cleanText(row['Nº REQUISIÇÃO'])||'não informada'}`,
    `Fornecedor: ${cleanText(row.FORNECEDOR)||'não informado'}`,
    `Etapa: ${displayStage(stageName(row))}`,
    `Valor: ${formatMoney(rowValue(row))}`,
    `Parada há ${formatNumber(effectiveDays(row))} dias`,
  ].join('\n'));
  await copyText(summaries.join('\n\n'));
  showToast(`${formatNumber(rows.length)} resumo${rows.length===1?'':'s'} copiado${rows.length===1?'':'s'}.`);
}

function clearSelection(){
  state.selectedRowIds.clear();
  renderSelectionToolbar();
  if(state.currentRows.length){
    renderDataTable({
      columns:state.currentColumns,
      rows:state.currentRows,
      total:state.currentTotal,
      page:state.page,
      pages:Math.max(1,Math.ceil(state.currentTotal/state.pageSize)),
      from:state.currentTotal?(state.page-1)*state.pageSize+1:0,
      to:Math.min(state.page*state.pageSize,state.currentTotal),
    });
  }
}

async function openRowDetails(rowId){
  const drawer=$('detailDrawer');
  const backdrop=$('drawerBackdrop');
  const body=$('detailDrawerBody');
  if(!drawer||!body) return;
  state.lastFocus=document.activeElement;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  if(backdrop) backdrop.hidden=false;
  body.innerHTML='<div class="drawer-loading">Carregando detalhes...</div>';
  try{
    const detail=await api('/api/row',{row_id:rowId});
    renderRowDetails(detail);
  }catch(error){
    body.innerHTML=`<div class="drawer-error">${escapeHtml(error.message)}</div>`;
  }
  $('btnCloseDetails')?.focus();
}

function closeRowDetails(){
  const drawer=$('detailDrawer');
  drawer?.classList.remove('open');
  drawer?.setAttribute('aria-hidden','true');
  const filterOpen=$('filterDrawer')?.classList.contains('open');
  const columnOpen=$('columnDrawer')?.classList.contains('open');
  if(!filterOpen&&!columnOpen&&$('drawerBackdrop')) $('drawerBackdrop').hidden=true;
  state.lastFocus?.focus?.();
}

function renderRowDetails(detail){
  const body=$('detailDrawerBody');
  if(!body) return;
  const data=detail.data||{};
  const groups=[
    ['Identificação',['Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA','Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE']],
    ['Tratativa',['ETAPA','DIAS PARADO','SLA STATUS','DONO DA AÇÃO','FAIXA ATRASO','STATUS']],
    ['Datas',['DATA DE RECEBIMENTO','DATA LANÇAMENTO','DATA DO PEDIDO','DATA LANÇAMENTO NFS']],
    ['Contexto',['FORNECEDOR','SOLICITANTE','PREFIXO','EQUIPAMENTO']],
    ['Valores',['VALOR TOTAL','VALOR PEÇAS','VALOR SERVIÇO']],
    ['Observações',['OBS ADICIONAIS']],
  ];
  const used=new Set();
  const groupMarkup=groups.map(([title,columns])=>{
    const rows=columns.filter(column=>column in data).map(column=>{
      used.add(column);
      return `<div class="detail-field"><span>${escapeHtml(headerInfo(column)[0])}</span><strong>${escapeHtml(cleanText(data[column])||'—')}</strong></div>`;
    }).join('');
    return rows?`<section class="detail-group"><h3>${title}</h3>${rows}</section>`:'';
  }).join('');
  const extra=Object.entries(data).filter(([column])=>!used.has(column)&&cleanText(data[column])).map(([column,value])=>
    `<div class="detail-field"><span>${escapeHtml(column)}</span><strong>${escapeHtml(value)}</strong></div>`
  ).join('');
  body.innerHTML=`
    <div class="detail-hero ${stageClass(detail.etapa)}"><span>${escapeHtml(displayStage(detail.etapa))}</span><strong>${formatNumber(detail.dias)} dias</strong><small>${formatMoney(detail.valor)}</small></div>
    ${groupMarkup}
    ${extra?`<section class="detail-group"><h3>Outros campos</h3>${extra}</section>`:''}`;
  const summary=[
    `RC ${cleanText(data['Nº REQUISIÇÃO'])||'não informada'}`,
    `Fornecedor: ${cleanText(data.FORNECEDOR)||'não informado'}`,
    `Etapa: ${displayStage(detail.etapa)}`,
    `Valor: ${formatMoney(detail.valor)}`,
    `Parada há ${formatNumber(detail.dias)} dias`,
  ].join('\n');
  const copyButton=$('btnCopyDetailSummary');
  if(copyButton){
    copyButton.onclick=async()=>{
      await copyText(summary);
      showToast('Resumo do registro copiado.');
    };
  }
}

function renderColumnChooser(){
  const host=$('columnOptions');
  if(!host||!state.currentColumns.length) return;
  const visible=new Set(state.visibleColumns);
  host.innerHTML=state.currentColumns.map(column=>`
    <label class="column-option">
      <input type="checkbox" value="${escapeAttr(column)}" ${visible.has(column)?'checked':''}/>
      <span>${escapeHtml(headerInfo(column)[0])}</span>
    </label>`).join('');
}

function applyColumnChooser(){
  const checked=Array.from(document.querySelectorAll('#columnOptions input:checked')).map(input=>input.value);
  if(!checked.length){
    showToast('Mantenha pelo menos uma coluna visível.',true);
    return;
  }
  state.visibleColumns=checked;
  savePreferences();
  closeColumnDrawer();
  renderDataTable({
    columns:state.currentColumns,
    rows:state.currentRows,
    total:state.currentTotal,
    page:state.page,
    pages:Math.max(1,Math.ceil(state.currentTotal/state.pageSize)),
    from:state.currentTotal?(state.page-1)*state.pageSize+1:0,
    to:Math.min(state.page*state.pageSize,state.currentTotal),
  });
}

function resetColumns(){
  state.visibleColumns=[
    ...DEFAULT_COLUMN_ORDER.filter(column=>state.currentColumns.includes(column)),
    ...state.currentColumns.filter(column=>!DEFAULT_COLUMN_ORDER.includes(column)),
  ];
  renderColumnChooser();
}
