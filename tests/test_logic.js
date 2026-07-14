'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const memoryStore = () => {
  const data = new Map();
  return {
    getItem:key => data.has(key) ? data.get(key) : null,
    setItem:(key,value) => data.set(key,String(value)),
    removeItem:key => data.delete(key),
    clear:() => data.clear(),
    key:index => [...data.keys()][index] ?? null,
    get length(){ return data.size; },
  };
};

global.__testElements = new Map();
global.document = {getElementById:id => global.__testElements.get(id) || null, createElement:() => ({click(){},remove(){}}), body:{appendChild(){}}};
global.localStorage = memoryStore();
global.sessionStorage = memoryStore();
Object.defineProperty(global,'navigator',{value:{clipboard:{writeText:async()=>{}}},configurable:true});
global.URL = global.URL || class {};
if(!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:test';
if(!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.fetch = async () => { throw new Error('fetch não deve ser usado no teste lógico'); };

const sources = [
  'business-rules.js',
  'state.js',
  'utils.js',
  'api.js',
  'xlsx-export.js',
  'dashboard.js',
].map(name => fs.readFileSync(path.join(ROOT,'static','js',name),'utf8')).join('\n');

const testCode = `
(async()=>{
  const assert=(condition,message)=>{ if(!condition) throw new Error(message); };
  const stages=['SEM LANÇAMENTO','SEM PEDIDO','SEM NF','CONCLUÍDO'];
  const rows=Array.from({length:60},(_,index)=>{
    const etapa=stages[index%4];
    return {
      _ROW_ID:index+1,
      ETAPA:etapa,
      _ETAPA:etapa,
      _DIAS_PARADO:etapa==='CONCLUÍDO'?0:5+(index%35),
      'DIAS PARADO':etapa==='CONCLUÍDO'?0:5+(index%35),
      _VALOR_TOTAL:1000+index*50,
      'VALOR TOTAL':1000+index*50,
      FORNECEDOR:'Fornecedor '+(index%6+1),
      SOLICITANTE:'Solicitante '+(index%5+1),
      'Nº REQUISIÇÃO':'RC-'+String(1000+index),
      'Nº PEDIDO DE COMPRA':etapa==='SEM LANÇAMENTO'||etapa==='SEM PEDIDO'?'':'PC-'+String(2000+index),
      'Nº ORÇAMENTO FINAL':'ORC-'+String(3000+index),
      'Nº NFS/DANFE':etapa==='CONCLUÍDO'?'NF-'+String(4000+index):'',
      'DATA DE RECEBIMENTO':'01/01/2026',
      _DATA_RECEBIMENTO_ISO:'',
      _DATA_LANCAMENTO_ISO:'',
      _DATA_PEDIDO_ISO:'',
      _DATA_NF_ISO:'',
      'DONO DA AÇÃO':etapa==='SEM LANÇAMENTO'?'PCM':etapa==='SEM PEDIDO'?'COMPRAS':etapa==='SEM NF'?'FORNECEDOR':'CONCLUÍDO',
      _SEARCH:'',
    };
  });
  const boot={
    table_columns:['ETAPA','DIAS PARADO','VALOR TOTAL','FORNECEDOR','SOLICITANTE','Nº REQUISIÇÃO'],
    full_table_columns:['ETAPA','DIAS PARADO','VALOR TOTAL','FORNECEDOR','SOLICITANTE','Nº REQUISIÇÃO'],
  };
  const db={boot,rows,history:null,quality:null,generated_at:new Date().toISOString()};
  const dashboard=staticDashboard(rows,{},db);
  assert(dashboard.kpis.total_rcs===60,'Total incorreto');
  assert(dashboard.kpis.pendentes===45,'Pendentes incorretos');
  assert(dashboard.etapas.length===4,'As quatro etapas devem ser retornadas');
  assert(dashboard.top_prioridades.length>0,'Fila prioritária vazia');

  const semLanc=applyStaticQuery(rows,{filters:{ETAPA:['SEM LANÇAMENTO']}});
  assert(semLanc.length===15,'Filtro por etapa incorreto');

  const multi=applyStaticQuery(rows,{filters:{},search:'RC-1001\\nRC-1007',search_scope:'AUTO'});
  assert(multi.length===2,'Busca múltipla incorreta');

  const responsible=effectiveOwner(rows[0]);
  const exact=applyStaticQuery(rows,{filters:{ETAPA:['SEM LANÇAMENTO'],FORNECEDOR:['Fornecedor 1'],EFFECTIVE_OWNER:[responsible]}});
  assert(exact.length>0 && exact.every(item=>item.ETAPA==='SEM LANÇAMENTO'&&item.FORNECEDOR==='Fornecedor 1'),'Contexto exato da prioridade incorreto');

  const page=staticRows(rows,{filters:{},page:1,page_size:20,sort_col:'DIAS PARADO',sort_dir:'desc'},db);
  assert(page.rows.length===20 && page.total===60,'Paginação incorreta');

  const files=createWorkbookFiles(page.columns,page.rows,[
    {label:'Registros exportados',value:page.rows.length},
    {label:'Valor em andamento',value:dashboard.kpis.valor_pendente,money:true},
  ]);
  assert(files['xl/worksheets/sheet1.xml'].includes('Indicador'),'Cabeçalho do resumo ausente');
  const blob=zipStore(files);
  assert(blob.size>1000,'XLSX inválido ou vazio');
  const zipBytes=new Uint8Array(await blob.arrayBuffer());
  assert(zipBytes[0]===0x50&&zipBytes[1]===0x4b,'Assinatura ZIP do XLSX inválida');
  assert(files['xl/workbook.xml'].includes('Resumo')&&files['xl/workbook.xml'].includes('Base'),'Abas do workbook ausentes');

  const historyHost={innerHTML:''};
  const historySubtitle={textContent:''};
  global.__testElements.set('historyPanel',historyHost);
  global.__testElements.set('historySubtitle',historySubtitle);
  renderHistory({
    count:2,
    previous:{generated_at:'2026-07-07T12:00:00Z'},
    recent:[
      {generated_at:'2026-07-14T12:00:00Z',pending:45,pending_value:100000},
      {generated_at:'2026-07-07T12:00:00Z',pending:50,pending_value:120000},
    ],
    movements:{entered:4,resolved:9,net:-5,pending_value_change:-20000},
  },null);
  assert(historyHost.innerHTML.includes('Resolvidas'),'Painel histórico não renderizado');
  assert(historyHost.innerHTML.includes('Pendências por atualização'),'Tendência histórica ausente');

  console.log(JSON.stringify({
    total:dashboard.kpis.total_rcs,
    pending:dashboard.kpis.pendentes,
    stages:dashboard.etapas.length,
    priorities:dashboard.top_prioridades.length,
    multiSearch:multi.length,
    xlsxBytes:blob.size,
  }));
})().catch(error=>{ console.error(error.stack||error); process.exitCode=1; });
`;

require('vm').runInThisContext(`${sources}\n${testCode}`, {filename:'v100-logic-bundle.js'});
