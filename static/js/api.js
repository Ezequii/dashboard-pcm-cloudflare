
const STATIC_DATA_URL = '/static/data/dashboard-data.json?v=72';
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
  if(path === '/api/bootstrap') return db.boot;
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
function sortStaticRows(rows, col, dir){
  const desc = dir === 'desc';
  return rows.slice().sort((a,b)=>{
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
  const pend = pendingRows(rows);
  const totalPend = pend.length;
  const valorPend = pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const pctPendTotal = total ? totalPend/total*100 : 0;
  if(!totalPend) return {status:'OK',label:'Sem pendência aberta',detail:'Tudo concluído no filtro atual',pct_rcs_fora_sla:0,pct_valor_fora_sla:0,pct_pendente_total:0,maior_atraso_dias:0,valor_fora_sla:brMoney(0),valor_fora_sla_compacto:compactMoney(0),rcs_fora_sla:0,rcs_criticas:0};
  const vencidas = pend.filter(r=>['ATENÇÃO','CRÍTICO'].includes(r['SLA STATUS']));
  const criticas = pend.filter(r=>r['SLA STATUS']==='CRÍTICO');
  const valorVencido = vencidas.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const valorCritico = criticas.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  const pctRcs = totalPend ? vencidas.length/totalPend*100 : 0;
  const pctValor = valorPend ? valorVencido/valorPend*100 : 0;
  const pctCrit = totalPend ? criticas.length/totalPend*100 : 0;
  const pctValCrit = valorPend ? valorCritico/valorPend*100 : 0;
  const maior = Math.max(0, ...pend.map(r=>n(r._DIAS_PARADO)));
  let status = 'OK';
  if(pctPendTotal >= 25 || maior >= 120 || valorPend >= 5000000 || totalPend >= 600) status='CRÍTICO';
  else if(pctPendTotal >= 7 || pctRcs >= 20 || pctValor >= 15 || criticas.length > 0 || maior >= 30 || valorPend >= 1000000) status='ATENÇÃO';
  return {status,label:`${brPct(pctPendTotal)} pendente · ${brPct(pctRcs)} fora SLA`,detail:`${compactMoney(valorPend)} pendente · maior atraso ${brInt(maior)} dias`,pct_rcs_fora_sla:pctRcs,pct_valor_fora_sla:pctValor,pct_pendente_total:pctPendTotal,pct_criticas:pctCrit,pct_valor_critico:pctValCrit,maior_atraso_dias:maior,valor_fora_sla:brMoney(valorVencido),valor_fora_sla_compacto:compactMoney(valorVencido),valor_pendente:brMoney(valorPend),valor_pendente_compacto:compactMoney(valorPend),rcs_fora_sla:vencidas.length,rcs_criticas:criticas.length};
}
function priorityRows(rows, count=5){
  const pend = pendingRows(rows);
  if(!pend.length) return [];
  const maxVal = Math.max(1, ...pend.map(r=>n(r._VALOR_TOTAL)));
  const maxDays = Math.max(1, ...pend.map(r=>n(r._DIAS_PARADO)));
  const stageWeight={'SEM NF':1.0,'SEM PEDIDO':0.85,'SEM LANÇAMENTO':0.70,'CONCLUÍDO':0};
  const slaWeight={'CRÍTICO':1,'ATENÇÃO':0.5};
  return pend.map(r=>{
    const score=0.40*(n(r._VALOR_TOTAL)/maxVal)+0.30*(n(r._DIAS_PARADO)/maxDays)+0.20*(stageWeight[r.ETAPA]??0.5)+0.10*(slaWeight[r['SLA STATUS']]??0);
    return {codigo:cleanStatic(r['Nº ORÇAMENTO FINAL'])||cleanStatic(r['Nº REQUISIÇÃO'])||`Linha ${r._ROW_ID}`,fornecedor:(cleanStatic(r.FORNECEDOR)||'Fornecedor não informado').slice(0,70),etapa:r.ETAPA||'',dias:n(r._DIAS_PARADO),valor:n(r._VALOR_TOTAL),valor_fmt:compactMoney(r._VALOR_TOTAL),valor_full:brMoney(r._VALOR_TOTAL),owner_team:cleanStatic(r['DONO DA AÇÃO'])||'Não especificado',owner_proxy:cleanStatic(r.SOLICITANTE)||cleanStatic(r.FORNECEDOR)||'Não especificado',sla_status:r['SLA STATUS']||'OK',score,row_id:r._ROW_ID};
  }).sort((a,b)=>b.score-a.score || b.dias-a.dias || b.valor-a.valor).slice(0,count);
}
function topPendingByStage(rows, etapa){ const subset=rows.filter(r=>r.ETAPA===etapa); return topSum(subset,'FORNECEDOR',1)[0] || null; }
function executiveActions(rows){
  const actions=[];
  const nfTop=topPendingByStage(rows,'SEM NF'); if(nfTop) actions.push({kind:'nf',title:'Cobrar NF',main:nfTop.label,value:nfTop.formatted,detail:nfTop.meta,etapa:'SEM NF',fornecedor:nfTop.label,owner:'Fornecedor'});
  [['SEM PEDIDO','Criar pedido','pedido','Compras'],['SEM LANÇAMENTO','Lançar RC','lancamento','PCM']].forEach(([etapa,title,kind,owner])=>{ const subset=rows.filter(r=>r.ETAPA===etapa); if(subset.length){ const valor=subset.reduce((s,r)=>s+n(r._VALOR_TOTAL),0); actions.push({kind,title,main:`${brInt(subset.length)} RC${subset.length!==1?'s':''}`,value:compactMoney(valor),detail:etapa,etapa,owner}); } });
  const old=oldestPending(rows); if(n(old.dias)>0) actions.push({kind:'old',title:'Mais antiga',main:old.label,value:`${brInt(old.dias)} dias`,detail:old.detail,etapa:old.etapa,owner:'Etapa'});
  return actions;
}
function topOwnersCriticos(rows){
  const pend = pendingRows(rows);
  let subset = pend.filter(r=>['ATENÇÃO','CRÍTICO'].includes(r['SLA STATUS']));
  if(!subset.length) subset = pend;
  return topSum(subset,'DONO DA AÇÃO',6);
}
function operationalAlerts(rows){
  const etapas = groupByStage(rows).filter(e=>e.etapa!=='CONCLUÍDO').map(e=>({label:e.etapa.replace('NF','NF').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).replace('Nf','NF'),value:brInt(e.qtd),detail:compactMoney(e.valor),full:brMoney(e.valor),tone:e.etapa.toLowerCase().replace(/ /g,'-')}));
  const pend=pendingRows(rows);
  const valorP = pend.reduce((s,r)=>s+n(r._VALOR_TOTAL),0);
  return {atencao:etapas,idade_pendencias:['SEM LANÇAMENTO','SEM PEDIDO','SEM NF'].map(etapa=>{ const ss=rows.filter(r=>r.ETAPA===etapa); return {label:etapa.replace('NF','NF').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).replace('Nf','NF'),media:`${average(ss.map(r=>r._DIAS_PARADO)).toFixed(1).replace('.',',')} dias`,maximo:`${Math.max(0,...ss.map(r=>n(r._DIAS_PARADO))).toFixed(1).replace('.',',')} dias`,qtd:ss.length,tone:etapa.toLowerCase().replace(/ /g,'-')}; }),maior_gargalo:{label:'',formatted:''},pendentes:pend.length,valor_pendente:brMoney(valorP),valor_pendente_compacto:compactMoney(valorP)};
}
function executiveComment(rows){
  const pend=pendingRows(rows); if(!rows.length) return 'Sem registros para o filtro atual.'; if(!pend.length) return 'Tudo concluído no filtro atual. Não há pendências abertas para tratativa.';
  const etapas=groupByStage(rows).filter(e=>e.etapa!=='CONCLUÍDO').sort((a,b)=>b.qtd-a.qtd); const top=etapas[0]; const old=oldestPending(rows); const pri=priorityRows(rows,1)[0];
  return `Maior gargalo: ${top?.etapa || 'pendência'} — ${brInt(top?.qtd || 0)} RCs. Mais antiga: ${old.label}, ${brInt(old.dias)} dias parado. Prioridade: ${pri?.codigo || old.label} · ${pri?.fornecedor || old.fornecedor || ''} · Dono: ${pri?.owner_team || 'Não especificado'}`;
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
  const kpis={total_rcs:total,valor_total:brMoney(valorTotal),valor_total_compacto:compactMoney(valorTotal),valor_servicos:brMoney(serv),valor_servicos_compacto:compactMoney(serv),valor_pecas:brMoney(pecas),valor_pecas_compacto:compactMoney(pecas),ticket_medio:brMoney(total?valorTotal/total:0),ticket_medio_compacto:compactMoney(total?valorTotal/total:0),ticket_tempo_dias:`${average(out.map(r=>r._DIAS_PARADO)).toFixed(1).replace('.',',')} dias`,ticket_tempo_dias_valor:average(out.map(r=>r._DIAS_PARADO)),fornecedores:uniqueCount(out,'FORNECEDOR'),equipamentos:uniqueCount(out,'EQUIPAMENTO'),concluidas:concl.length,pendentes:pend.length,pct_concluido:brPct(total?concl.length/total*100:0),pct_pendente:brPct(total?pend.length/total*100:0),valor_pendente:brMoney(valorPend),valor_pendente_compacto:compactMoney(valorPend),valor_fora_sla:farol.valor_fora_sla,valor_fora_sla_compacto:farol.valor_fora_sla_compacto,rcs_fora_sla:farol.rcs_fora_sla,rcs_criticas:farol.rcs_criticas,farol_status:farol.status,maior_atraso_dias:n(old.dias),maior_atraso_label:old.label,maior_atraso_detail:old.detail};
  return {kpis,etapas,farol,top5_prioridades:top5,comentario_executivo:executiveComment(out),alerts:{...operationalAlerts(out),action_now:executiveActions(out),owners_criticos:owners},charts:{funil:etapas.map(e=>({label:e.etapa,value:e.qtd,formatted:brInt(e.qtd),color:e.cor})),top_fornecedores:topSum(out,'FORNECEDOR'),top_fornecedores_pendentes:topSum(pend,'FORNECEDOR'),top_gargalos:[],solicitantes_pendentes:topSum(pend,'SOLICITANTE'),owners_criticos:owners,custo_solicitante:topSum(out,'SOLICITANTE'),qtd_solicitante:topCount(out,'SOLICITANTE'),qtd_fornecedor:topCount(out,'FORNECEDOR'),mensal:monthly(out),pecas_servicos:[{label:'Serviços',value:serv,formatted:compactMoney(serv),full:brMoney(serv)},{label:'Peças',value:pecas,formatted:compactMoney(pecas),full:brMoney(pecas)}],tempo_medio:[]}};
}
function toCsv(columns, rows){
  const esc=v=>`"${String(v ?? '').replace(/"/g,'""')}"`;
  return '\ufeff' + [columns.map(esc).join(';'), ...rows.map(r=>columns.map(c=>esc(r[c])).join(';'))].join('\n');
}
