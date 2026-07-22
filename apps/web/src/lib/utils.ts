import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Stage } from "@/types";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatCurrency(cents = 0, compact = false) {
  const value = cents / 100;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 2 }).format(value);
}
export function formatNumber(value = 0) { return new Intl.NumberFormat("pt-BR").format(value); }
export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value.slice(0,10)}T12:00:00`));
}
export function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}
export function stageLabel(stage: Stage) {
  return ({ SEM_LANCAMENTO: "Sem lançamento", SEM_PEDIDO: "Sem pedido", SEM_NF: "Sem NF", CONCLUIDO: "Concluído", INCONSISTENTE: "Inconsistente" } as const)[stage];
}
export function getMissingStep(stage: Stage) {
  return ({ SEM_LANCAMENTO: "Lançamento do ORC", SEM_PEDIDO: "Pedido de compra", SEM_NF: "Nota fiscal", CONCLUIDO: "Nada — fluxo concluído", INCONSISTENTE: "Revisão das informações" } as const)[stage];
}
