'use strict';

const STATIC_DATA_URL = '/static/data/dashboard-data.json';
const VERSION_URL = '/static/data/version.json';
let __STATIC_DATA = null;
let __STATIC_DATA_VERSION = '';
let __LAST_GOOD_DATA = null;

async function getDataVersion(){
  try{
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {'Cache-Control':'no-cache, no-store, must-revalidate'},
    });
    if(!response.ok) return '';
    const payload = await response.json();
    return String(payload.v || '');
  }catch(error){
    console.warn('Arquivo de versão indisponível:', error);
    return '';
  }
}

async function checkForDataUpdates(){
  const version = await getDataVersion();
  if(!version) return false;
  if(!__STATIC_DATA_VERSION){
    __STATIC_DATA_VERSION = version;
    state.dataVersion = version;
    return false;
  }
  return version !== __STATIC_DATA_VERSION;
}

async function loadStaticData(force=false){
  if(__STATIC_DATA && !force) return __STATIC_DATA;
  const prior = __STATIC_DATA || __LAST_GOOD_DATA;
  try{
    const version = await getDataVersion();
    const url = `${STATIC_DATA_URL}?v=${encodeURIComponent(version || Date.now())}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control':'no-cache, no-store, must-revalidate',
        'Pragma':'no-cache',
      },
    });
    if(!response.ok) throw new Error(`Base indisponível (${response.status}).`);
    const payload = await response.json();
    if(!payload || !Array.isArray(payload.rows) || !payload.boot){
      throw new Error('A base retornada não possui a estrutura esperada.');
    }
    __STATIC_DATA = payload;
    __LAST_GOOD_DATA = payload;
    __STATIC_DATA_VERSION = version || String(payload.generated_at || '');
    state.dataVersion = __STATIC_DATA_VERSION;
    state.generatedAt = String(payload.generated_at || '');
    return payload;
  }catch(error){
    console.error('Falha ao carregar a base:', error);
    if(prior){
      __STATIC_DATA = prior;
      showPersistentError('A atualização falhou. O painel manteve a última base válida carregada.');
      return prior;
    }
    throw new Error('Não foi possível carregar a base do dashboard. Verifique se static/data/dashboard-data.json foi publicado.');
  }
}

function resetStaticData(){
  __STATIC_DATA = null;
  cacheClear();
}

async function api(path, body=null){
  const force = path === '/api/refresh';
  const db = await loadStaticData(force);
  const query = body || {};
  if(path === '/api/bootstrap') return {...db.boot, generated_at:db.generated_at, history:db.history || null, quality:db.quality || null};
  if(path === '/api/refresh') return {ok:true, message:'Base recarregada', linhas:db.rows.length, version:state.dataVersion};
  if(path === '/api/options') return staticOptions(db.rows, query);
  if(path === '/api/dashboard') return staticDashboard(db.rows, query, db);
  if(path === '/api/rows') return staticRows(db.rows, query, db);
  if(path === '/api/row') return staticRowDetail(db.rows, query.row_id, db);
  if(path === '/api/export') return staticRows(db.rows, {...query, page:1, page_size:100000}, db);
  throw new Error(`Rota não suportada: ${path}`);
}

function baseQuery(){
  return {
    filters: JSON.parse(JSON.stringify(state.filters || {})),
    date_from: state.dateFrom || '',
    date_to: state.dateTo || '',
    value_min: state.valueMin !== '' ? Number(state.valueMin) : null,
    value_max: state.valueMax !== '' ? Number(state.valueMax) : null,
    age_min: state.ageMin !== '' ? Number(state.ageMin) : null,
    age_max: state.ageMax !== '' ? Number(state.ageMax) : null,
  };
}

function dashboardQuery(){
  return baseQuery();
}

function tableQuery(){
  return {
    ...baseQuery(),
    search: state.search || '',
    search_scope: state.searchScope || 'AUTO',
    page: state.page,
    page_size: state.pageSize,
    sort_col: state.sortCol,
    sort_dir: state.sortDir,
  };
}

function n(value){
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stageName(row){
  return cleanText(row?.ETAPA || row?._ETAPA).toUpperCase();
}

function effectiveOwner(row){
  const stage=stageName(row);
  return cleanText(row?.['DONO DA AÇÃO']) || (stage==='SEM LANÇAMENTO'?'PCM':stage==='SEM PEDIDO'?'Compras':stage==='SEM NF'?'Fornecedor':'Concluído');
}

function isPending(row){
  return stageName(row) !== 'CONCLUÍDO';
}

function effectiveDays(row){
  const etapa = stageName(row);
  let iso = '';
  if(etapa === 'SEM LANÇAMENTO') iso = row._DATA_RECEBIMENTO_ISO;
  else if(etapa === 'SEM PEDIDO') iso = row._DATA_LANCAMENTO_ISO || row._DATA_RECEBIMENTO_ISO;
  else if(etapa === 'SEM NF') iso = row._DATA_PEDIDO_ISO || row._DATA_LANCAMENTO_ISO || row._DATA_RECEBIMENTO_ISO;
  else iso = row._DATA_NF_ISO || row._DATA_PEDIDO_ISO || row._DATA_LANCAMENTO_ISO || row._DATA_RECEBIMENTO_ISO;
  const calculated = daysBetween(iso);
  return calculated || Math.max(0, n(row._DIAS_PARADO ?? row['DIAS PARADO']));
}

function rowValue(row){
  return n(row?._VALOR_TOTAL ?? parseMoney(row?.['VALOR TOTAL']));
}

function average(values){
  const list = values.map(n).filter(Number.isFinite);
  return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 0;
}

function uniqueCount(rows, key){
  return new Set(rows.map(row => cleanText(row[key])).filter(Boolean)).size;
}

function pendingRows(rows){
  return rows.filter(isPending);
}

function stageRows(rows, etapa){
  return rows.filter(row => stageName(row) === etapa);
}

function normalizeSearchValue(value){
  return normalizeText(cleanText(value))
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SEARCH_SCOPE_FIELDS = {
  ALL:['Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA','FORNECEDOR','SOLICITANTE','EQUIPAMENTO','PREFIXO','Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE','ETAPA'],
  REQUISICAO:['Nº REQUISIÇÃO'],
  PEDIDO:['Nº PEDIDO DE COMPRA'],
  FORNECEDOR:['FORNECEDOR'],
  SOLICITANTE:['SOLICITANTE'],
  EQUIPAMENTO:['EQUIPAMENTO','PREFIXO'],
  DOCUMENTO:['Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE'],
};
const SEARCH_CODE_FIELDS = ['Nº REQUISIÇÃO','Nº PEDIDO DE COMPRA','Nº ORÇAMENTO FINAL','Nº ORDEM SERVIÇO','Nº NFS/DANFE','PREFIXO'];

function detectSearchScope(raw){
  const text = String(raw || '').trim();
  if(!text) return 'ALL';
  if(/[,\n;]/.test(text)) return 'ALL';
  const compact = text.replace(/\s+/g, '');
  if(/^\d{4,}$/.test(compact)) return 'ALL';
  return 'ALL';
}

function splitSearchTerms(raw){
  const text = String(raw || '').slice(0, 2000);
  const groups = text
    .split(/[\n,;]+/)
    .map(normalizeSearchValue)
    .filter(Boolean);
  return groups.length ? groups.slice(0, 100) : [];
}

function rowMatchesTerm(row, term, fields){
  const tokens = term.split(' ').filter(Boolean);
  const haystack = fields.map(field => normalizeSearchValue(row[field])).filter(Boolean).join(' ');
  return tokens.every(token => haystack.includes(token));
}

function smartSearchRows(rows, rawSearch, scope='AUTO'){
  const terms = splitSearchTerms(rawSearch);
  if(!terms.length) return rows;
  const resolvedScope = scope === 'AUTO' ? detectSearchScope(rawSearch) : scope;
  const fields = SEARCH_SCOPE_FIELDS[resolvedScope] || SEARCH_SCOPE_FIELDS.ALL;
  const codeFields = resolvedScope === 'ALL' ? SEARCH_CODE_FIELDS : fields.filter(field => SEARCH_CODE_FIELDS.includes(field));
  return rows.filter(row => terms.some(term => {
    const singleCode = !term.includes(' ') && term.length >= 3;
    if(singleCode && codeFields.length){
      const exact = codeFields.some(field => {
        const value = normalizeSearchValue(row[field]);
        return value === term || value.split(' ').includes(term);
      });
      if(exact) return true;
    }
    return rowMatchesTerm(row, term, fields);
  }));
}

function applyStaticQuery(rows, query={}){
  let output = rows.slice();
  const filters = query.filters || {};
  for(const [key, rawValues] of Object.entries(filters)){
    const values = Array.isArray(rawValues) ? rawValues.filter(value => String(value).trim()) : [];
    if(!values.length) continue;
    if(key === 'PENDING_ONLY'){
      output = output.filter(isPending);
      continue;
    }
    if(key === 'CRITICAL_ONLY'){
      output = output.filter(row => isPending(row) && effectiveDays(row) >= BUSINESS_RULES.aging.critical);
      continue;
    }
    if(key === 'EFFECTIVE_OWNER'){
      const selectedOwners = new Set(values.map(String));
      output = output.filter(row => selectedOwners.has(effectiveOwner(row)));
      continue;
    }
    const selected = new Set(values.map(String));
    output = output.filter(row => selected.has(String(row[key] ?? '')));
  }
  if(query.search) output = smartSearchRows(output, query.search, String(query.search_scope || 'AUTO').toUpperCase());
  if(query.date_from){
    const from = parseDateIso(query.date_from);
    if(from) output = output.filter(row => String(row._DATA_RECEBIMENTO_ISO || '') >= from);
  }
  if(query.date_to){
    const to = parseDateIso(query.date_to);
    if(to) output = output.filter(row => String(row._DATA_RECEBIMENTO_ISO || '') <= to);
  }
  if(query.value_min !== null && query.value_min !== undefined && query.value_min !== ''){
    const min = n(query.value_min);
    output = output.filter(row => rowValue(row) >= min);
  }
  if(query.value_max !== null && query.value_max !== undefined && query.value_max !== ''){
    const max = n(query.value_max);
    output = output.filter(row => rowValue(row) <= max);
  }
  if(query.age_min !== null && query.age_min !== undefined && query.age_min !== ''){
    const minAge = n(query.age_min);
    output = output.filter(row => effectiveDays(row) >= minAge);
  }
  if(query.age_max !== null && query.age_max !== undefined && query.age_max !== ''){
    const maxAge = n(query.age_max);
    output = output.filter(row => effectiveDays(row) <= maxAge);
  }
  return output;
}

function sortValue(row, column){
  if(['VALOR TOTAL','VALOR PEÇAS','VALOR SERVIÇO'].includes(column)){
    if(column === 'VALOR TOTAL') return rowValue(row);
    if(column === 'VALOR PEÇAS') return n(row._VALOR_PECAS ?? parseMoney(row[column]));
    return n(row._VALOR_SERVICO ?? parseMoney(row[column]));
  }
  if(column === 'DIAS PARADO') return effectiveDays(row);
  if(column === 'DATA DE RECEBIMENTO') return row._DATA_RECEBIMENTO_ISO || '';
  if(column === 'DATA LANÇAMENTO') return row._DATA_LANCAMENTO_ISO || '';
  if(column === 'DATA DO PEDIDO') return row._DATA_PEDIDO_ISO || '';
  if(column === 'DATA LANÇAMENTO NFS') return row._DATA_NF_ISO || '';
  return String(row[column] ?? '');
}

function sortStaticRows(rows, column='DIAS PARADO', direction='desc'){
  const desc = direction !== 'asc';
  return rows.slice().sort((a, b) => {
    const av = sortValue(a, column);
    const bv = sortValue(b, column);
    let comparison = 0;
    if(typeof av === 'number' && typeof bv === 'number') comparison = av - bv;
    else comparison = String(av).localeCompare(String(bv), 'pt-BR', {numeric:true, sensitivity:'base'});
    if(comparison === 0 && column === 'DIAS PARADO'){
      comparison = rowValue(a) - rowValue(b);
    }
    return desc ? -comparison : comparison;
  });
}

function staticOptions(rows, query={}){
  const key = String(query.filter_key || '').slice(0, 100);
  if(!key) return {options:[], total:0};
  const filterCopy = JSON.parse(JSON.stringify(query.filters || {}));
  filterCopy[key] = [];
  let output = applyStaticQuery(rows, {...query, filters:filterCopy, search:''});
  let options = Array.from(new Set(output.map(row => cleanText(row[key])).filter(Boolean)))
    .sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', {numeric:true, sensitivity:'base'}));
  const term = normalizeText(query.option_search || '');
  if(term) options = options.filter(option => normalizeText(option).includes(term));
  const selected = ((query.filters || {})[key] || []).filter(Boolean);
  const limit = Math.max(20, Math.min(Number(query.limit || 300), 1000));
  return {
    options:Array.from(new Set([...selected, ...options.slice(0, limit)])),
    total:options.length,
  };
}

function displayValue(row, column){
  if(column === 'DIAS PARADO') return `${formatNumber(effectiveDays(row))} dias`;
  if(column === 'VALOR TOTAL') return formatMoney(rowValue(row));
  if(column === 'VALOR PEÇAS') return formatMoney(n(row._VALOR_PECAS ?? parseMoney(row[column])));
  if(column === 'VALOR SERVIÇO') return formatMoney(n(row._VALOR_SERVICO ?? parseMoney(row[column])));
  return row[column] === null || row[column] === undefined ? '' : String(row[column]);
}

function staticRows(rows, query={}, db={}){
  const filtered = applyStaticQuery(rows, query);
  const ordered = sortStaticRows(filtered, query.sort_col || 'DIAS PARADO', query.sort_dir || 'desc');
  const boot = db.boot || __STATIC_DATA?.boot || {};
  const columns = (boot.table_columns || []).filter(Boolean);
  const total = ordered.length;
  const pageSize = Math.max(10, Math.min(Number(query.page_size || 100), 100000));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number(query.page || 1)), pages);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const resultRows = ordered.slice(start, end).map(row => {
    const record = {};
    columns.forEach(column => { record[column] = displayValue(row, column); });
    record._ROW_ID = Number(row._ROW_ID || 0);
    record._ETAPA = stageName(row);
    record._VALOR_TOTAL = rowValue(row);
    record._DIAS_PARADO = effectiveDays(row);
    return record;
  });
  return {columns, rows:resultRows, total, page, page_size:pageSize, pages, from:total ? start+1 : 0, to:end};
}

function staticRowDetail(rows, rowId, db={}){
  const id = Number(rowId || 0);
  const row = rows.find(item => Number(item._ROW_ID || 0) === id);
  if(!row) throw new Error('Registro não encontrado.');
  const columns = (db.boot?.full_table_columns || db.boot?.table_columns || Object.keys(row))
    .filter(column => !String(column).startsWith('_'));
  const data = {};
  columns.forEach(column => { data[column] = displayValue(row, column); });
  return {
    row_id:id,
    data,
    etapa:stageName(row),
    dias:effectiveDays(row),
    valor:rowValue(row),
  };
}

function stageSummary(rows, etapa){
  const subset = stageRows(rows, etapa);
  const days = subset.map(effectiveDays);
  const value = subset.reduce((sum,row) => sum + rowValue(row), 0);
  const critical = subset.filter(row => effectiveDays(row) >= BUSINESS_RULES.aging.critical).length;
  return {
    etapa,
    qtd:subset.length,
    valor:value,
    maxDias:Math.max(0, ...days),
    avgDias:average(days),
    critical,
    rows:subset,
  };
}

function groupByStage(rows){
  const total = rows.length || 1;
  return BUSINESS_RULES.stageOrder.map(etapa => {
    const summary = stageSummary(rows, etapa);
    return {
      etapa,
      qtd:summary.qtd,
      valor:summary.valor,
      valor_formatado:formatMoney(summary.valor, true),
      valor_completo:formatMoney(summary.valor),
      percentual:summary.qtd / total * 100,
      percentual_formatado:formatPercent(summary.qtd / total * 100),
      max_dias:summary.maxDias,
      media_dias:summary.avgDias,
      criticas:summary.critical,
      cor:BUSINESS_RULES.stageColors[etapa],
    };
  });
}

function topSum(rows, groupColumn, count=8){
  const groups = new Map();
  rows.forEach(row => {
    const label = cleanText(row[groupColumn]) || 'NÃO INFORMADO';
    if(!groups.has(label)) groups.set(label, {label, value:0, qtd:0, maxDias:0, pending:0});
    const item = groups.get(label);
    item.value += rowValue(row);
    item.qtd += 1;
    item.maxDias = Math.max(item.maxDias, effectiveDays(row));
    if(isPending(row)) item.pending += 1;
  });
  return Array.from(groups.values())
    .sort((a,b) => b.value-a.value || b.qtd-a.qtd)
    .slice(0,count)
    .map(item => ({
      ...item,
      formatted:formatMoney(item.value, true),
      full:formatMoney(item.value),
      meta:`${formatNumber(item.qtd)} RC${item.qtd === 1 ? '' : 's'}`,
    }));
}

function oldestPending(rows){
  const ordered = pendingRows(rows).sort((a,b) => effectiveDays(b)-effectiveDays(a) || rowValue(b)-rowValue(a));
  if(!ordered.length) return {dias:0, label:'Sem pendência', label_type:'', detail:'Tudo concluído', etapa:''};
  const row = ordered[0];
  const references = [
    ['Nº ORÇAMENTO FINAL','Orçamento'],
    ['Nº REQUISIÇÃO','RC'],
    ['Nº PEDIDO DE COMPRA','Pedido'],
    ['Nº ORDEM SERVIÇO','OS'],
    ['PREFIXO','Prefixo'],
  ];
  let label = '';
  let labelType = '';
  for(const [field,type] of references){
    const value = cleanText(row[field]);
    if(value){ label=value; labelType=type; break; }
  }
  return {
    dias:effectiveDays(row),
    label:label || 'Sem código',
    label_type:labelType || 'Referência',
    detail:`${cleanText(row.FORNECEDOR) || 'Fornecedor não informado'} · ${stageName(row)}`,
    etapa:stageName(row),
    fornecedor:cleanText(row.FORNECEDOR) || 'Fornecedor não informado',
    valor:formatMoney(rowValue(row), true),
    valor_full:formatMoney(rowValue(row)),
    row_id:Number(row._ROW_ID || 0),
  };
}

function priorityRows(rows, count=6){
  const groups = new Map();
  pendingRows(rows).forEach(row => {
    const etapa = stageName(row);
    const fornecedor = cleanText(row.FORNECEDOR) || 'Fornecedor não informado';
    const owner = effectiveOwner(row);
    const key = `${etapa}||${fornecedor}||${owner}`;
    if(!groups.has(key)){
      groups.set(key, {etapa, fornecedor, owner, qtd:0, valor:0, maxDias:0, totalDias:0, rowIds:[], codes:[]});
    }
    const group = groups.get(key);
    group.qtd += 1;
    group.valor += rowValue(row);
    group.maxDias = Math.max(group.maxDias, effectiveDays(row));
    group.totalDias += effectiveDays(row);
    group.rowIds.push(Number(row._ROW_ID || 0));
    const code = cleanText(row['Nº REQUISIÇÃO']) || cleanText(row['Nº ORÇAMENTO FINAL']);
    if(code && group.codes.length < 50) group.codes.push(code);
  });
  const list = Array.from(groups.values());
  if(!list.length) return [];
  const maxValue = Math.max(1, ...list.map(item => item.valor));
  const maxDays = Math.max(1, ...list.map(item => item.maxDias));
  const maxQuantity = Math.max(1, ...list.map(item => item.qtd));
  const w = BUSINESS_RULES.priorityWeights;
  return list.map(group => {
    const score = 100 * (
      w.stage * (BUSINESS_RULES.stageWeights[group.etapa] ?? 0.35) +
      w.age * (group.maxDias / maxDays) +
      w.value * (group.valor / maxValue) +
      w.quantity * (group.qtd / maxQuantity)
    );
    const action = group.etapa === 'SEM LANÇAMENTO'
      ? 'Conferir lançamento'
      : group.etapa === 'SEM PEDIDO'
        ? 'Acompanhar pedido'
        : 'Conferir NF';
    return {
      ...group,
      avgDias:group.qtd ? group.totalDias/group.qtd : 0,
      score,
      action,
      valor_fmt:formatMoney(group.valor, true),
      valor_full:formatMoney(group.valor),
      qtd_fmt:`${formatNumber(group.qtd)} RC${group.qtd === 1 ? '' : 's'}`,
      reason:`${formatNumber(group.qtd)} RC${group.qtd === 1 ? '' : 's'} · máx. ${formatNumber(group.maxDias)} dias`,
      codes:Array.from(new Set(group.codes)),
    };
  }).sort((a,b) => b.score-a.score || b.maxDias-a.maxDias || b.valor-a.valor).slice(0,count);
}

function dataQuality(rows){
  const knownStages = new Set(BUSINESS_RULES.stageOrder);
  const missingSupplier = rows.filter(row => !cleanText(row.FORNECEDOR)).length;
  const missingDate = rows.filter(row => !cleanText(row['DATA DE RECEBIMENTO']) && !row._DATA_RECEBIMENTO_ISO).length;
  const unknownStage = rows.filter(row => !knownStages.has(stageName(row))).length;
  const negativeValue = rows.filter(row => rowValue(row) < 0).length;
  const requestCounts = new Map();
  rows.forEach(row => {
    const code = cleanText(row['Nº REQUISIÇÃO']);
    if(code) requestCounts.set(code, (requestCounts.get(code) || 0) + 1);
  });
  const duplicateRequests = Array.from(requestCounts.values()).filter(count => count > 1).reduce((sum,count) => sum + count, 0);
  const issues = missingSupplier + missingDate + unknownStage + negativeValue;
  const fieldsChecked = Math.max(1, rows.length * 4);
  const score = Math.max(0, 100 - issues / fieldsChecked * 100);
  return {
    score,
    score_fmt:formatPercent(score),
    issues,
    missing_supplier:missingSupplier,
    missing_date:missingDate,
    unknown_stage:unknownStage,
    negative_value:negativeValue,
    duplicate_requests:duplicateRequests,
  };
}

function summarySnapshot(rows){
  const total = rows.length;
  const pending = pendingRows(rows);
  const completed = total - pending.length;
  const semLanc = stageSummary(rows, 'SEM LANÇAMENTO');
  return {
    total,
    pending:pending.length,
    completed,
    completion_percent:total ? completed/total*100 : 0,
    pending_value:pending.reduce((sum,row) => sum + rowValue(row), 0),
    pcm_queue:semLanc.qtd,
    pcm_value:semLanc.valor,
    critical:pending.filter(row => effectiveDays(row) >= BUSINESS_RULES.aging.critical).length,
  };
}

function delta(current, previous){
  if(!previous) return null;
  return {
    pending:current.pending - n(previous.pending),
    completion_percent:current.completion_percent - n(previous.completion_percent),
    pending_value:current.pending_value - n(previous.pending_value),
    pcm_queue:current.pcm_queue - n(previous.pcm_queue),
    critical:current.critical - n(previous.critical),
    compared_at:previous.generated_at || previous.timestamp || '',
  };
}

function hasContext(query={}){
  const filters = query.filters || {};
  return Object.values(filters).some(value => Array.isArray(value) && value.length)
    || Boolean(query.date_from || query.date_to)
    || query.value_min !== null && query.value_min !== undefined
    || query.value_max !== null && query.value_max !== undefined
    || query.age_min !== null && query.age_min !== undefined
    || query.age_max !== null && query.age_max !== undefined;
}

function staticDashboard(rows, query={}, db={}){
  const filtered = applyStaticQuery(rows, query);
  const total = filtered.length;
  const pending = pendingRows(filtered);
  const completed = total - pending.length;
  const valueTotal = filtered.reduce((sum,row) => sum + rowValue(row), 0);
  const valuePending = pending.reduce((sum,row) => sum + rowValue(row), 0);
  const stages = groupByStage(filtered);
  const semLanc = stageSummary(filtered, 'SEM LANÇAMENTO');
  const semPedido = stageSummary(filtered, 'SEM PEDIDO');
  const semNf = stageSummary(filtered, 'SEM NF');
  const oldest = oldestPending(filtered);
  const critical = pending.filter(row => effectiveDays(row) >= BUSINESS_RULES.aging.critical);
  const snapshot = summarySnapshot(filtered);
  const previous = !hasContext(query) ? (db.history?.previous || null) : null;
  const comparison = delta(snapshot, previous);
  const quality = dataQuality(filtered);
  const firstPriority = priorityRows(filtered, 1)[0] || null;
  return {
    kpis:{
      total_rcs:total,
      concluidas:completed,
      pendentes:pending.length,
      pct_concluido:formatPercent(total ? completed/total*100 : 0),
      pct_concluido_value:total ? completed/total*100 : 0,
      valor_total:valueTotal,
      valor_total_fmt:formatMoney(valueTotal),
      valor_total_compacto:formatMoney(valueTotal, true),
      valor_pendente:valuePending,
      valor_pendente_fmt:formatMoney(valuePending),
      valor_pendente_compacto:formatMoney(valuePending, true),
      rcs_sem_lancamento:semLanc.qtd,
      valor_sem_lancamento:semLanc.valor,
      valor_sem_lancamento_fmt:formatMoney(semLanc.valor),
      valor_sem_lancamento_compacto:formatMoney(semLanc.valor, true),
      rcs_criticas:critical.length,
      valor_critico:critical.reduce((sum,row) => sum + rowValue(row), 0),
      maior_atraso_dias:oldest.dias,
      maior_atraso_label:oldest.label,
      maior_atraso_label_tipo:oldest.label_type,
      maior_atraso_detail:oldest.detail,
      maior_atraso_etapa:oldest.etapa,
      maior_atraso_fornecedor:oldest.fornecedor,
      maior_atraso_valor:oldest.valor,
      maior_atraso_valor_full:oldest.valor_full,
      maior_atraso_row_id:oldest.row_id,
      completion_target:BUSINESS_RULES.targets.completionPercent,
      pcm_queue_target:BUSINESS_RULES.targets.maxPcmQueue,
    },
    etapas:stages,
    top_prioridades:priorityRows(filtered, 6),
    executive_summary:{
      completion_percent:total ? completed/total*100 : 0,
      pcm_queue:semLanc.qtd,
      without_order:semPedido.qtd,
      without_invoice:semNf.qtd,
      focus:firstPriority,
    },
    rankings:{
      suppliers_pending:topSum(pending, 'FORNECEDOR', 8),
      suppliers_total:topSum(filtered, 'FORNECEDOR', 8),
      requesters_pending:topSum(pending, 'SOLICITANTE', 8),
      requesters_total:topSum(filtered, 'SOLICITANTE', 8),
    },
    quality,
    comparison,
    history:hasContext(query)?null:(db.history||null),
    context_active:hasContext(query),
  };
}

function sanitizeCsvCell(value){
  const text = String(value ?? '');
  const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}

function toCsv(columns, rows){
  return '\ufeff' + [
    columns.map(sanitizeCsvCell).join(';'),
    ...rows.map(row => columns.map(column => sanitizeCsvCell(row[column])).join(';')),
  ].join('\n');
}
