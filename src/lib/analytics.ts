import type { OsOrcRecord } from "../types/osOrc";
import { daysSince, isPending, statusLabel } from "./format";

export const PROCESS_STATUSES = [
  "FALTA LANÇAMENTO",
  "FALTA O PEDIDO",
  "FALTA NF",
  "CONCLUÍDO"
] as const;

export function buildMonthlySeries(records: OsOrcRecord[]) {
  const months = new Map<string, number>();
  for (const record of records) {
    const date = record.dataRecebimento;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const key = date.slice(0, 7);
    months.set(key, (months.get(key) ?? 0) + 1);
  }

  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const [year, month] = key.split("-");
      const label = new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(new Date(Number(year), Number(month) - 1, 1))
        .replace(".", "");
      return { key, mes: label[0].toUpperCase() + label.slice(1), total };
    });
}

export function buildPendingStatusSeries(records: OsOrcRecord[]) {
  return PROCESS_STATUSES
    .filter((status) => status !== "CONCLUÍDO")
    .map((status) => ({
      status,
      label: statusLabel(status),
      total: records.filter((record) => record.status === status).length
    }));
}

export function topSuppliersByPendingValue(records: OsOrcRecord[], limit = 5) {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (!isPending(record)) continue;
    const key = record.fornecedor || "Não informado";
    totals.set(key, (totals.get(key) ?? 0) + record.valorTotal);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

export function topRequestersByPending(records: OsOrcRecord[], limit = 5) {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (!isPending(record)) continue;
    const key = record.solicitante || "Não informado";
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

export function oldestPending(records: OsOrcRecord[], limit = 5) {
  return records
    .filter(isPending)
    .map((record) => ({ record, days: daysSince(record.dataRecebimento) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, limit);
}
