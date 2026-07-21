import type { OsOrcRecord } from "../types/osOrc";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

export function formatCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    })} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    })} mil`;
  }
  return formatCurrency(value);
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function isPending(record: OsOrcRecord): boolean {
  return record.status !== "CONCLUÍDO";
}

export function daysSince(value: string | null, now = new Date()): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 0;
  const start = new Date(`${value}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
}

export function recordLabel(record: OsOrcRecord): string {
  const os = record.numeroOrdemServico ? `OS ${record.numeroOrdemServico}` : "OS —";
  const orc = record.numeroOrcamento ? `ORC ${record.numeroOrcamento}` : "ORC —";
  return `${os} · ${orc}`;
}

export function statusLabel(status: string): string {
  if (status === "FALTA O PEDIDO") return "Falta pedido";
  if (status === "FALTA LANÇAMENTO") return "Falta lançamento";
  if (status === "FALTA NF") return "Falta NF";
  if (status === "CONCLUÍDO") return "Concluído";
  return status || "Sem status";
}
