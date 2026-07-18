let lastAnnouncedEmptySignatureV100 = "";
let lastRenderedTableModeV100 = "unknown";
let pendingBaseAnnouncementV100 = null;
let baseAnnouncementTimerV100 = null;
let baseAnnouncementTokenV100 = 0;

const V100_DEFAULT_BASE_COLUMNS = Object.freeze([
  "ETAPA",
  "DIAS PARADO",
  "SLA STATUS",
  "DATA DE RECEBIMENTO",
  "DATA LANÇAMENTO",
  "Nº ORÇAMENTO FINAL",
  "FORNECEDOR",
  "SOLICITANTE"
]);

const V100_BASE_COLUMN_GROUPS = Object.freeze({
  "ETAPA": "priority",
  "DIAS PARADO": "priority",
  "SLA STATUS": "priority",
  "DATA DE RECEBIMENTO": "time",
  "DATA LANÇAMENTO": "time",
  "Nº ORÇAMENTO FINAL": "identity",
  "FORNECEDOR": "identity",
  "SOLICITANTE": "identity"
});

window.V100_DEFAULT_BASE_COLUMNS = V100_DEFAULT_BASE_COLUMNS.slice();

function baseColumnGroupClassV100(column){
  const group = V100_BASE_COLUMN_GROUPS[column];
  if(!group) return "";
  const starts = {
    "ETAPA": " group-start-v100",
    "DATA DE RECEBIMENTO": " group-start-v100",
    "Nº ORÇAMENTO FINAL": " group-start-v100"
  };
  return ` group-${group}-v100${starts[column] || ""}`;
}

function normalizeSnapshotTextV100(value){
  return String(value ?? "").trim();
}

function normalizeSnapshotTermsV100(values){
  const terms = Array.isArray(values)
    ? values.map(normalizeSnapshotTextV100).filter(Boolean)
    : [];
  return Array.from(new Set(terms)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function normalizeSnapshotFiltersV100(filters){
  const normalized = {};
  Object.keys(filters && typeof filters === "object" ? filters : {})
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach(key => {
      const values = normalizeSnapshotTermsV100(filters[key]);
      if(values.length) normalized[String(key)] = values;
    });
  return normalized;
}

function normalizeSnapshotNumberV100(value){
  if(value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeSnapshotDateV100(value){
  const date = normalizeSnapshotTextV100(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function createTableQuerySnapshotV100(query={}){
  const snapshot = {
    search: normalizeSnapshotTextV100(query.search),
    searchScope: normalizeSnapshotTextV100(query.search_scope || "ALL").toUpperCase() || "ALL",
    multiSearchTerms: normalizeSnapshotTermsV100(query.multi_search_terms),
    multiSearchMode: normalizeSnapshotTextV100(query.multi_search_mode || "ANY").toUpperCase() === "ALL" ? "ALL" : "ANY",
    filters: normalizeSnapshotFiltersV100(query.filters),
    dateFrom: normalizeSnapshotDateV100(query.date_from),
    dateTo: normalizeSnapshotDateV100(query.date_to),
    valueMin: normalizeSnapshotNumberV100(query.value_min),
    valueMax: normalizeSnapshotNumberV100(query.value_max),
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || 1))
  };

  snapshot.signature = JSON.stringify({
    search: snapshot.search,
    searchScope: snapshot.searchScope,
    multiSearchTerms: snapshot.multiSearchTerms,
    multiSearchMode: snapshot.multiSearchMode,
    filters: snapshot.filters,
    dateFrom: snapshot.dateFrom,
    dateTo: snapshot.dateTo,
    valueMin: snapshot.valueMin,
    valueMax: snapshot.valueMax
  });

  Object.freeze(snapshot.multiSearchTerms);
  Object.values(snapshot.filters).forEach(Object.freeze);
  Object.freeze(snapshot.filters);
  return Object.freeze(snapshot);
}

function classifyEmptyStateV100(snapshot, total){
  if(Number(total) !== 0) return null;

  const hasSimpleSearch = Boolean(snapshot?.search);
  const hasMultiSearch = Boolean(snapshot?.multiSearchTerms?.length);
  const hasFilters = Boolean(
    Object.keys(snapshot?.filters || {}).length
    || snapshot?.dateFrom
    || snapshot?.dateTo
    || snapshot?.valueMin !== null
    || snapshot?.valueMax !== null
  );

  const activeCategories = [hasSimpleSearch, hasMultiSearch, hasFilters]
    .filter(Boolean).length;

  if(activeCategories === 0) return "BASE_EMPTY";
  if(activeCategories > 1) return "COMBINATION";
  if(hasSimpleSearch) return "SIMPLE_SEARCH";
  if(hasMultiSearch) return "MULTI_SEARCH";
  return "FILTERS";
}

function emptyStateSignatureV100(kind, snapshot, total=0){
  return `${kind}|${snapshot?.signature || ""}|${Number(total || 0)}`;
}

function createEmptyStateDescriptorV100(snapshot, total=0){
  const kind = classifyEmptyStateV100(snapshot, total);
  if(!kind) return null;

  const clearLabel = "Limpar filtros e buscas";

  const descriptors = {
    BASE_EMPTY: {
      kind,
      title: "Nenhum registro disponível",
      description: "A versão publicada foi carregada, mas não contém registros operacionais.",
      action: "reload",
      actionLabel: "Recarregar dados",
      announcement: "Nenhum registro disponível na versão publicada."
    },
    SIMPLE_SEARCH: {
      kind,
      titlePrefix: "Nenhum registro encontrado para “",
      titleSuffix: "”",
      searchTerm: snapshot.search,
      description: "Confira o tipo de busca, revise o valor digitado ou limpe a pesquisa.",
      action: "clear-search",
      actionLabel: "Limpar busca",
      announcement: `Nenhum registro encontrado para ${snapshot.search}.`
    },
    MULTI_SEARCH: {
      kind,
      title: "Nenhum registro corresponde à busca múltipla atual",
      description: "Revise os códigos ou termos informados ou limpe o contexto de pesquisa.",
      action: "clear-context",
      actionLabel: clearLabel,
      announcement: "Nenhum registro corresponde à busca múltipla atual."
    },
    FILTERS: {
      kind,
      title: "Nenhum registro corresponde aos filtros atuais",
      description: "Os dados foram carregados, mas o contexto selecionado não retornou resultados.",
      action: "clear-context",
      actionLabel: clearLabel,
      announcement: "Nenhum registro corresponde aos filtros atuais."
    },
    COMBINATION: {
      kind,
      title: "Nenhum registro corresponde à busca e aos filtros atuais",
      description: "A combinação dos critérios aplicados não retornou resultados.",
      action: "clear-context",
      actionLabel: clearLabel,
      announcement: "Nenhum registro corresponde à busca e aos filtros atuais."
    }
  };

  return Object.freeze({
    ...descriptors[kind],
    searchTerm: snapshot.search,
    signature: emptyStateSignatureV100(kind, snapshot, total)
  });
}

function isBasePanelVisibleV100(){
  const region = $("baseTableRegion");
  return Boolean(state.activeTab === "base" && region && !region.hidden);
}

function commitBaseAnnouncementV100(message, signature){
  const live = $("baseTableStatusLive");
  if(!live || !message || signature === lastAnnouncedEmptySignatureV100) return;

  lastAnnouncedEmptySignatureV100 = signature;
  const token = ++baseAnnouncementTokenV100;
  if(baseAnnouncementTimerV100) clearTimeout(baseAnnouncementTimerV100);

  const write = () => {
    if(token !== baseAnnouncementTokenV100) return;
    live.textContent = message;
  };

  if(live.textContent === message){
    live.textContent = "";
    baseAnnouncementTimerV100 = setTimeout(write, 30);
  }else{
    write();
  }
}

function queueBaseAnnouncementV100(message, signature, querySignature=""){
  const announcement = {message, signature, querySignature};
  if(!isBasePanelVisibleV100()){
    pendingBaseAnnouncementV100 = announcement;
    return;
  }
  pendingBaseAnnouncementV100 = null;
  commitBaseAnnouncementV100(message, signature);
}

function flushPendingBaseAnnouncementV100(){
  if(!isBasePanelVisibleV100() || !pendingBaseAnnouncementV100) return;
  const pending = pendingBaseAnnouncementV100;
  pendingBaseAnnouncementV100 = null;

  const currentSignature = createTableQuerySnapshotV100(tableQuery()).signature;
  if(pending.querySignature && pending.querySignature !== currentSignature) return;

  commitBaseAnnouncementV100(pending.message, pending.signature);
}

function updateTableResultAnnouncementV100(data, snapshot, descriptor){
  const total = Number(data?.total || 0);

  if(descriptor){
    queueBaseAnnouncementV100(
      descriptor.announcement,
      descriptor.signature,
      snapshot?.signature || ""
    );
    lastRenderedTableModeV100 = "empty";
    return;
  }

  pendingBaseAnnouncementV100 = null;
  if(total > 0 && lastRenderedTableModeV100 === "empty"){
    queueBaseAnnouncementV100(
      `${total.toLocaleString("pt-BR")} registro${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}.`,
      `RESULTS|${snapshot?.signature || ""}|${total}`,
      snapshot?.signature || ""
    );
  }
  lastRenderedTableModeV100 = total > 0 ? "content" : "unknown";
}

function clearEmptyStateAnnouncementOnErrorV100(){
  pendingBaseAnnouncementV100 = null;
  lastRenderedTableModeV100 = "error";
  lastAnnouncedEmptySignatureV100 = "";
  baseAnnouncementTokenV100 += 1;
  if(baseAnnouncementTimerV100) clearTimeout(baseAnnouncementTimerV100);
  const live = $("baseTableStatusLive");
  if(live) live.textContent = "";
}

function syncEmptyStateReloadUiV100(active){
  const button = $("emptyStateReloadButton");
  if(!button) return;
  button.disabled = Boolean(active);
  button.setAttribute("aria-disabled", active ? "true" : "false");
  button.textContent = active ? "Recarregando…" : "Recarregar dados";
}

function bindEmptyStateActionV100(button, action){
  button.addEventListener("click", () => {
    let operation = null;
    if(action === "clear-search"){
      operation = window.clearSimpleSearchEmptyStateV100?.();
    }else if(action === "clear-context"){
      operation = window.clearQueryContextEmptyStateV100?.();
    }else if(action === "reload"){
      operation = window.reloadEmptyStateDataV100?.();
    }
    Promise.resolve(operation).catch(error => {
      console.error("Falha na ação do estado vazio:", error);
    });
  });
}

function renderTableEmptyStateV100(tbody, columns, descriptor){
  tbody.textContent = "";

  const row = document.createElement("tr");
  row.className = "table-empty-row-v100";

  const cell = document.createElement("td");
  cell.colSpan = Math.max(1, columns.length + 1);

  const content = document.createElement("div");
  content.className = "table-empty-state-v100";

  const title = document.createElement("strong");
  if(descriptor.kind === "SIMPLE_SEARCH"){
    title.appendChild(document.createTextNode(descriptor.titlePrefix));
    const term = document.createElement("span");
    term.className = "table-empty-search-term-v100";
    term.textContent = descriptor.searchTerm;
    title.appendChild(term);
    title.appendChild(document.createTextNode(descriptor.titleSuffix));
  }else{
    title.textContent = descriptor.title;
  }

  const description = document.createElement("p");
  description.textContent = descriptor.description;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "table-empty-action-v100 no-print";
  button.dataset.emptyAction = descriptor.action;
  button.textContent = descriptor.actionLabel;

  if(descriptor.action === "reload"){
    button.id = "emptyStateReloadButton";
  }else if(descriptor.action === "clear-search"){
    button.id = "emptyStateClearSearchButton";
  }else{
    button.id = "emptyStateClearContextButton";
  }

  bindEmptyStateActionV100(button, descriptor.action);
  content.appendChild(title);
  content.appendChild(description);
  content.appendChild(button);
  cell.appendChild(content);
  row.appendChild(cell);
  tbody.appendChild(row);

  if(descriptor.action === "reload"){
    syncEmptyStateReloadUiV100(window.isEmptyStateReloadActiveV100?.());
  }
}

function syncSearchHelpForEmptyStateV100(descriptor){
  if(descriptor?.kind !== "COMBINATION" || !descriptor.searchTerm) return;
  const help = $("searchHelp");
  if(!help) return;
  help.textContent = "A busca não retornou resultados no contexto atual. Revise a pesquisa ou limpe os critérios aplicados.";
  help.classList.add("no-results");
}


function baseColumnGroupLabelV100(column){
  const group = V100_BASE_COLUMN_GROUPS[column];
  const labels = {
    priority: "Prioridade",
    time: "Tempo",
    identity: "Identificação"
  };
  return labels[group] || "Detalhes";
}

function renderTableHeaderRowsV100(columns, rows){
  const groups = [];
  columns.forEach(column => {
    const label = baseColumnGroupLabelV100(column);
    const last = groups[groups.length - 1];
    if(last && last.label === label){
      last.count += 1;
    }else{
      groups.push({label, count: 1});
    }
  });

  const groupRow = `<tr class="table-group-header-v100">${groups
    .map(group => `<th scope="colgroup" colspan="${group.count}" class="table-group-${group.label === "Prioridade" ? "priority" : group.label === "Tempo" ? "time" : group.label === "Identificação" ? "identity" : "details"}-v100">${escapeHtml(group.label)}</th>`)
    .join("")}</tr>`;

  const columnRow = `<tr class="table-column-header-v100">${columns
    .map((column, index) => renderHeader(column, index))
    .join("")}</tr>`;

  return groupRow + columnRow;
}

async function loadRows(seq=null){
  if(!window.SecurityV994a?.canViewOperationalData()){
    window.renderOperationalAccessDeniedV994a?.();
    return null;
  }
  const requestSeq = seq || ++state.rowsSeq;
  const table = $("dataTable");
  if(!table) return;

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  const query = tableQuery();
  const querySnapshot = createTableQuerySnapshotV100(query);

  try{
    const data = await api("/api/rows", query);

    if(seq && seq !== state.dashboardSeq) return;
    if(!seq && requestSeq !== state.rowsSeq) return;
    if(createTableQuerySnapshotV100(tableQuery()).signature !== querySnapshot.signature) return;

    const rows = Array.isArray(data.rows) ? data.rows : [];
    const total = Number(data.total || 0);
    if(total > 0 && rows.length === 0){
      throw new Error("A página atual não contém registros apesar de o total indicar resultados.");
    }

    state.page = data.page;

    const sourceColumns = Array.isArray(data.columns) ? data.columns : [];
    const defaultColumns = V100_DEFAULT_BASE_COLUMNS
      .filter(column => sourceColumns.includes(column));
    const columns = window.resolveColumnsV99?.(defaultColumns, sourceColumns) || defaultColumns;
    window.__V99_CURRENT_PAGE_ROWS = rows;
    window.__V99_CURRENT_COLUMNS = columns;
    window.__V99_CURRENT_TOTAL = total;

    thead.innerHTML = renderTableHeaderRowsV100(columns, rows);

    let emptyDescriptor = null;
    if(rows.length){
      tbody.innerHTML = rows.map(row =>
        `<tr class="${stageClass(row._ETAPA)}" data-row-id="${escapeAttr(row._ROW_ID || "")}" tabindex="0">` +
        columns.map((column, index) => renderCell(column, row[column], row._ETAPA, row, index)).join("") +
        "</tr>"
      ).join("");
    }else{
      emptyDescriptor = createEmptyStateDescriptorV100(querySnapshot, total);
      renderTableEmptyStateV100(tbody, columns, emptyDescriptor);
    }

    thead.querySelectorAll("th.sortable").forEach(header => {
      header.onclick = () => sortBy(header.dataset.col);
    });
    window.afterTableRenderV99?.({...data, rows}, columns, tbody, thead);

    const counter = $("tableCounter");
    if(counter){
      counter.textContent = total
        ? `${Number(data.from).toLocaleString("pt-BR")}-${Number(data.to).toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} registros`
        : "0 registros no contexto atual";
    }

    if($("pageInfo")) $("pageInfo").textContent = `${data.page}/${data.pages}`;
    if($("prevPage")) $("prevPage").disabled = data.page <= 1;
    if($("nextPage")) $("nextPage").disabled = data.page >= data.pages;

    updateSearchUI(total);
    syncSearchHelpForEmptyStateV100(emptyDescriptor);
    updateFilterUI();
    updateTableResultAnnouncementV100(data, querySnapshot, emptyDescriptor);
    clearDataError();
    window.restoreBaseFocusAfterRenderV100?.();
    return data;
  }catch(error){
    console.error("Erro ao carregar linhas:", error);
    clearEmptyStateAnnouncementOnErrorV100();
    thead.innerHTML = "";
    tbody.innerHTML = `
      <tr class="table-empty-row-v97 table-error-row-v97">
        <td>
          <strong>Não foi possível carregar a Base de Tratativa</strong>
          <span>${escapeHtml(error.message || "Tente novamente.")}</span>
        </td>
      </tr>`;
    if($("tableCounter")) $("tableCounter").textContent = "Falha no carregamento";
    showDataStatus(
      "Base de Tratativa indisponível",
      error.message || "Os dados não puderam ser carregados.",
      "error"
    );
    throw error;
  }
}

window.renderTableHeaderRowsV100 = renderTableHeaderRowsV100;
window.createTableQuerySnapshotV100 = createTableQuerySnapshotV100;
window.classifyEmptyStateV100 = classifyEmptyStateV100;
window.createEmptyStateDescriptorV100 = createEmptyStateDescriptorV100;
window.renderTableEmptyStateV100 = renderTableEmptyStateV100;
window.flushPendingBaseAnnouncementV100 = flushPendingBaseAnnouncementV100;
window.syncEmptyStateReloadUiV100 = syncEmptyStateReloadUiV100;

function headerInfo(col){
  const map = {
    'ETAPA': ['Etapa', 'situação'],
    'DIAS PARADO': ['Dias parado', 'prioridade'],
    'SLA STATUS': ['Atenção', 'tratativa'],
    'DONO DA AÇÃO': ['Depende de', 'responsável'],
    'FAIXA ATRASO': ['Tempo parado', 'faixa'],
    'DATA DE RECEBIMENTO': ['Recebido em', 'entrada no PCM'],
    'DATA LANÇAMENTO': ['Lançado em', 'lançamento no sistema'],
    'Nº ORÇAMENTO FINAL': ['ORC', 'orçamento final'],
    'PREFIXO': ['Prefixo', 'ativo/centro'],
    'EQUIPAMENTO': ['Equipamento', 'descrição'],
    'FORNECEDOR': ['Fornecedor', 'empresa'],
    'VALOR TOTAL': ['Valor total', 'R$'],
    'SOLICITANTE': ['Solicitante', 'responsável'],
    'Nº REQUISIÇÃO': ['Requisição', 'identificador interno'],
    'Nº PEDIDO DE COMPRA': ['Pedido de compra', 'número'],
    'DATA DO PEDIDO': ['Pedido emitido em', 'data'],
    'Nº NFS/DANFE': ['NF / DANFE', 'documento'],
    'DATA LANÇAMENTO NFS': ['NF lançada em', 'data'],
    'Nº ORDEM SERVIÇO': ['OS', 'ordem de serviço']
  };
  return map[col] || [col, ''];
}

function pinnedColumnClassV994a2(index){
  return '';
}

function renderHeader(col, columnIndex=-1){
  const active = state.sortCol === col;
  const directionText = active ? (state.sortDir === 'asc' ? 'crescente' : 'decrescente') : 'sem ordenação';
  const ariaSort = active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
  const [main, sub] = headerInfo(col);
  const pinClass = pinnedColumnClassV994a2(columnIndex);
  const groupClass = baseColumnGroupClassV100(col);
  return `<th class="sortable ${colClass(col)}${pinClass}${groupClass}${active ? ' active-sort' : ''}" data-col="${escapeAttr(col)}" data-column-index="${columnIndex}" aria-sort="${ariaSort}" title="Clique para ordenar por ${escapeAttr(col)} (${directionText})">
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

function renderCell(col, value, etapa, row={}, columnIndex=-1){
  const val = value || '';
  const cls = `${colClass(col)}${pinnedColumnClassV994a2(columnIndex)}${baseColumnGroupClassV100(col)}`;
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
    // V92: a linguagem exibida segue o tempo real parado e a etapa.
    // O SLA do backend continua disponível para ordenação e consistência,
    // mas não é apresentado com rótulos exagerados para poucos dias.
    const slaValue = String(val || '').trim().toUpperCase();
    const etapaNorm = String(etapa || row.ETAPA || '').toUpperCase();
    const dias = parseInt(String(row['DIAS PARADO'] || row._DIAS_PARADO || '0').replace(/[^0-9]/g, ''), 10) || 0;

    let level = 'ok';
    let display = 'Rotina';

    if(slaValue === 'CONCLUÍDO' || slaValue === 'CONCLUIDO' || etapaNorm === 'CONCLUÍDO' || etapaNorm === 'CONCLUIDO'){
      level = 'done';
      display = 'Concluído';
    }else if(dias >= 30){
      level = 'critical';
      display = 'Muito parado';
    }else if(dias >= 16){
      level = 'critical';
      display = 'Prioridade alta';
    }else if(dias >= 8){
      level = 'attention';
      display = 'Acompanhar';
    }else if(etapaNorm === 'SEM LANÇAMENTO' || etapaNorm === 'SEM LANCAMENTO'){
      level = slaValue === 'CRÍTICO' ? 'attention' : 'ok';
      display = 'Conferir lançamento';
    }else if(etapaNorm === 'SEM PEDIDO'){
      level = slaValue === 'CRÍTICO' ? 'attention' : 'ok';
      display = 'Acompanhar pedido';
    }else if(etapaNorm === 'SEM NF'){
      level = slaValue === 'CRÍTICO' ? 'attention' : 'ok';
      display = 'Conferir NF';
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
  loadRowsSafely();
}
