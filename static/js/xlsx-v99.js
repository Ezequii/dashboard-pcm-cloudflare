/* ==========================================================================
   V99 — gerador XLSX real, sem dependência externa
   ========================================================================== */
(() => {
  "use strict";

  const encoderV99 = new TextEncoder();

  function xmlEscapeV99(value){
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function sanitizeXmlTextV99(value){
    return String(value ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }

  function columnNameV99(index){
    let value = Number(index) + 1;
    let name = "";
    while(value > 0){
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function crc32TableV99(){
    const table = new Uint32Array(256);
    for(let index = 0; index < 256; index += 1){
      let crc = index;
      for(let bit = 0; bit < 8; bit += 1){
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
      table[index] = crc >>> 0;
    }
    return table;
  }

  const CRC_TABLE_V99 = crc32TableV99();

  function crc32V99(bytes){
    let crc = 0xFFFFFFFF;
    for(const byte of bytes){
      crc = CRC_TABLE_V99[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function concatBytesV99(parts){
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    parts.forEach(part => {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function uint16V99(value){
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
  }

  function uint32V99(value){
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    return bytes;
  }

  function dosDateTimeV99(date = new Date()){
    const year = Math.max(1980, date.getFullYear());
    const time =
      ((date.getHours() & 0x1F) << 11) |
      ((date.getMinutes() & 0x3F) << 5) |
      ((Math.floor(date.getSeconds() / 2)) & 0x1F);
    const day =
      (((year - 1980) & 0x7F) << 9) |
      (((date.getMonth() + 1) & 0x0F) << 5) |
      (date.getDate() & 0x1F);
    return {time, day};
  }

  function createZipV99(files){
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    const timestamp = dosDateTimeV99();

    files.forEach(file => {
      const nameBytes = encoderV99.encode(file.name);
      const dataBytes = file.data instanceof Uint8Array
        ? file.data
        : encoderV99.encode(String(file.data));
      const crc = crc32V99(dataBytes);

      const localHeader = concatBytesV99([
        uint32V99(0x04034B50),
        uint16V99(20),
        uint16V99(0x0800),
        uint16V99(0),
        uint16V99(timestamp.time),
        uint16V99(timestamp.day),
        uint32V99(crc),
        uint32V99(dataBytes.length),
        uint32V99(dataBytes.length),
        uint16V99(nameBytes.length),
        uint16V99(0),
        nameBytes,
      ]);

      localParts.push(localHeader, dataBytes);

      const centralHeader = concatBytesV99([
        uint32V99(0x02014B50),
        uint16V99(20),
        uint16V99(20),
        uint16V99(0x0800),
        uint16V99(0),
        uint16V99(timestamp.time),
        uint16V99(timestamp.day),
        uint32V99(crc),
        uint32V99(dataBytes.length),
        uint32V99(dataBytes.length),
        uint16V99(nameBytes.length),
        uint16V99(0),
        uint16V99(0),
        uint16V99(0),
        uint16V99(0),
        uint32V99(0),
        uint32V99(localOffset),
        nameBytes,
      ]);

      centralParts.push(centralHeader);
      localOffset += localHeader.length + dataBytes.length;
    });

    const centralDirectory = concatBytesV99(centralParts);
    const endRecord = concatBytesV99([
      uint32V99(0x06054B50),
      uint16V99(0),
      uint16V99(0),
      uint16V99(files.length),
      uint16V99(files.length),
      uint32V99(centralDirectory.length),
      uint32V99(localOffset),
      uint16V99(0),
    ]);

    return concatBytesV99([
      ...localParts,
      centralDirectory,
      endRecord,
    ]);
  }

  function numericValueV99(value){
    if(typeof value === "number"){
      return Number.isFinite(value) ? value : null;
    }
    const raw = String(value ?? "").trim();
    if(!raw) return null;
    let clean = raw
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^0-9,.-]/g, "");
    if(clean.includes(",")){
      clean = clean.replace(/\./g, "").replace(",", ".");
    }
    const number = Number(clean);
    return Number.isFinite(number) ? number : null;
  }

  function isCurrencyColumnV99(column){
    return [
      "VALOR TOTAL",
      "VALOR PEÇAS",
      "VALOR SERVIÇO",
      "VALOR UNITÁRIO",
    ].includes(String(column || "").toUpperCase());
  }

  function isIntegerColumnV99(column){
    const normalized = String(column || "").toUpperCase();
    return normalized === "DIAS PARADO" ||
      normalized === "DIAS SEM MOVIMENTO" ||
      normalized === "QUANTIDADE";
  }

  function cellXmlV99(reference, value, styleId=0, type="auto"){
    const safe = sanitizeXmlTextV99(value);
    if(type === "number"){
      const number = numericValueV99(value);
      if(number !== null){
        return `<c r="${reference}" s="${styleId}"><v>${number}</v></c>`;
      }
    }
    return `<c r="${reference}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${xmlEscapeV99(safe)}</t></is></c>`;
  }

  function estimateColumnWidthV99(column, rows){
    const headerLength = String(column || "").length;
    let length = headerLength;
    const sample = rows.slice(0, 250);
    sample.forEach(row => {
      const value = String(row[column] ?? "");
      length = Math.max(length, Math.min(value.length, 45));
    });

    if(isCurrencyColumnV99(column)) return 16;
    if(isIntegerColumnV99(column)) return 12;
    if(/DATA|RECEBIDO|LANÇADO/.test(String(column || "").toUpperCase())) return 14;
    if(/FORNECEDOR|SOLICITANTE|EQUIPAMENTO/.test(String(column || "").toUpperCase())){
      return Math.min(34, Math.max(18, length + 2));
    }
    return Math.min(26, Math.max(10, length + 2));
  }

  function worksheetXmlV99(columns, rows, options={}){
    const headerStyle = 1;
    const currencyStyle = 2;
    const integerStyle = 3;
    const totalStyle = 4;

    const headerCells = columns.map((column, index) =>
      cellXmlV99(`${columnNameV99(index)}1`, column, headerStyle, "text")
    ).join("");

    const bodyRows = rows.map((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const cells = columns.map((column, columnIndex) => {
        const reference = `${columnNameV99(columnIndex)}${excelRow}`;
        const value = row[column] ?? "";
        if(isCurrencyColumnV99(column)){
          return cellXmlV99(reference, value, currencyStyle, "number");
        }
        if(isIntegerColumnV99(column)){
          return cellXmlV99(reference, value, integerStyle, "number");
        }
        return cellXmlV99(reference, value, 0, "text");
      }).join("");
      return `<row r="${excelRow}">${cells}</row>`;
    }).join("");

    const widths = columns.map((column, index) => {
      const width = estimateColumnWidthV99(column, rows);
      const excelIndex = index + 1;
      return `<col min="${excelIndex}" max="${excelIndex}" width="${width}" customWidth="1"/>`;
    }).join("");

    const lastColumn = columnNameV99(Math.max(0, columns.length - 1));
    const lastRow = Math.max(1, rows.length + 1);
    const autoFilter = columns.length
      ? `<autoFilter ref="A1:${lastColumn}${lastRow}"/>`
      : "";

    const totals = options.totalRow && rows.length
      ? `<row r="${rows.length + 2}">
          <c r="A${rows.length + 2}" s="${totalStyle}" t="inlineStr"><is><t>TOTAL</t></is></c>
        </row>`
      : "";

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetViews>
          <sheetView workbookViewId="0">
            <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
          </sheetView>
        </sheetViews>
        <sheetFormatPr defaultRowHeight="15"/>
        <cols>${widths}</cols>
        <sheetData>
          <row r="1" ht="24" customHeight="1">${headerCells}</row>
          ${bodyRows}
          ${totals}
        </sheetData>
        ${autoFilter}
        <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
      </worksheet>`;
  }

  function summaryWorksheetXmlV99(summary){
    const rows = [];
    const add = (label, value, style=0) => rows.push({label, value, style});

    add("DASHBOARD PCM — RESUMO DA EXPORTAÇÃO", "", 5);
    add("Gerado em", new Date().toLocaleString("pt-BR"));
    add("Escopo", summary.scope || "Visão atual");
    add("Classificação", summary.security?.classification || "interno");
    add("Perfil", summary.security?.role || "não verificado");
    add("Versão dos dados", summary.dataVersion || "");
    if(Array.isArray(summary.appliedFilters) && summary.appliedFilters.length){
      add("Filtros aplicados", summary.appliedFilters.join(" · "));
    }
    add("Registros", summary.count || 0, 3);
    add("Valor total", summary.totalValue || 0, 2);
    add("Maior tempo parado", summary.maxDays || 0, 3);
    add("", "");
    add("ETAPAS", "", 5);

    Object.entries(summary.stages || {}).forEach(([stage, item]) => {
      add(stage, `${Number(item.count || 0).toLocaleString("pt-BR")} registros · ${Number(item.value || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"})}`);
    });

    add("", "");
    add("FORNECEDORES PRINCIPAIS", "", 5);
    (summary.topSuppliers || []).forEach((item, index) => {
      add(
        `${index + 1}. ${item.label}`,
        `${Number(item.count || 0).toLocaleString("pt-BR")} registros · ${Number(item.value || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"})}`
      );
    });

    const xmlRows = rows.map((row, index) => {
      const excelRow = index + 1;
      const labelStyle = row.style || (row.label ? 4 : 0);
      const valueIsNumber = typeof row.value === "number";
      return `<row r="${excelRow}"${row.style === 5 ? ' ht="25" customHeight="1"' : ""}>
        ${cellXmlV99(`A${excelRow}`, row.label, labelStyle, "text")}
        ${valueIsNumber
          ? cellXmlV99(`B${excelRow}`, row.value, row.style || 0, "number")
          : cellXmlV99(`B${excelRow}`, row.value, row.style || 0, "text")}
      </row>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetViews>
          <sheetView workbookViewId="0"/>
        </sheetViews>
        <sheetFormatPr defaultRowHeight="17"/>
        <cols>
          <col min="1" max="1" width="34" customWidth="1"/>
          <col min="2" max="2" width="52" customWidth="1"/>
        </cols>
        <sheetData>${xmlRows}</sheetData>
        <pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
      </worksheet>`;
  }

  function stylesXmlV99(){
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <numFmts count="1">
          <numFmt numFmtId="164" formatCode="[$R$-pt-BR] #,##0.00"/>
        </numFmts>
        <fonts count="4">
          <font><sz val="10"/><name val="Aptos"/></font>
          <font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font>
          <font><b/><color rgb="FF0D1B32"/><sz val="10"/><name val="Aptos"/></font>
          <font><b/><color rgb="FFFFFFFF"/><sz val="14"/><name val="Aptos Display"/></font>
        </fonts>
        <fills count="5">
          <fill><patternFill patternType="none"/></fill>
          <fill><patternFill patternType="gray125"/></fill>
          <fill><patternFill patternType="solid"><fgColor rgb="FF0069C9"/><bgColor indexed="64"/></patternFill></fill>
          <fill><patternFill patternType="solid"><fgColor rgb="FFEAF3FF"/><bgColor indexed="64"/></patternFill></fill>
          <fill><patternFill patternType="solid"><fgColor rgb="FF0D1B32"/><bgColor indexed="64"/></patternFill></fill>
        </fills>
        <borders count="2">
          <border><left/><right/><top/><bottom/><diagonal/></border>
          <border>
            <left style="thin"><color rgb="FFDDE5ED"/></left>
            <right style="thin"><color rgb="FFDDE5ED"/></right>
            <top style="thin"><color rgb="FFDDE5ED"/></top>
            <bottom style="thin"><color rgb="FFDDE5ED"/></bottom>
            <diagonal/>
          </border>
        </borders>
        <cellStyleXfs count="1">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
        </cellStyleXfs>
        <cellXfs count="6">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">
            <alignment vertical="center"/>
          </xf>
          <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
            <alignment horizontal="center" vertical="center" wrapText="1"/>
          </xf>
          <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1">
            <alignment horizontal="right" vertical="center"/>
          </xf>
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0">
            <alignment horizontal="right" vertical="center"/>
          </xf>
          <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
          <xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
        </cellXfs>
        <cellStyles count="1">
          <cellStyle name="Normal" xfId="0" builtinId="0"/>
        </cellStyles>
      </styleSheet>`;
  }

  function workbookXmlV99(){
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
        <sheets>
          <sheet name="Registros" sheetId="1" r:id="rId1"/>
          <sheet name="Resumo" sheetId="2" r:id="rId2"/>
        </sheets>
        <calcPr calcId="191029"/>
      </workbook>`;
  }

  function buildXlsxBytesV99(rows, columns, summary={}){
    if(!Array.isArray(rows)){
      throw new TypeError("A exportação precisa receber uma lista de registros.");
    }
    if(!Array.isArray(columns) || !columns.length){
      throw new TypeError("A exportação precisa receber ao menos uma coluna.");
    }

    const created = new Date().toISOString();
    const files = [
      {
        name: "[Content_Types].xml",
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
      },
      {
        name: "_rels/.rels",
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
            <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
            <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
          </Relationships>`,
      },
      {
        name: "docProps/app.xml",
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
            xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
            <Application>Dashboard PCM V99</Application>
            <DocSecurity>0</DocSecurity>
            <ScaleCrop>false</ScaleCrop>
            <HeadingPairs>
              <vt:vector size="2" baseType="variant">
                <vt:variant><vt:lpstr>Planilhas</vt:lpstr></vt:variant>
                <vt:variant><vt:i4>2</vt:i4></vt:variant>
              </vt:vector>
            </HeadingPairs>
            <TitlesOfParts>
              <vt:vector size="2" baseType="lpstr">
                <vt:lpstr>Registros</vt:lpstr>
                <vt:lpstr>Resumo</vt:lpstr>
              </vt:vector>
            </TitlesOfParts>
            <Company>AMAGGI</Company>
          </Properties>`,
      },
      {
        name: "docProps/core.xml",
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <cp:coreProperties
            xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:dcterms="http://purl.org/dc/terms/"
            xmlns:dcmitype="http://purl.org/dc/dcmitype/"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <dc:title>Dashboard PCM — Exportação operacional</dc:title>
            <dc:creator>Ezequiel Caetano</dc:creator>
            <cp:lastModifiedBy>Dashboard PCM V99</cp:lastModifiedBy>
            <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
            <dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
          </cp:coreProperties>`,
      },
      {
        name: "xl/workbook.xml",
        data: workbookXmlV99(),
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
            <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
            <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
          </Relationships>`,
      },
      {
        name: "xl/styles.xml",
        data: stylesXmlV99(),
      },
      {
        name: "xl/worksheets/sheet1.xml",
        data: worksheetXmlV99(columns, rows),
      },
      {
        name: "xl/worksheets/sheet2.xml",
        data: summaryWorksheetXmlV99(summary),
      },
    ];

    return createZipV99(files);
  }

  function sanitizeFilenameV99(value){
    const clean = String(value || "dashboard_pcm")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100);
    return clean.toLowerCase().endsWith(".xlsx")
      ? clean
      : `${clean || "dashboard_pcm"}.xlsx`;
  }

  async function exportOperationalXlsxV99(rows, columns, summary, filename){
    const bytes = buildXlsxBytesV99(rows, columns, summary);
    const blob = new Blob(
      [bytes],
      {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sanitizeFilenameV99(filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return {
      bytes: bytes.length,
      filename: anchor.download,
      rows: rows.length,
      columns: columns.length,
    };
  }

  window.__buildXlsxBytesV99 = buildXlsxBytesV99;
  window.exportOperationalXlsxV99 = exportOperationalXlsxV99;
})();
