import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, FileCheck2, TrendingUp, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber, formatRelative } from "@/lib/utils";

export default function TvPage() {
  const { data } = useQuery({ queryKey: ["overview", "tv"], queryFn: () => api.overview(), refetchInterval: 60_000 });
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-[#09131c] text-white">Carregando painel...</div>;
  const max = Math.max(...data.flow.map((x) => x.count), 1);
  const metrics: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "Em andamento", value: formatNumber(data.metrics.inProgress.value), icon: Clock3 },
    { label: "Valor em andamento", value: formatCurrency(data.metrics.inProgressValue.amountCents, true), icon: TrendingUp },
    { label: "Precisam de atenção", value: formatNumber(data.metrics.attention.value), icon: AlertTriangle },
    { label: "Concluídas no período", value: formatNumber(data.metrics.completed.value), icon: FileCheck2 }
  ];
  const rankings = [
    { title: "Fornecedores com mais ORCs", items: data.suppliers },
    { title: "Solicitantes com mais ORCs", items: data.requesters },
    { title: "Equipamentos mais recorrentes", items: data.equipment }
  ];
  return <div className="min-h-screen bg-[#09131c] p-7 text-[#f3f7fa] 2xl:p-10">
    <header className="flex items-center justify-between"><img src="/amaggi-logo.png" className="h-11 w-[210px] object-contain object-left brightness-110" alt="AMAGGI" /><div className="text-right"><p className="text-sm font-semibold">ACOMPANHAMENTO DE SOLICITAÇÕES</p><p className="mt-1 text-xs text-[#aab8c3]">Atualizado {formatRelative(data.updatedAt)}</p></div></header>
    <section className="mt-7 grid grid-cols-4 gap-5">{metrics.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-[22px] border border-[#263945] bg-[#111f2b] p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium text-[#aab8c3]">{label}</p><Icon className="h-5 w-5 text-[#54a4d1]" /></div><p className="mt-5 text-[42px] font-semibold leading-none tracking-[-.045em]">{value}</p></div>)}</section>
    <section className="mt-5 grid grid-cols-[1.1fr_.9fr] gap-5"><div className="rounded-[22px] border border-[#263945] bg-[#111f2b] p-6"><h2 className="text-lg font-semibold">Onde estão as solicitações</h2><p className="mt-1 text-sm text-[#aab8c3]">Fluxo documental atual</p><div className="mt-6 space-y-5">{data.flow.map((item) => <div key={item.stage}><div className="flex items-end justify-between"><div><p className="text-base font-medium">{item.label}</p><p className="mt-1 text-xs text-[#aab8c3]">{formatCurrency(item.amountCents, true)}</p></div><p className="text-3xl font-semibold">{item.count}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1b2d3b]"><div className="h-full rounded-full bg-gradient-to-r from-[#2d83b5] to-[#54a4d1]" style={{ width: `${(item.count / max) * 100}%` }} /></div></div>)}</div></div><div className="rounded-[22px] border border-[#263945] bg-[#111f2b] p-6"><h2 className="text-lg font-semibold">O que exige atenção</h2><p className="mt-1 text-sm text-[#aab8c3]">Itens prioritários do escopo</p><div className="mt-5 space-y-3">{data.attention.map((item) => <div className="flex items-center justify-between rounded-2xl bg-[#172734] p-4" key={item.key}><div><p className="font-medium">{item.label}</p><p className="mt-1 text-xs text-[#aab8c3]">{item.description}</p></div><p className="ml-4 text-3xl font-semibold">{item.count}</p></div>)}</div></div></section>
    <section className="mt-5 grid grid-cols-3 gap-5">{rankings.map(({ title, items }) => <div key={title} className="rounded-[22px] border border-[#263945] bg-[#111f2b] p-6"><h2 className="text-base font-semibold">{title}</h2><div className="mt-5 space-y-4">{items.slice(0,4).map((item) => <div key={item.name} className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-1 truncate text-xs text-[#788896]">{item.secondary ?? ""}</p></div><p className="text-2xl font-semibold">{item.count}</p></div>)}</div></div>)}</section>
  </div>;
}
