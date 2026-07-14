'use strict';

const XLSX_MONEY_COLUMNS = new Set(['VALOR TOTAL','VALOR PEÇAS','VALOR SERVIÇO']);
const XLSX_NUMBER_COLUMNS = new Set(['DIAS PARADO']);

function xmlEscape(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&apos;');
}

function excelColumnName(index){
  let number = index + 1;
  let name = '';
  while(number > 0){
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function xlsxCell(ref, value, style=0, type='inlineStr'){
  if(type === 'n'){
    return `<c r="${ref}" s="${style}" t="n"><v>${Number(value || 0)}</v></c>`;
  }
  const safe = xmlEscape(String(value ?? ''));
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${safe}</t></is></c>`;
}

function buildSummarySheet(summaryRows){
  const rows = [];
  rows.push(`<row r="1" ht="28"><c r="A1" s="4" t="inlineStr"><is><t>Dashboard PCM — Resumo da exportação</t></is></c></row>`);
  summaryRows.forEach((item, index) => {
    const rowNumber = index + 3;
    const valueType = typeof item.value === 'number' ? 'n' : 'inlineStr';
    const valueStyle = item.money ? 2 : item.percent ? 5 : 0;
    rows.push(`<row r="${rowNumber}">${xlsxCell(`A${rowNumber}`, item.label, 1)}${xlsxCell(`B${rowNumber}`, item.value, valueStyle, valueType)}</row>`);
  });
  const last = Math.max(3, summaryRows.length + 2);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/></cols>
  <sheetData>${rows.join('')}</sheetData>
  <autoFilter ref="A2:B${last}"/>
</worksheet>`;
}

function buildBaseSheet(columns, rows){
  const header = columns.map((column,index) => xlsxCell(`${excelColumnName(index)}1`, column, 1)).join('');
  const xmlRows = [`<row r="1" ht="24">${header}</row>`];
  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const cells = columns.map((column, columnIndex) => {
      const ref = `${excelColumnName(columnIndex)}${rowNumber}`;
      const raw = row[column] ?? '';
      if(XLSX_MONEY_COLUMNS.has(column)){
        return xlsxCell(ref, parseMoney(raw), 2, 'n');
      }
      if(XLSX_NUMBER_COLUMNS.has(column)){
        const number = Number(String(raw).replace(/[^0-9-]/g,'')) || 0;
        return xlsxCell(ref, number, 3, 'n');
      }
      return xlsxCell(ref, protectSpreadsheetText(raw), 0);
    }).join('');
    xmlRows.push(`<row r="${rowNumber}">${cells}</row>`);
  });
  const lastColumn = excelColumnName(Math.max(0, columns.length - 1));
  const lastRow = Math.max(1, rows.length + 1);
  const widths = columns.map((column,index) => {
    const preferred = ['FORNECEDOR','SOLICITANTE','EQUIPAMENTO'].includes(column) ? 28
      : column.includes('DATA') ? 14
      : column.includes('VALOR') ? 17
      : column.includes('Nº') ? 18
      : column === 'ETAPA' ? 18
      : 16;
    return `<col min="${index+1}" max="${index+1}" width="${preferred}" customWidth="1"/>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${widths}</cols>
  <sheetData>${xmlRows.join('')}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
</worksheet>`;
}

function protectSpreadsheetText(value){
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function createWorkbookFiles(columns, rows, summaryRows){
  const created = new Date().toISOString();
  return {
    '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    'docProps/core.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Dashboard PCM — Exportação</dc:title><dc:creator>Dashboard PCM V100</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
</cp:coreProperties>`,
    'docProps/app.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Dashboard PCM V100</Application><AppVersion>100.0</AppVersion>
</Properties>`,
    'xl/workbook.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="22000" windowHeight="12000"/></bookViews>
  <sheets><sheet name="Resumo" sheetId="1" r:id="rId1"/><sheet name="Base" sheetId="2" r:id="rId2"/></sheets>
</workbook>`,
    'xl/_rels/workbook.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    'xl/styles.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="R$ #,##0.00"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>
  <fonts count="3">
    <font><sz val="10"/><name val="Aptos"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font>
    <font><b/><color rgb="FF17324D"/><sz val="15"/><name val="Aptos Display"/></font>
  </fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17324D"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border/><border><bottom style="thin"><color rgb="FFD8E0E8"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    'xl/worksheets/sheet1.xml':buildSummarySheet(summaryRows),
    'xl/worksheets/sheet2.xml':buildBaseSheet(columns, rows),
  };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for(let i=0;i<256;i++){
    let crc=i;
    for(let j=0;j<8;j++) crc=(crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    table[i]=crc>>>0;
  }
  return table;
})();

function crc32(bytes){
  let crc=0xFFFFFFFF;
  for(const byte of bytes) crc=CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function u16(value){
  return new Uint8Array([value & 255, (value >>> 8) & 255]);
}

function u32(value){
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}

function concatBytes(parts){
  const length=parts.reduce((sum,part)=>sum+part.length,0);
  const output=new Uint8Array(length);
  let offset=0;
  parts.forEach(part=>{ output.set(part,offset); offset+=part.length; });
  return output;
}

function dosDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(Math.floor(date.getSeconds()/2));
  const day=(year-1980)<<9|(date.getMonth()+1)<<5|date.getDate();
  return {time,day};
}

function zipStore(files){
  const encoder=new TextEncoder();
  const locals=[];
  const centrals=[];
  let offset=0;
  const {time,day}=dosDateTime();
  for(const [name,content] of Object.entries(files)){
    const nameBytes=encoder.encode(name);
    const dataBytes=encoder.encode(content);
    const crc=crc32(dataBytes);
    const local=concatBytes([
      u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(time),u16(day),
      u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),
      nameBytes,dataBytes,
    ]);
    locals.push(local);
    const central=concatBytes([
      u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(time),u16(day),
      u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),u16(0),
      u16(0),u16(0),u32(0),u32(offset),nameBytes,
    ]);
    centrals.push(central);
    offset+=local.length;
  }
  const centralBlock=concatBytes(centrals);
  const localBlock=concatBytes(locals);
  const end=concatBytes([
    u32(0x06054b50),u16(0),u16(0),u16(centrals.length),u16(centrals.length),
    u32(centralBlock.length),u32(localBlock.length),u16(0),
  ]);
  return new Blob([localBlock,centralBlock,end], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function activeFilterSummary(){
  const items=[];
  Object.entries(state.filters || {}).forEach(([key,values])=>{
    if(!Array.isArray(values) || !values.length) return;
    items.push(`${getFilterLabel(key)}: ${values.join(', ')}`);
  });
  if(state.dateFrom || state.dateTo) items.push(`Período: ${state.dateFrom || 'início'} a ${state.dateTo || 'hoje'}`);
  if(state.valueMin !== '' || state.valueMax !== '') items.push(`Valor: ${state.valueMin || '0'} a ${state.valueMax || 'sem limite'}`);
  if(state.ageMin !== '' || state.ageMax !== '') items.push(`Dias: ${state.ageMin || '0'} a ${state.ageMax || 'sem limite'}`);
  if(state.search) items.push(`Busca: ${state.search.replace(/\n/g, ', ')}`);
  return items;
}

function buildExportSummary(data, rowCount){
  const dashboard=state.currentDashboard || {};
  const kpis=dashboard.kpis || {};
  const rows=[
    {label:'Gerado em', value:new Date().toLocaleString('pt-BR')},
    {label:'Registros exportados', value:rowCount},
    {label:'Filtros aplicados', value:activeFilterSummary().join(' · ') || 'Nenhum'},
  ];
  if(kpis.total_rcs !== undefined){
    rows.push(
      {label:'RCs no contexto', value:Number(kpis.total_rcs || 0)},
      {label:'RCs em andamento', value:Number(kpis.pendentes || 0)},
      {label:'Conclusão', value:Number(kpis.pct_concluido_value || 0)/100, percent:true},
      {label:'Valor em andamento', value:Number(kpis.valor_pendente || 0), money:true},
      {label:'Pendências críticas', value:Number(kpis.rcs_criticas || 0)},
    );
  }
  return rows;
}

async function exportXlsx(mode='current'){
  setBusy(true);
  try{
    let query=tableQuery();
    let data;
    if(mode === 'selected'){
      if(!state.selectedRowIds.size) throw new Error('Selecione pelo menos um registro para exportar.');
      const db=await loadStaticData();
      const selected=db.rows.filter(row => state.selectedRowIds.has(Number(row._ROW_ID || 0)));
      data=staticRows(selected, {...query,filters:{},search:'',page:1,page_size:100000}, db);
    }else{
      data=await api('/api/export', query);
    }
    const columns=(state.visibleColumns.length ? state.visibleColumns : data.columns).filter(column => data.columns.includes(column));
    const summary=buildExportSummary(data, data.rows.length);
    const files=createWorkbookFiles(columns,data.rows,summary);
    const blob=zipStore(files);
    const context=activeFilterSummary()[0] || (mode === 'selected' ? 'selecionados' : 'visao_atual');
    const date=new Date().toISOString().slice(0,10);
    downloadBlob(blob,`PCM_${safeFilename(context)}_${date}.xlsx`);
    showToast(`Excel gerado com ${formatNumber(data.rows.length)} registros.`);
  }catch(error){
    showToast(error.message, true);
  }finally{
    setBusy(false);
  }
}

async function exportCsv(){
  setBusy(true);
  try{
    const data=await api('/api/export', tableQuery());
    const columns=(state.visibleColumns.length ? state.visibleColumns : data.columns).filter(column => data.columns.includes(column));
    const csv=toCsv(columns,data.rows);
    downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`PCM_visao_atual_${new Date().toISOString().slice(0,10)}.csv`);
    showToast(`CSV gerado com ${formatNumber(data.rows.length)} registros.`);
  }catch(error){
    showToast(error.message,true);
  }finally{
    setBusy(false);
  }
}
