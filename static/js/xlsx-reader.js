
(() => {
  "use strict";

  const MAIN_SHEET = "Acompanhamento RC 2026";
  const EQUIPMENT_SHEET = "Base Equipamento";
  const MAX_FILE_SIZE = 30 * 1024 * 1024;
  const decoder = new TextDecoder("utf-8");

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function normalizeKey(value) {
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[º°]/g, "N")
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();
  }

  function numberValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const raw = text(value);
    if (!raw || raw === "*") return 0;
    const normalized = raw
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function excelDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const utc = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
      return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
    }
    const raw = text(value);
    if (!raw || raw === "*") return null;
    const match = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (!match) return null;
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dayDiff(start, end) {
    if (!start || !end) return null;
    const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  function findEocd(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const min = Math.max(0, bytes.length - 65557);
    for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) return offset;
    }
    throw new Error("Arquivo XLSX inválido: diretório ZIP não encontrado.");
  }

  function readZipDirectory(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = findEocd(bytes);
    const count = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const entries = new Map();

    for (let i = 0; i < count; i += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        throw new Error("Arquivo XLSX inválido: entrada ZIP inconsistente.");
      }
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      entries.set(name, { method, compressedSize, uncompressedSize, localOffset });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  async function inflateRaw(data) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Seu navegador não oferece descompressão ZIP nativa. Use uma versão atual do Chrome, Edge ou Firefox.");
    }
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzipEntry(bytes, entry) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const offset = entry.localOffset;
    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error("Cabeçalho ZIP local inválido.");
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const start = offset + 30 + nameLength + extraLength;
    const compressed = bytes.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method === 8) return inflateRaw(compressed);
    throw new Error(`Método ZIP não suportado (${entry.method}).`);
  }

  function parseXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML interno do XLSX está inválido.");
    return doc;
  }

  async function xmlEntry(bytes, entries, name, optional = false) {
    const entry = entries.get(name);
    if (!entry) {
      if (optional) return null;
      throw new Error(`Arquivo interno ausente no XLSX: ${name}`);
    }
    const data = await unzipEntry(bytes, entry);
    return parseXml(decoder.decode(data));
  }

  function sharedStringsFrom(doc) {
    if (!doc) return [];
    return [...doc.getElementsByTagName("si")].map(si => si.textContent || "");
  }

  function cellColumnIndex(reference) {
    const letters = (reference.match(/[A-Z]+/i) || ["A"])[0].toUpperCase();
    let result = 0;
    for (const char of letters) result = result * 26 + char.charCodeAt(0) - 64;
    return result - 1;
  }

  function sheetMatrix(doc, sharedStrings) {
    const matrix = [];
    for (const row of [...doc.getElementsByTagName("row")]) {
      const rowIndex = Math.max(0, Number(row.getAttribute("r") || matrix.length + 1) - 1);
      const out = matrix[rowIndex] || [];
      for (const cell of [...row.getElementsByTagName("c")]) {
        const reference = cell.getAttribute("r") || "A1";
        const col = cellColumnIndex(reference);
        const type = cell.getAttribute("t") || "";
        const v = cell.getElementsByTagName("v")[0];
        let value = null;
        if (type === "s" && v) {
          value = sharedStrings[Number(v.textContent || 0)] ?? "";
        } else if (type === "inlineStr") {
          const inline = cell.getElementsByTagName("is")[0];
          value = inline ? inline.textContent || "" : "";
        } else if (type === "b" && v) {
          value = v.textContent === "1";
        } else if ((type === "str" || type === "e") && v) {
          value = v.textContent || "";
        } else if (v && v.textContent !== null) {
          const raw = v.textContent;
          const numeric = Number(raw);
          value = raw !== "" && Number.isFinite(numeric) ? numeric : raw;
        }
        out[col] = value;
      }
      matrix[rowIndex] = out;
    }
    return matrix;
  }

  function workbookSheetMap(workbookDoc, relDoc) {
    const rels = new Map();
    for (const rel of [...relDoc.getElementsByTagName("Relationship")]) {
      rels.set(rel.getAttribute("Id"), rel.getAttribute("Target"));
    }
    const result = new Map();
    for (const sheet of [...workbookDoc.getElementsByTagName("sheet")]) {
      const name = sheet.getAttribute("name") || "";
      const rid = sheet.getAttribute("r:id") ||
        sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const target = rels.get(rid);
      if (!target) continue;
      const normalized = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.?\//, "")}`;
      result.set(name, normalized.replace(/\\/g, "/"));
    }
    return result;
  }

  function findHeaderIndex(matrix) {
    const index = matrix.findIndex(row => {
      const keys = (row || []).map(normalizeKey);
      return keys.includes("DATA DE RECEBIMENTO") && keys.includes("FORNECEDOR") && keys.includes("STATUS");
    });
    if (index < 0) throw new Error(`Não encontrei o cabeçalho da aba "${MAIN_SHEET}".`);
    return index;
  }

  function headerIndex(row) {
    const map = new Map();
    (row || []).forEach((value, index) => map.set(normalizeKey(value), index));
    return map;
  }

  function pick(row, index, aliases) {
    for (const alias of aliases) {
      const col = index.get(normalizeKey(alias));
      if (col !== undefined) return row[col] ?? null;
    }
    return null;
  }

  function buildEquipmentLookup(matrix) {
    const map = new Map();
    const headerAt = matrix.findIndex(row => (row || []).some(value => normalizeKey(value) === "PREFIXO"));
    const start = headerAt >= 0 ? headerAt + 1 : 1;
    for (const row of matrix.slice(start)) {
      const prefix = text(row?.[0]);
      const equipment = text(row?.[1]);
      if (prefix && equipment && !map.has(prefix)) map.set(prefix, equipment);
    }
    return map;
  }

  function normalizeRows(matrix, equipmentLookup) {
    const headerAt = findHeaderIndex(matrix);
    const index = headerIndex(matrix[headerAt]);
    const required = ["DATA DE RECEBIMENTO", "FORNECEDOR", "STATUS"];
    for (const key of required) {
      if (!index.has(normalizeKey(key))) throw new Error(`Coluna obrigatória ausente: ${key}.`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const records = [];

    matrix.slice(headerAt + 1).forEach((row, offset) => {
      if (!row || !row.some(value => text(value))) return;
      const dataRecebimento = excelDate(pick(row, index, ["DATA DE RECEBIMENTO"]));
      const dataLancamento = excelDate(pick(row, index, ["DATA LANÇAMENTO"]));
      const status = text(pick(row, index, ["STATUS"])).toUpperCase().replace(/\s+/g, " ") || "SEM STATUS";
      const prefixo = text(pick(row, index, ["PREFIXO"]));
      let equipamento = text(pick(row, index, ["EQUIPAMENTO"]));
      if (!equipamento && prefixo) equipamento = equipmentLookup.get(prefixo) || "";

      const endWaiting = status === "FALTA LANÇAMENTO" ? today : dataLancamento;
      const numeroOrc = text(pick(row, index, ["Nº ORÇ. FINAL", "Nº ORC FINAL"])) || "Não informado";
      const rowNumber = headerAt + offset + 2;

      records.push({
        id: `orc-${rowNumber}-${numeroOrc}`,
        rowNumber,
        dataRecebimento,
        dataLancamento,
        prefixo: prefixo || "Não informado",
        equipamento: equipamento || "Não informado",
        fornecedor: text(pick(row, index, ["FORNECEDOR"])) || "Não informado",
        numeroOrc,
        valorServico: numberValue(pick(row, index, ["VALOR SERVIÇO"])),
        valorPecas: numberValue(pick(row, index, ["VALOR PEÇAS"])),
        valorTotal: numberValue(pick(row, index, ["VALOR TOTAL"])),
        solicitante: text(pick(row, index, ["SOLICITANTE"])) || "Não informado",
        numeroOs: text(pick(row, index, ["Nº ORDEM SERVIÇO"])) || "Não informado",
        numeroRequisicao: text(pick(row, index, ["Nº REQUISIÇÃO"])) || "Não informado",
        numeroPedido: text(pick(row, index, ["Nº PEDIDO DE COMPRA"])) || "Não informado",
        dataPedido: text(pick(row, index, ["DATA DO PEDIDO"])),
        numeroNfs: text(pick(row, index, ["Nº NFS/DANFE"])) || "Não informado",
        dataLancamentoNfs: text(pick(row, index, ["DATA LANÇAMENTO(NFS)", "DATA LANÇAMENTO NFS"])),
        status,
        observacoes: text(pick(row, index, ["OBS ADICIONAIS"])),
        diasAguardando: dayDiff(dataRecebimento, endWaiting),
        leadTimeLancamento: dayDiff(dataRecebimento, dataLancamento),
      });
    });
    return records;
  }

  async function readWorkbook(file) {
    if (!file || !file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Selecione um arquivo .xlsx.");
    if (file.size > MAX_FILE_SIZE) throw new Error("O arquivo excede o limite de 30 MB.");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = readZipDirectory(bytes);
    const workbookDoc = await xmlEntry(bytes, entries, "xl/workbook.xml");
    const relDoc = await xmlEntry(bytes, entries, "xl/_rels/workbook.xml.rels");
    const sharedDoc = await xmlEntry(bytes, entries, "xl/sharedStrings.xml", true);
    const sharedStrings = sharedStringsFrom(sharedDoc);
    const sheetMap = workbookSheetMap(workbookDoc, relDoc);

    const mainPath = sheetMap.get(MAIN_SHEET);
    if (!mainPath) throw new Error(`Aba obrigatória ausente: "${MAIN_SHEET}".`);
    const mainDoc = await xmlEntry(bytes, entries, mainPath);
    const mainMatrix = sheetMatrix(mainDoc, sharedStrings);

    let equipmentLookup = new Map();
    const equipmentPath = sheetMap.get(EQUIPMENT_SHEET);
    if (equipmentPath) {
      const equipmentDoc = await xmlEntry(bytes, entries, equipmentPath);
      equipmentLookup = buildEquipmentLookup(sheetMatrix(equipmentDoc, sharedStrings));
    }

    const rows = normalizeRows(mainMatrix, equipmentLookup);
    if (!rows.length) throw new Error("Nenhum registro válido foi encontrado.");
    return {
      rows,
      sourceName: file.name,
      loadedAt: new Date(),
      equipmentLookupCount: equipmentLookup.size,
    };
  }

  window.OrcXlsxReader = {
    read: readWorkbook,
    _internals: { normalizeKey, excelDate, numberValue, dayDiff }
  };
})();
