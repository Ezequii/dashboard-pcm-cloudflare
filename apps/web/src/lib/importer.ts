import * as XLSX from "xlsx";

export interface ImportOrcRow {
  sourceRowNumber: number;
  systemId?: string | null;
  receivedAt: string | null;
  launchedAt: string | null;
  prefixText: string | null;
  equipment: string | null;
  supplier: string | null;
  externalQuoteNumber: string | null;
  serviceAmountCents: number;
  partsAmountCents: number;
  totalAmountCents: number;
  requester: string | null;
  serviceOrderNumbers: string[];
  requisitionNumbers: string[];
  purchaseOrderNumbers: string[];
  purchaseOrderDates: string[];
  invoiceNumbers: string[];
  invoiceLaunchDates: string[];
  sourceStatus: string | null;
  notes: string | null;
  issues: string[];
}

const aliases: Record<string, string[]> = {
  systemId: ["ID_SISTEMA", "ID SISTEMA"],
  receivedAt: ["DATA DE RECEBIMENTO", "DATA RECEBIMENTO"],
  launchedAt: ["DATA LANÇAMENTO", "DATA DE LANÇAMENTO"],
  prefixText: ["PREFIXO", "PREFIXO "],
  equipment: ["EQUIPAMENTO"],
  supplier: ["FORNECEDOR"],
  externalQuoteNumber: ["Nº ORÇ. FINAL", "N ORÇ FINAL", "Nº ORC FINAL", "ORÇAMENTO"],
  serviceAmountCents: ["VALOR SERVIÇO", "VALOR SERVICO"],
  partsAmountCents: ["VALOR PEÇAS", "VALOR PECAS"],
  totalAmountCents: ["VALOR TOTAL"],
  requester: ["SOLICITANTE"],
  serviceOrderNumbers: ["Nº ORDEM SERVIÇO", "N ORDEM SERVIÇO", "ORDEM DE SERVIÇO", "OS"],
  requisitionNumbers: ["Nº REQUISIÇÃO", "N REQUISIÇÃO", "REQUISIÇÃO"],
  purchaseOrderNumbers: ["Nº PEDIDO DE COMPRA", "N PEDIDO DE COMPRA", "PEDIDO DE COMPRA"],
  purchaseOrderDates: ["DATA DO PEDIDO"],
  invoiceNumbers: ["Nº NFS/DANFE", "N NFS/DANFE", "NF", "NFS/DANFE"],
  invoiceLaunchDates: ["DATA LANÇAMENTO(NFS)", "DATA LANÇAMENTO (NFS)", "DATA LANÇAMENTO NF"],
  sourceStatus: ["STATUS"],
  notes: ["OBS ADICIONAIS", "OBSERVAÇÕES", "OBS"]
};

const normalizeHeader = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
const normalizeText = (v: unknown) => {
  const text = String(v ?? "").trim();
  return text && text !== "-" && text !== "*" ? text.replace(/\s+/g, " ") : null;
};
const splitValues = (v: unknown) => {
  const text = normalizeText(v);
  if (!text) return [];
  return Array.from(new Set(text.split(/\s*(?:\||\n|;|\/\s*(?=\d{5,})|,\s*(?=\d{5,}))\s*/g).map((x) => x.trim()).filter(Boolean)));
};
const cents = (v: unknown) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 100);
  const text = String(v).replace(/R\$/gi, "").replace(/\s/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
};
const dateValue = (v: unknown) => {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0,10);
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2,"0")}-${String(parsed.d).padStart(2,"0")}`;
  }
  const text = String(v).trim();
  if (!text || text === "*" || text === "-") return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`;
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) { const year = br[3].length === 2 ? `20${br[3]}` : br[3]; return `${year}-${br[2].padStart(2,"0")}-${br[1].padStart(2,"0")}`; }
  return null;
};
const splitDates = (v: unknown) => {
  const text = normalizeText(v);
  if (!text) return [];
  return text.split(/\s*(?:\||\n|;)\s*/).map(dateValue).filter((x): x is string => !!x);
};

export async function parseWorkbook(file: File): Promise<{ sheetName: string; rows: ImportOrcRow[]; issues: number; headers: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: true });
  const sheetName = workbook.SheetNames.find((name) => normalizeHeader(name).includes("ACOMPANHAMENTO")) ?? workbook.SheetNames[0];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: null, raw: true });
  const headerIndex = matrix.findIndex((row) => Array.isArray(row) && row.some((value) => normalizeHeader(value).includes("DATA DE RECEBIMENTO")));
  if (headerIndex < 0) throw new Error("Não foi possível localizar o cabeçalho da base de acompanhamento.");
  const headers = (matrix[headerIndex] ?? []).map(normalizeHeader);
  const column = (field: keyof typeof aliases) => {
    const targets = aliases[field].map(normalizeHeader);
    return headers.findIndex((h) => targets.includes(h));
  };
  const get = (row: unknown[], field: keyof typeof aliases) => { const index = column(field); return index >= 0 ? row[index] : null; };
  const rows: ImportOrcRow[] = [];
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const raw = matrix[i] ?? [];
    if (!raw.some((value) => value !== null && String(value).trim() !== "")) continue;
    const issues: string[] = [];
    const receivedAt = dateValue(get(raw, "receivedAt"));
    const launchedAt = dateValue(get(raw, "launchedAt"));
    const supplier = normalizeText(get(raw, "supplier"));
    const externalQuoteNumber = normalizeText(get(raw, "externalQuoteNumber"));
    const serviceAmountCents = cents(get(raw, "serviceAmountCents"));
    const partsAmountCents = cents(get(raw, "partsAmountCents"));
    const sourceTotal = cents(get(raw, "totalAmountCents"));
    const calculatedTotal = serviceAmountCents + partsAmountCents;
    const totalAmountCents = sourceTotal || calculatedTotal;
    const purchaseOrderNumbers = splitValues(get(raw, "purchaseOrderNumbers"));
    const purchaseOrderDates = splitDates(get(raw, "purchaseOrderDates"));
    const invoiceNumbers = splitValues(get(raw, "invoiceNumbers"));
    const invoiceLaunchDates = splitDates(get(raw, "invoiceLaunchDates"));
    if (!receivedAt) issues.push("Data de recebimento ausente ou inválida");
    if (!supplier) issues.push("Fornecedor não informado");
    if (!externalQuoteNumber) issues.push("Número do orçamento não informado");
    if (sourceTotal && calculatedTotal && Math.abs(sourceTotal - calculatedTotal) > 2) issues.push("Valor total diverge de serviço + peças");
    if (purchaseOrderDates.length && purchaseOrderNumbers.length !== purchaseOrderDates.length) issues.push("Quantidade de pedidos e datas não corresponde");
    if (invoiceLaunchDates.length && invoiceNumbers.length !== invoiceLaunchDates.length) issues.push("Quantidade de NFs e datas não corresponde");
    rows.push({
      sourceRowNumber: i + 1,
      systemId: normalizeText(get(raw, "systemId")),
      receivedAt,
      launchedAt,
      prefixText: normalizeText(get(raw, "prefixText")),
      equipment: normalizeText(get(raw, "equipment")),
      supplier,
      externalQuoteNumber,
      serviceAmountCents,
      partsAmountCents,
      totalAmountCents,
      requester: normalizeText(get(raw, "requester")),
      serviceOrderNumbers: splitValues(get(raw, "serviceOrderNumbers")),
      requisitionNumbers: splitValues(get(raw, "requisitionNumbers")),
      purchaseOrderNumbers,
      purchaseOrderDates,
      invoiceNumbers,
      invoiceLaunchDates,
      sourceStatus: normalizeText(get(raw, "sourceStatus")),
      notes: normalizeText(get(raw, "notes")),
      issues
    });
  }
  return { sheetName, rows, issues: rows.filter((row) => row.issues.length).length, headers };
}
