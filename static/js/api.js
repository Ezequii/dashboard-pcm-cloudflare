
const STATIC_DATA_URL = '/static/data/dashboard-data.json?v=78';
let __STATIC_DATA = null;

async function loadStaticData(force=false){
  if(__STATIC_DATA && !force) return __STATIC_DATA;
  const res = await fetch(STATIC_DATA_URL, {cache: force ? 'reload' : 'default'});
  if(!res.ok) throw new Error('Não consegui carregar a base estática do dashboard.');
  __STATIC_DATA = await res.json();
  return __STATIC_DATA;
}

async function api(path, body=null, asBlob=false){
  const db = await loadStaticData(path === '/api/refresh');
  if(path === '/api/bootstrap') return {...db.boot, generated_at: db.generated_at};
  if(path === '/api/refresh') return {ok:true, message:'Dados atualizados', linhas:db.rows.length, arquivo:db.boot?.metadata?.arquivo || 'base estática'};
  if(path === '/api/options') return staticOptions(db.rows, body || {});
  if(path === '/api/dashboard') return staticDashboard(db.rows, body || {});
  if(path === '/api/rows') return staticRows(db.rows, body || {});
  if(path.startsWith('/api/export/')){
    const kind = path.split('/').pop();
    if(kind === 'pdf') throw new Error('PDF não disponível no modo estático. Use Exportar Excel/CSV.');
    const data = staticRows(db.rows, {...(body || {}), page:1, page_size:100000});
    const csv = toCsv(data.columns, data.rows);
    return new Blob([csv], {type:'text/csv;charset=utf-8'});
  }
  if(path === '/api/upload-workbook') throw new Error('Troca de base não existe no Cloudflare Pages. Atualize a planilha no GitHub e faça novo deploy.');
  throw new Error('Rota estática não suportada: ' + path);
}

function baseQuery(){
  return {
    filters: state.filters,
    search: '',
    page: state.page,
    page_size: state.pageSize,
    sort_col: state.sortCol,
    sort_dir: state.sortDir,
    date_from: state.dateFrom || '',
    date_to: state.dateTo || '',
    value_min: state.valueMin !== '' ? Number(state.valueMin) : null,
    value_max: state.valueMax !== '' ? Number(state.valueMax) : null,
  };
}

function tableQuery(){ return {...baseQuery(), search: state.search}; }

function hydrateAdvancedSearch(){
  [['advDateFrom', state.dateFrom], ['advDateTo', state.dateTo], ['advValueMin', state.valueMin], ['advValueMax', state.valueMax]].forEach(([id,value])=>{ const el=$(id); if(el) el.value=value||''; });
}

function exportPdf(){ showToast('PDF não disponível no modo Cloudflare Pages. Use Exportar Excel/CSV.', true); }

async function exportFile(kind){
  try{
    if(kind === 'pdf'){ exportPdf(); return; }
    setLoading(true);
    const blob = await api('/api/export/excel', tableQuery(), true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'controle_rc_filtrado.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('CSV exportado. Abra no Excel.');
  }catch(err){ showToast(err.message, true); }
  finally{ setLoading(false); }
}

async function uploadWorkbook(){ throw new Error('Atualização da base no Cloudflare Pages é via GitHub.'); }

const STAGE_ORDER_STATIC = ['SEM LANÇAMENTO','SEM PEDIDO','SEM NF','CONCLUÍDO'];
const STAGE_COLORS_STATIC = {'SEM LANÇAMENTO':'#D32F2F','SEM PEDIDO':'#F2A900','SEM NF':'#00629E','CONCLUÍDO':'#23A067'};
function normalizeText(v){ return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
function cleanStatic(v){ const s=String(v ?? '').trim(); return ['NAN','NAT','NONE','NULL','N/A'].includes(s.toUpperCase()) ? '' : s; }
function n(v){ const x=Number(v); return Number.isFinite(x) ? x : 0; }
function brInt(v){ return Math.round(n(v)).toLocaleString('pt-BR'); }
function brPct(v){ return `${n(v).toFixed(1).replace('.', ',')}%`; }
function brMoney(v){ return n(v).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }
function compactMoney(v){ const val=n(v), abs=Math.abs(val); if(abs>=1000000) return `R$ ${(val/1000000).toFixed(1).replace('.', ',')} mi`; if(abs>=1000) return `R$ ${(val/1000).toFixed(0).replace('.', ',')} mil`; return brMoney(val); }
function average(arr){ const vals=arr.map(n).filter(x=>Number.isFinite(x)); return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0; }
function uniqueCount(rows, key){ return new Set(rows.map(r=>cleanStatic(r[key])).filter(Boolean)).size; }
function pendingRows(rows){ return rows.filter(r => r.ETAPA !== 'CONCLUÍDO'); }
function stageRows(rows, etapa){ return rows.filter(r => r.ETAPA === etapa); }
function stageSummary(rows, etapa){
  const ss = stageRows(rows, etapa);
  const valor = ss.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const maxDias = Math.max(0, ...ss.map(r=>n(r._DIAS_PARADO)));
  return {qtd:ss.length, valor, maxDias, rows:ss};
}


function applyStaticQuery(rows, query={}){
  let out = rows.slice();
  const filters = query.filters || {};
  for(const [key, values] of Object.entries(filters)){
    const vals = (values || []).filter(v=>String(v).trim());
    if(!vals.length) continue;
    const set = new Set(vals.map(String));
    out = out.filter(r => set.has(String(r[key] ?? '')));
  }
  if(query.search){
    const term = normalizeText(query.search);
    out = out.filter(r => String(r._SEARCH || '').includes(term));
  }
  if(query.date_from) out = out.filter(r => String(r._DATA_RECEBIMENTO_ISO || '') >= String(query.date_from));
  if(query.date_to) out = out.filter(r => String(r._DATA_RECEBIMENTO_ISO || '') <= String(query.date_to));
  if(query.value_min !== null && query.value_min !== undefined) out = out.filter(r => n(r._VALOR_TOTAL) >= n(query.value_min));
  if(query.value_max !== null && query.value_max !== undefined) out = out.filter(r => n(r._VALOR_TOTAL) <= n(query.value_max));
  return sortStaticRows(out, query.sort_col || 'DIAS PARADO', String(query.sort_dir || 'desc').toLowerCase());
}

function sortValue(row, col){
  if(['VALOR TOTAL','VALOR PEÇAS','VALOR SERVIÇO'].includes(col)) return n(col==='VALOR TOTAL'?row._VALOR_TOTAL:(col==='VALOR PEÇAS'?row._VALOR_PECAS:row._VALOR_SERVICO));
  if(['DIAS PARADO','DIAS SEM MOVIMENTO'].includes(col)) return n(row._DIAS_PARADO);
  if(col === 'DATA DE RECEBIMENTO') return row._DATA_RECEBIMENTO_ISO || '';
  if(col === 'DATA LANÇAMENTO') return row._DATA_LANCAMENTO_ISO || '';
  if(col === 'DATA DO PEDIDO') return row._DATA_PEDIDO_ISO || '';
  if(col === 'DATA LANÇAMENTO NFS') return row._DATA_NF_ISO || '';
  return String(row[col] ?? '');
}
function etapaRank(row){
  const ordem = {'SEM LANÇAMENTO':0,'SEM PEDIDO':1,'SEM NF':2,'CONCLUÍDO':3};
  return ordem[String(row.ETAPA || row._ETAPA || '').toUpperCase()] ?? 9;
}
function sortStaticRows(rows, col, dir){
  const desc = dir === 'desc';
  return rows.slice().sort((a,b)=>{
    // A base abre na lógica operacional do PCM: primeiro o que falta lançar, depois acompanhar pedido/NF.
    if(col === 'DIAS PARADO'){
      const etapaCmp = etapaRank(a) - etapaRank(b);
      if(etapaCmp) return etapaCmp;
    }
    const av=sortValue(a,col), bv=sortValue(b,col);
    let cmp = 0;
    if(typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv), 'pt-BR', {numeric:true, sensitivity:'base'});
    return desc ? -cmp : cmp;
  });
}

function staticOptions(rows, query){
  const key=query.filter_key;
  const filterCopy = JSON.parse(JSON.stringify(query.filters || {}));
  filterCopy[key] = [];
  let out = applyStaticQuery(rows, {...query, filters:filterCopy, search:''});
  let opts = Array.from(new Set(out.map(r=>cleanStatic(r[key])).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true,sensitivity:'base'}));
  if(query.option_search){ const term=normalizeText(query.option_search); opts=opts.filter(x=>normalizeText(x).includes(term)); }
  const selected = ((query.filters || {})[key] || []).filter(Boolean);
  const limit = Math.max(10, Math.min(Number(query.limit || 50), 300));
  const ordered = Array.from(new Set([...selected, ...opts.slice(0, limit)]));
  return {options:ordered, total:opts.length};
}

function staticRows(rows, query){
  const out = applyStaticQuery(rows, query);
  const columns = (__STATIC_DATA?.boot?.table_columns || []).filter(Boolean);
  const total = out.length;
  const pageSize = Math.max(10, Math.min(Number(query.page_size || 50), 100000));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number(query.page || 1)), pages);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = out.slice(start, end).map(row => {
    const rec = {};
    columns.forEach(c => rec[c] = row[c] ?? '');
    rec._ETAPA = row._ETAPA || row.ETAPA || '';
    rec._ROW_ID = row._ROW_ID;
    return rec;
  });
  return {columns, rows:pageRows, total, page, page_size:pageSize, pages, from: total ? start+1 : 0, to:end};
}

function groupByStage(rows){
  const total = rows.length || 1;
  const map = new Map();
  rows.forEach(r=>{
    const etapa = cleanStatic(r.ETAPA) || 'NÃO INFORMADO';
    if(!map.has(etapa)) map.set(etapa, {etapa, qtd:0, valor:0, fora_sla:0, criticas:0});
    const item = map.get(etapa);
    item.qtd += 1;
    item.valor += n(r._VALOR_TOTAL);
    if(['ATENÇÃO','CRÍTICO'].includes(r['SLA STATUS'])) item.fora_sla += 1;
    if(r['SLA STATUS'] === 'CRÍTICO') item.criticas += 1;
  });
  const rowsOut = Array.from(map.values()).sort((a,b)=>{
    const ia=STAGE_ORDER_STATIC.indexOf(a.etapa), ib=STAGE_ORDER_STATIC.indexOf(b.etapa);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });
  return rowsOut.map(e=>({
    ...e,
    percentual: e.qtd / total * 100,
    valor_formatado: compactMoney(e.valor),
    valor_completo: brMoney(e.valor),
    percentual_formatado: brPct(e.qtd / total * 100),
    cor: STAGE_COLORS_STATIC[e.etapa] || '#4A4A4A',
    valor_fora_sla: compactMoney(0),
  }));
}
function topSum(rows, groupCol, count=8){
  const map = new Map();
  rows.forEach(r=>{
    const label = cleanStatic(r[groupCol]) || 'NÃO INFORMADO';
    if(!map.has(label)) map.set(label, {label, value:0, qtd:0});
    const item=map.get(label); item.value += n(r._VALOR_TOTAL); item.qtd += 1;
  });
  return Array.from(map.values()).sort((a,b)=>b.value-a.value || b.qtd-a.qtd).slice(0,count).map(x=>({label:String(x.label).slice(0,80), value:x.value, formatted:compactMoney(x.value), full:brMoney(x.value), qtd:x.qtd, meta:`${x.qtd.toLocaleString('pt-BR')} RC${x.qtd!==1?'s':''}`}));
}
function topCount(rows, groupCol, count=8){
  const map = new Map(); rows.forEach(r=>{ const label=cleanStatic(r[groupCol]) || 'NÃO INFORMADO'; map.set(label,(map.get(label)||0)+1); });
  return Array.from(map.entries()).map(([label,value])=>({label:String(label).slice(0,80),value,formatted:brInt(value)})).sort((a,b)=>b.value-a.value).slice(0,count);
}
function oldestPending(rows){
  const pend = pendingRows(rows).sort((a,b)=> n(b._DIAS_PARADO)-n(a._DIAS_PARADO) || n(b._VALOR_TOTAL)-n(a._VALOR_TOTAL));
  if(!pend.length) return {dias:0,label:'Sem pendência',detail:'Tudo concluído',etapa:''};
  const r = pend[0];
  const label = cleanStatic(r['Nº ORÇAMENTO FINAL']) || cleanStatic(r['Nº REQUISIÇÃO']) || 'Sem código';
  const forn = cleanStatic(r.FORNECEDOR) || 'Fornecedor não informado';
  return {dias:n(r._DIAS_PARADO), label, detail:`${forn} · ${r.ETAPA || ''}`, etapa:r.ETAPA || '', fornecedor:forn, valor:compactMoney(r._VALOR_TOTAL), valor_full:brMoney(r._VALOR_TOTAL)};
}
function farolRegional(rows){
  const total = rows.length;
  const concluidas = rows.filter(r=>r.ETAPA === 'CONCLUÍDO').length;
  const pend = pendingRows(rows);
  const totalPend = pend.length;
  const valorPend = pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const pctConcluido = total ? concluidas/total*100 : 0;
  const pctPendente = total ? totalPend/total*100 : 0;
  const semLanc = stageSummary(rows, 'SEM LANÇAMENTO');
  const semPedido = stageSummary(rows, 'SEM PEDIDO');
  const semNf = stageSummary(rows, 'SEM NF');
  const valorAcompanhar = semLanc.valor;
  const maxGeral = Math.max(0, ...pend.map(r=>n(r._DIAS_PARADO)));

  if(!totalPend){
    return {
      status:'BOM',
      label:'100% concluído · sem fila aberta',
      detail:'Tudo lançado, pedido e NF concluídos no filtro atual',
      pct_rcs_fora_sla:0,
      pct_valor_fora_sla:0,
      pct_pendente_total:0,
      maior_atraso_dias:0,
      valor_fora_sla:brMoney(0),
      valor_fora_sla_compacto:compactMoney(0),
      valor_pendente:brMoney(0),
      valor_pendente_compacto:compactMoney(0),
      rcs_fora_sla:0,
      rcs_criticas:0,
      rcs_atrasadas:0,
      rcs_sem_lancamento:0,
      valor_sem_lancamento:brMoney(0),
      valor_sem_lancamento_compacto:compactMoney(0),
      action_hint:'Sem ação pendente'
    };
  }

  // Leitura para liderança: o principal é o % concluído.
  // Dias só pesam forte quando a fila direta do PCM (SEM LANÇAMENTO) está alta ou muito velha.
  const pctSemLanc = total ? semLanc.qtd/total*100 : 0;
  const conclusaoExcelente = pctConcluido >= 92 && semLanc.qtd <= 50;
  const conclusaoBoa = pctConcluido >= 80 && semLanc.qtd <= 130;
  const precisaRevisar = pctConcluido < 70 || semLanc.qtd >= 220 || semLanc.maxDias >= 90;

  let status = 'BOM';
  if(conclusaoExcelente) status = 'EXCELENTE';
  else if(conclusaoBoa) status = 'BOM';
  else if(precisaRevisar) status = 'REVISAR';
  else status = 'ATENÇÃO';

  const label = status === 'EXCELENTE'
    ? `${brPct(pctConcluido)} concluído · fila muito enxuta`
    : status === 'BOM'
      ? `${brPct(pctConcluido)} concluído · rotina sob controle`
      : status === 'ATENÇÃO'
        ? `${brPct(pctConcluido)} concluído · revisar fila PCM`
        : `${brPct(pctConcluido)} concluído · reorganizar lançamentos`;

  const detail = `${brInt(semLanc.qtd)} sem lançamento · ${brInt(semPedido.qtd)} sem pedido · ${brInt(semNf.qtd)} sem NF`;
  const rcsAcompanhar = semLanc.qtd;
  return {
    status,
    label,
    detail,
    pct_concluido:pctConcluido,
    pct_rcs_fora_sla:pctSemLanc,
    pct_valor_fora_sla: valorPend ? valorAcompanhar/valorPend*100 : 0,
    pct_pendente_total:pctPendente,
    pct_criticas: totalPend ? pend.filter(r=>n(r._DIAS_PARADO)>=60).length/totalPend*100 : 0,
    pct_valor_critico:0,
    maior_atraso_dias:maxGeral,
    valor_fora_sla:brMoney(valorAcompanhar),
    valor_fora_sla_compacto:compactMoney(valorAcompanhar),
    valor_pendente:brMoney(valorPend),
    valor_pendente_compacto:compactMoney(valorPend),
    rcs_fora_sla:rcsAcompanhar,
    rcs_criticas:semLanc.rows.filter(r=>n(r._DIAS_PARADO)>=45).length,
    rcs_atrasadas:rcsAcompanhar,
    rcs_sem_lancamento:semLanc.qtd,
    valor_sem_lancamento:brMoney(semLanc.valor),
    valor_sem_lancamento_compacto:compactMoney(semLanc.valor),
    sem_pedido:semPedido.qtd,
    sem_nf:semNf.qtd,
    score:Math.round((100-pctConcluido) + pctSemLanc*3 + Math.min(semLanc.maxDias,90)/3),
    action_hint: status === 'REVISAR' ? 'Reorganizar fila de lançamento' : status === 'ATENÇÃO' ? 'Revisar fila PCM' : 'Manter rotina e acompanhar exceções'
  };
}

function stageActionTitle(etapa){
  if(etapa === 'SEM NF') return 'Cobrar NF';
  if(etapa === 'SEM PEDIDO') return 'Criar pedido';
  if(etapa === 'SEM LANÇAMENTO') return 'Lançar RC';
  return 'Tratar pendência';
}
function stageActionKind(etapa){
  if(etapa === 'SEM NF') return 'nf';
  if(etapa === 'SEM PEDIDO') return 'pedido';
  if(etapa === 'SEM LANÇAMENTO') return 'lancamento';
  return 'acao';
}
function stageOwnerDefault(etapa){
  if(etapa === 'SEM NF') return 'Fornecedor';
  if(etapa === 'SEM PEDIDO') return 'Compras';
  if(etapa === 'SEM LANÇAMENTO') return 'PCM';
  return 'Responsável';
}
function urgencyLabel(days, value, etapa=''){
  const d=n(days), v=n(value);
  if(etapa === 'SEM LANÇAMENTO'){
    if(d >= 30 || v >= 250000) return 'Lançar hoje';
    if(d >= 15 || v >= 100000) return 'Lançar na sequência';
    return 'Lançar na rotina';
  }
  if(d >= 60 || v >= 500000) return 'Entender causa';
  if(d >= 30 || v >= 150000) return 'Acompanhar de perto';
  return 'Monitorar';
}

function priorityRows(rows, count=5){
  const pend = pendingRows(rows);
  if(!pend.length) return [];
  const groups = new Map();
  pend.forEach(r=>{
    const etapa = r.ETAPA || 'PENDÊNCIA';
    const fornecedor = cleanStatic(r.FORNECEDOR) || 'Fornecedor não informado';
    const owner = cleanStatic(r['DONO DA AÇÃO']) || stageOwnerDefault(etapa);
    const key = `${etapa}||${fornecedor}||${owner}`;
    if(!groups.has(key)) groups.set(key, {etapa, fornecedor, owner, qtd:0, valor:0, maxDias:0, codigos:[], rows:[]});
    const g=groups.get(key);
    g.qtd += 1;
    g.valor += n(r._VALOR_TOTAL);
    g.maxDias = Math.max(g.maxDias, n(r._DIAS_PARADO));
    const codigo = cleanStatic(r['Nº ORÇAMENTO FINAL']) || cleanStatic(r['Nº REQUISIÇÃO']) || '';
    if(codigo && g.codigos.length < 3) g.codigos.push(codigo);
    g.rows.push(r);
  });
  const arr = Array.from(groups.values());
  const maxVal = Math.max(1, ...arr.map(g=>g.valor));
  const maxDays = Math.max(1, ...arr.map(g=>g.maxDias));
  const maxQtd = Math.max(1, ...arr.map(g=>g.qtd));
  // O ranking prioriza o que é trabalho direto do PCM: lançamento.
  // Pedido e NF entram como acompanhamento/causa, sem roubar todo o painel.
  const stageWeight={'SEM LANÇAMENTO':1.0,'SEM PEDIDO':0.45,'SEM NF':0.35,'CONCLUÍDO':0};
  return arr.map(g=>{
    const score = 60*(stageWeight[g.etapa] ?? .35) + 20*(g.maxDias/maxDays) + 15*(g.valor/maxVal) + 5*(g.qtd/maxQtd);
    const action = stageActionTitle(g.etapa);
    const urgency = urgencyLabel(g.maxDias, g.valor, g.etapa);
    const codigo = g.codigos[0] || `${g.qtd} RC${g.qtd!==1?'s':''}`;
    return {
      codigo: action,
      fornecedor: g.fornecedor.slice(0,70),
      etapa:g.etapa,
      dias:g.maxDias,
      valor:g.valor,
      valor_fmt:compactMoney(g.valor),
      valor_full:brMoney(g.valor),
      owner_team:g.owner,
      owner_proxy:g.fornecedor,
      sla_status:urgency,
      score,
      row_id:g.rows[0]?._ROW_ID,
      qtd:g.qtd,
      qtd_fmt:`${brInt(g.qtd)} RC${g.qtd!==1?'s':''}`,
      action,
      urgency,
      reason:`${urgency} · ${brInt(g.qtd)} RC${g.qtd!==1?'s':''} · ${brInt(g.maxDias)} dias`,
      codigos:g.codigos.join(', ') || codigo
    };
  }).sort((a,b)=>b.score-a.score || b.valor-a.valor || b.dias-a.dias).slice(0,count);
}
function topPendingByStage(rows, etapa){ const subset=rows.filter(r=>r.ETAPA===etapa); return topSum(subset,'FORNECEDOR',1)[0] || null; }
function executiveActions(rows){
  const actions=[];
  const pend = pendingRows(rows);
  if(!pend.length) return actions;

  const lancamentos = priorityRows(rows.filter(r=>r.ETAPA === 'SEM LANÇAMENTO'), 1)[0];
  if(lancamentos){
    actions.push({
      kind:'lancamento',
      title:'Meu foco',
      main:lancamentos.fornecedor,
      value:lancamentos.action,
      detail:lancamentos.reason,
      etapa:'SEM LANÇAMENTO',
      owner:'PCM'
    });
  }

  const semLanc = stageSummary(rows, 'SEM LANÇAMENTO');
  if(semLanc.qtd){
    actions.push({
      kind:'lancamento',
      title:'Fila PCM',
      main:'Sem lançamento',
      value:`${brInt(semLanc.qtd)} RCs`,
      detail:`${compactMoney(semLanc.valor)} para lançar/conferir`,
      etapa:'SEM LANÇAMENTO',
      owner:'PCM'
    });
  }

  const semPedido = stageSummary(rows, 'SEM PEDIDO');
  if(semPedido.qtd){
    actions.push({
      kind:'pedido',
      title:'Acompanhar',
      main:'Sem pedido',
      value:`${brInt(semPedido.qtd)} RCs`,
      detail:`${compactMoney(semPedido.valor)} aguardando pedido`,
      etapa:'SEM PEDIDO',
      owner:'Compras'
    });
  }

  const semNf = stageSummary(rows, 'SEM NF');
  if(semNf.qtd){
    actions.push({
      kind:'nf',
      title:'Conferir NF',
      main:'Sem NF',
      value:`${brInt(semNf.qtd)} RCs`,
      detail:`${compactMoney(semNf.valor)} aguardando NF`,
      etapa:'SEM NF',
      owner:'Fornecedor'
    });
  }

  const seen = new Set();
  return actions.filter(a=>{
    const key=`${a.title}|${a.main}|${a.etapa}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0,4);
}
function topOwnersCriticos(rows){
  const pend = pendingRows(rows);
  return topSum(pend,'DONO DA AÇÃO',6);
}
function operationalAlerts(rows){
  const etapas = groupByStage(rows).filter(e=>e.etapa!=='CONCLUÍDO').map(e=>({label:e.etapa.replace('NF','NF').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).replace('Nf','NF'),value:brInt(e.qtd),detail:compactMoney(e.valor),full:brMoney(e.valor),tone:e.etapa.toLowerCase().replace(/ /g,'-')}));
  const pend=pendingRows(rows);
  const valorP = pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  return {atencao:etapas,idade_pendencias:['SEM LANÇAMENTO','SEM PEDIDO','SEM NF'].map(etapa=>{ const ss=rows.filter(r=>r.ETAPA===etapa); return {label:etapa.replace('NF','NF').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).replace('Nf','NF'),media:`${average(ss.map(r=>r._DIAS_PARADO)).toFixed(1).replace('.',',')} dias`,maximo:`${Math.max(0,...ss.map(r=>n(r._DIAS_PARADO))).toFixed(1).replace('.',',')} dias`,qtd:ss.length,tone:etapa.toLowerCase().replace(/ /g,'-')}; }),maior_gargalo:{label:'',formatted:''},pendentes:pend.length,valor_pendente:brMoney(valorP),valor_pendente_compacto:compactMoney(valorP)};
}
function executiveComment(rows){
  const pend=pendingRows(rows);
  if(!rows.length) return 'Sem registros para o filtro atual.';
  const total=rows.length;
  const concl=rows.filter(r=>r.ETAPA==='CONCLUÍDO').length;
  const pct=brPct(total?concl/total*100:0);
  if(!pend.length) return '100% concluído no filtro atual. Nada para lançar, acompanhar pedido ou cobrar NF.';
  const semLanc=stageSummary(rows,'SEM LANÇAMENTO');
  const semPedido=stageSummary(rows,'SEM PEDIDO');
  const semNf=stageSummary(rows,'SEM NF');
  const first=priorityRows(rows.filter(r=>r.ETAPA==='SEM LANÇAMENTO'),1)[0];
  const foco = semLanc.qtd
    ? `Foco do PCM: lançar/conferir ${brInt(semLanc.qtd)} RCs (${compactMoney(semLanc.valor)}).`
    : 'Foco do PCM em dia; acompanhar pedido e NF.';
  const start = first ? ` Primeiro foco: ${first.fornecedor} · ${first.reason}.` : '';
  return `${pct} concluído. ${foco} Acompanhamento: ${brInt(semPedido.qtd)} sem pedido e ${brInt(semNf.qtd)} sem NF.${start}`;
}
function monthly(rows){
  const map=new Map(); rows.forEach(r=>{ const iso=r._DATA_RECEBIMENTO_ISO || r._DATA_LANCAMENTO_ISO || r._DATA_PEDIDO_ISO || r._DATA_NF_ISO; if(!iso) return; const key=iso.slice(0,7); map.set(key,(map.get(key)||0)+n(r._VALOR_TOTAL)); });
  const meses={"01":"jan","02":"fev","03":"mar","04":"abr","05":"mai","06":"jun","07":"jul","08":"ago","09":"set","10":"out","11":"nov","12":"dez"};
  return Array.from(map.entries()).sort().map(([label,value])=>({label,label_short:`${meses[label.slice(5,7)]||label.slice(5,7)}/${label.slice(2,4)}`,value,formatted:compactMoney(value),full:brMoney(value)}));
}
function staticDashboard(rows, query){
  const out = applyStaticQuery(rows, query);
  const total=out.length, pend=pendingRows(out), concl=out.filter(r=>r.ETAPA==='CONCLUÍDO');
  const valorTotal=out.reduce((s,r)=>s+n(r._VALOR_TOTAL),0), serv=out.reduce((s,r)=>s+n(r._VALOR_SERVICO),0), pecas=out.reduce((s,r)=>s+n(r._VALOR_PECAS),0), valorPend=pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const farol=farolRegional(out), old=oldestPending(out), etapas=groupByStage(out), owners=topOwnersCriticos(out), top5=priorityRows(out,5);
  const kpis={total_rcs:total,valor_total:brMoney(valorTotal),valor_total_compacto:compactMoney(valorTotal),valor_servicos:brMoney(serv),valor_servicos_compacto:compactMoney(serv),valor_pecas:brMoney(pecas),valor_pecas_compacto:compactMoney(pecas),ticket_medio:brMoney(total?valorTotal/total:0),ticket_medio_compacto:compactMoney(total?valorTotal/total:0),ticket_tempo_dias:`${average(out.map(r=>r._DIAS_PARADO)).toFixed(1).replace('.',',')} dias`,ticket_tempo_dias_valor:average(out.map(r=>r._DIAS_PARADO)),fornecedores:uniqueCount(out,'FORNECEDOR'),equipamentos:uniqueCount(out,'EQUIPAMENTO'),concluidas:concl.length,pendentes:pend.length,pct_concluido:brPct(total?concl.length/total*100:0),pct_pendente:brPct(total?pend.length/total*100:0),valor_pendente:brMoney(valorPend),valor_pendente_compacto:compactMoney(valorPend),valor_fora_sla:farol.valor_fora_sla,valor_fora_sla_compacto:farol.valor_fora_sla_compacto,valor_sem_lancamento:farol.valor_sem_lancamento,valor_sem_lancamento_compacto:farol.valor_sem_lancamento_compacto,rcs_fora_sla:farol.rcs_fora_sla,rcs_sem_lancamento:farol.rcs_sem_lancamento,rcs_criticas:farol.rcs_criticas,farol_status:farol.status,maior_atraso_dias:n(old.dias),maior_atraso_label:old.label,maior_atraso_detail:old.detail};
  return {kpis,etapas,farol,top5_prioridades:top5,comentario_executivo:executiveComment(out),alerts:{...operationalAlerts(out),action_now:executiveActions(out),owners_criticos:owners},charts:{funil:etapas.map(e=>({label:e.etapa,value:e.qtd,formatted:brInt(e.qtd),color:e.cor})),top_fornecedores:topSum(out,'FORNECEDOR'),top_fornecedores_pendentes:topSum(pend,'FORNECEDOR'),top_gargalos:[],solicitantes_pendentes:topSum(pend,'SOLICITANTE'),owners_criticos:owners,custo_solicitante:topSum(out,'SOLICITANTE'),qtd_solicitante:topCount(out,'SOLICITANTE'),qtd_fornecedor:topCount(out,'FORNECEDOR'),mensal:monthly(out),pecas_servicos:[{label:'Serviços',value:serv,formatted:compactMoney(serv),full:brMoney(serv)},{label:'Peças',value:pecas,formatted:compactMoney(pecas),full:brMoney(pecas)}],tempo_medio:[]}};
}
function toCsv(columns, rows){
  const esc=v=>`"${String(v ?? '').replace(/"/g,'""')}"`;
  return '\ufeff' + [columns.map(esc).join(';'), ...rows.map(r=>columns.map(c=>esc(r[c])).join(';'))].join('\n');
}
