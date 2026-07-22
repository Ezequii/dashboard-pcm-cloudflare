import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Columns3, Download, Filter, ListFilter, MoreHorizontal, Search, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { StageBadge } from "@/components/StageBadge";
import { RequestDrawer } from "@/components/RequestDrawer";
import type { OrcListItem, Stage } from "@/types";

const quickViews: Array<{ label: string; stage?: Stage; key?: string }> = [{ label: "Todas" }, { label: "Em andamento", key: "em-andamento" }, { label: "Sem lançamento", stage: "SEM_LANCAMENTO" }, { label: "Sem pedido", stage: "SEM_PEDIDO" }, { label: "Sem NF", stage: "SEM_NF" }, { label: "Concluídas", stage: "CONCLUIDO" }];

export default function TrackingPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const query = params.get("q") ?? "";
  const stage = params.get("stage") ?? "";
  const supplier = params.get("supplier") ?? "";
  const requester = params.get("requester") ?? "";
  const equipment = params.get("equipment") ?? "";
  const selectedId = params.get("orc");
  const [search, setSearch] = React.useState(query);
  React.useEffect(() => setSearch(query), [query]);
  const apiParams = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (query) apiParams.set("q", query);
  if (stage) apiParams.set("stage", stage);
  if (supplier) apiParams.set("supplier", supplier);
  if (requester) apiParams.set("requester", requester);
  if (equipment) apiParams.set("equipment", equipment);
  if (params.get("status")) apiParams.set("status", params.get("status")!);
  if (params.get("attention")) apiParams.set("attention", params.get("attention")!);
  const { data, isLoading, isError } = useQuery({ queryKey: ["orcs", apiParams.toString()], queryFn: () => api.orcs(`?${apiParams.toString()}`), placeholderData: (previous) => previous });
  const update = (changes: Record<string, string | null>) => { const next = new URLSearchParams(params); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); if (!("page" in changes)) next.set("page", "1"); setParams(next, { replace: true }); };
  const activeFilterCount = [stage, supplier, requester, equipment, params.get("attention")].filter(Boolean).length;
  return <>
    <PageHeader title="Acompanhamento" description="Pesquise, filtre e acompanhe todas as solicitações sem perder o contexto da lista." actions={<><Button variant="outline"><Columns3 className="h-4 w-4" />Colunas</Button><Button variant="outline" onClick={async () => { const exportParams = new URLSearchParams(apiParams); exportParams.delete("page"); exportParams.delete("pageSize"); const blob = await api.exportOrcs(`?${exportParams.toString()}`); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `solicitacoes-${new Date().toISOString().slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url); }}><Download className="h-4 w-4" />Exportar</Button></>} />
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><form onSubmit={(e) => { e.preventDefault(); update({ q: search || null }); }} className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-10" placeholder="Pesquise por ORC, OS, pedido, NF, prefixo, fornecedor..." />{search && <button type="button" onClick={() => { setSearch(""); update({ q: null }); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>}</form><div className="flex flex-wrap gap-2"><Select value={stage} onChange={(e) => update({ stage: e.target.value || null })}><option value="">Todas as situações</option><option value="SEM_LANCAMENTO">Sem lançamento</option><option value="SEM_PEDIDO">Sem pedido</option><option value="SEM_NF">Sem NF</option><option value="CONCLUIDO">Concluído</option><option value="INCONSISTENTE">Inconsistente</option></Select><Button variant="outline"><Filter className="h-4 w-4" />Filtros{activeFilterCount > 0 && <Badge className="ml-1 px-1.5 py-0.5">{activeFilterCount}</Badge>}</Button><Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4" /></Button></div></div>
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">{quickViews.map((view) => { const active = view.stage ? stage === view.stage : view.key === "em-andamento" ? params.get("status") === "em-andamento" : !stage && !params.get("status"); return <button key={view.label} onClick={() => update({ stage: view.stage ?? null, status: view.key ?? null })} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${active ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{view.label}</button>; })}</div>
      </div>
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3"><p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{formatNumber(data?.total ?? 0)}</span> resultados</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><ListFilter className="h-3.5 w-3.5" />Ordenado por atualização</div></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1080px] border-collapse text-left"><thead className="sticky top-0 bg-card"><tr className="border-b border-border text-[11px] font-semibold uppercase tracking-[.06em] text-muted-foreground"><th className="px-4 py-3">Solicitação</th><th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3">Equipamento</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-center">Tempo</th><th className="px-4 py-3">Solicitante</th><th className="w-12 px-4 py-3" /></tr></thead><tbody>{isLoading ? Array.from({ length: 10 }).map((_, i) => <tr key={i} className="border-b border-border/70"><td colSpan={8} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>) : data?.items.map((orc) => <OrcRow key={orc.id} orc={orc} onClick={() => update({ orc: orc.id })} />)}</tbody></table></div>
      <div className="divide-y divide-border md:hidden">{isLoading ? Array.from({ length: 6 }).map((_, i) => <div className="p-4" key={i}><Skeleton className="h-28 rounded-xl" /></div>) : data?.items.map((orc) => <OrcMobileCard key={orc.id} orc={orc} onClick={() => update({ orc: orc.id })} />)}</div>
      {!isLoading && !data?.items.length && <EmptyState icon={<Search className="h-6 w-6" />} title="Nenhuma solicitação encontrada" description="Tente remover alguns filtros ou pesquisar por outro número, fornecedor ou equipamento." action={<Button variant="outline" onClick={() => setParams(new URLSearchParams())}>Limpar filtros</Button>} />}
      {isError && <div className="p-8 text-center text-sm text-destructive">Não foi possível carregar as solicitações.</div>}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row"><p className="text-xs text-muted-foreground">Página {page} · até 20 resultados por página</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}><ChevronLeft className="h-4 w-4" />Anterior</Button><Button variant="outline" size="sm" disabled={(data?.items.length ?? 0) < 20} onClick={() => update({ page: String(page + 1) })}>Próxima<ChevronRight className="h-4 w-4" /></Button></div></div>
    </Card>
    <RequestDrawer id={selectedId} open={!!selectedId} onOpenChange={(open) => !open && update({ orc: null })} />
  </>;
}

function OrcRow({ orc, onClick }: { orc: OrcListItem; onClick: () => void }) { return <tr onClick={onClick} className="group cursor-pointer border-b border-border/65 transition hover:bg-primary/[.025]"><td className="px-4 py-3"><p className="font-mono text-xs font-semibold text-primary">{orc.internalCode}</p><p className="mt-1 max-w-[210px] truncate text-xs text-muted-foreground">{orc.notes || orc.externalQuoteNumber || "Sem descrição"}</p></td><td className="max-w-[190px] px-4 py-3"><p className="truncate text-sm font-medium">{orc.supplier || "—"}</p><p className="mt-1 text-xs text-muted-foreground">ORC {orc.externalQuoteNumber || "—"}</p></td><td className="max-w-[280px] px-4 py-3"><p className="truncate text-sm">{orc.equipment || "Equipamento não identificado"}</p><p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{orc.prefixText || "Sem prefixo"}</p></td><td className="numeric px-4 py-3 text-right text-sm font-semibold">{formatCurrency(orc.totalAmountCents)}</td><td className="px-4 py-3"><StageBadge stage={orc.stage} />{orc.qualityIssueCount > 0 && <p className="mt-1.5 text-[11px] text-destructive">{orc.qualityIssueCount} inconsistência(s)</p>}</td><td className="numeric px-4 py-3 text-center text-sm"><span className={orc.ageDays > 15 ? "font-semibold text-destructive" : "text-muted-foreground"}>{orc.ageDays ? `${orc.ageDays} d` : "—"}</span></td><td className="max-w-[160px] px-4 py-3"><p className="truncate text-sm">{orc.requester || "—"}</p><p className="mt-1 text-[11px] text-muted-foreground">Recebido {formatDate(orc.receivedAt)}</p></td><td className="px-4 py-3"><button className="rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button></td></tr>; }
function OrcMobileCard({ orc, onClick }: { orc: OrcListItem; onClick: () => void }) { return <button onClick={onClick} className="w-full p-4 text-left transition hover:bg-muted/50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{orc.notes || orc.equipment || "Solicitação"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{orc.prefixText || "Sem prefixo"} · {orc.supplier}</p></div><p className="numeric shrink-0 text-sm font-semibold">{formatCurrency(orc.totalAmountCents)}</p></div><div className="mt-3 flex items-center justify-between gap-3"><StageBadge stage={orc.stage} /><span className="font-mono text-[11px] text-primary">{orc.internalCode}</span></div></button>; }
