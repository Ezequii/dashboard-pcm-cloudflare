import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, FileWarning, RefreshCw, Sparkles, TrendingUp, UsersRound, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber, formatRelative } from "@/lib/utils";
import * as React from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, Progress, Select, Skeleton } from "@/components/ui";
import type { RankingItem } from "@/types";

function MetricCard({ label, value, helper, icon: Icon, tone = "primary", onClick }: { label: string; value: string; helper?: string; icon: React.ElementType; tone?: "primary" | "success" | "warning" | "neutral"; onClick: () => void }) {
  const toneClass = { primary: "bg-primary-subtle text-primary", success: "bg-success-subtle text-success", warning: "bg-warning-subtle text-warning", neutral: "bg-muted text-muted-foreground" }[tone];
  return <button onClick={onClick} className="premium-card surface-hover group min-h-[150px] p-5 text-left">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">{label}</p><p className="numeric mt-5 text-[32px] font-semibold leading-none tracking-[-0.045em]">{value}</p></div><div className={`rounded-xl p-2.5 ${toneClass}`}><Icon className="h-[18px] w-[18px]" /></div></div>
    <div className="mt-5 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{helper}</span><ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" /></div>
  </button>;
}

function RankingCard({ title, description, items, icon: Icon, queryKey }: { title: string; description: string; items: RankingItem[]; icon: React.ElementType; queryKey: string }) {
  const navigate = useNavigate();
  const max = Math.max(...items.map((x) => x.count), 1);
  return <Card className="overflow-hidden"><CardHeader><div><CardTitle className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle><CardDescription>{description}</CardDescription></div></CardHeader><CardContent className="space-y-1 pb-4">{items.slice(0, 5).map((item) => <button key={item.name} onClick={() => navigate(`/acompanhamento?${queryKey}=${encodeURIComponent(item.name)}`)} className="group w-full rounded-xl px-2 py-2.5 text-left transition hover:bg-muted/75"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.secondary ?? (item.amountCents ? formatCurrency(item.amountCents, true) : "Abrir acompanhamento")}</p></div><span className="numeric shrink-0 text-sm font-semibold">{formatNumber(item.count)}</span></div><Progress className="mt-2 h-1" value={(item.count / max) * 100} /></button>)}</CardContent></Card>;
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = React.useState(() => localStorage.getItem("pcm-overview-period") ?? "month");
  React.useEffect(() => localStorage.setItem("pcm-overview-period", period), [period]);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["overview", period], queryFn: () => api.overview(`?period=${period}`), refetchInterval: 60_000 });
  if (isError) return <div className="premium-card p-10 text-center"><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><h2 className="mt-3 font-semibold">Não foi possível carregar a Visão Geral</h2><p className="mt-1 text-sm text-muted-foreground">Verifique a conexão com a API e tente novamente.</p><Button className="mt-5" onClick={() => refetch()}>Tentar novamente</Button></div>;
  if (isLoading || !data) return <OverviewSkeleton />;
  return <>
    <PageHeader title="Visão Geral" description="Acompanhe o fluxo das solicitações e os principais pontos de atenção." actions={<><Select aria-label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="month">Este mês</option><option value="30d">Últimos 30 dias</option><option value="year">Este ano</option><option value="all">Todo o histórico</option></Select><Badge variant="outline" className="hidden h-10 items-center px-3 sm:inline-flex">Escopo conforme permissões</Badge><Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Atualizar"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /></Button></>} />

    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex h-2 w-2 rounded-full bg-success" />Atualizado {formatRelative(data.updatedAt)}</div>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Solicitações em andamento" value={formatNumber(data.metrics.inProgress.value)} helper={data.metrics.inProgress.helper} icon={Clock3} onClick={() => navigate("/acompanhamento?status=em-andamento")} />
      <MetricCard label="Valor em andamento" value={formatCurrency(data.metrics.inProgressValue.amountCents, true)} helper={data.metrics.inProgressValue.helper} icon={TrendingUp} tone="neutral" onClick={() => navigate("/acompanhamento?status=em-andamento&sort=valor-desc")} />
      <MetricCard label="Precisam de atenção" value={formatNumber(data.metrics.attention.value)} helper={data.metrics.attention.helper} icon={AlertCircle} tone="warning" onClick={() => navigate("/acompanhamento?attention=true")} />
      <MetricCard label="Concluídas no período" value={formatNumber(data.metrics.completed.value)} helper={data.metrics.completed.helper} icon={CheckCircle2} tone="success" onClick={() => navigate("/acompanhamento?stage=CONCLUIDO")} />
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card><CardHeader><div><CardTitle>Onde estão as solicitações</CardTitle><CardDescription>Etapa documental atual do fluxo: lançamento, pedido e nota fiscal.</CardDescription></div><Sparkles className="h-4 w-4 text-primary" /></CardHeader><CardContent className="space-y-3">{data.flow.map((item) => { const total = data.flow.reduce((s, x) => s + x.count, 0); return <button key={item.stage} onClick={() => navigate(`/acompanhamento?stage=${item.stage}`)} className="group w-full rounded-xl border border-transparent p-3 text-left transition hover:border-primary/15 hover:bg-primary/[0.025]"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{formatCurrency(item.amountCents, true)} em andamento</p></div><div className="text-right"><p className="numeric text-xl font-semibold tracking-[-0.03em]">{formatNumber(item.count)}</p><p className="text-[11px] text-muted-foreground">{Math.round((item.count / total) * 100)}% do fluxo</p></div></div><Progress className="mt-3" value={(item.count / Math.max(...data.flow.map((x) => x.count))) * 100} /></button>; })}</CardContent></Card>
      <Card><CardHeader><div><CardTitle>O que exige atenção</CardTitle><CardDescription>Itens críticos e acionáveis dentro do seu escopo.</CardDescription></div><FileWarning className="h-4 w-4 text-warning" /></CardHeader><CardContent className="space-y-2">{data.attention.map((item) => <button key={item.key} onClick={() => navigate(`/acompanhamento?attention=${item.key}`)} className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-muted/75"><div className={`mt-0.5 rounded-lg p-2 ${item.severity === "critical" ? "bg-destructive/10 text-destructive" : item.severity === "warning" ? "bg-warning-subtle text-warning" : item.severity === "info" ? "bg-primary-subtle text-primary" : "bg-muted text-muted-foreground"}`}><AlertCircle className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{item.label}</p><span className="numeric text-base font-semibold">{item.count}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div></button>)}</CardContent></Card>
    </section>

    <section className="mt-5 grid gap-5 lg:grid-cols-3">
      <RankingCard title="Fornecedores com mais solicitações" description="Concentração de ORCs no período." items={data.suppliers} icon={BriefcaseBusiness} queryKey="supplier" />
      <RankingCard title="Solicitantes com mais solicitações" description="Origem da demanda dentro do escopo." items={data.requesters} icon={UsersRound} queryKey="requester" />
      <RankingCard title="Equipamentos mais recorrentes" description="Modelos com maior recorrência de ORCs." items={data.equipment} icon={Wrench} queryKey="equipment" />
    </section>

    <Card className="mt-5"><CardHeader><div><CardTitle>Últimas movimentações</CardTitle><CardDescription>Atualizações relevantes realizadas recentemente.</CardDescription></div></CardHeader><CardContent className="divide-y divide-border/70 pt-0">{data.recentActivity.map((activity) => <button key={activity.id} onClick={() => activity.orcId && navigate(`/acompanhamento?orc=${activity.orcId}`)} className="group flex w-full items-center gap-3 py-3.5 text-left"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-xs font-semibold text-primary">{activity.actor?.split(" ").map((x) => x[0]).slice(0,2).join("") ?? "SI"}</div><div className="min-w-0 flex-1"><p className="truncate text-sm"><span className="font-semibold">{activity.code}</span> · {activity.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{activity.description} {activity.actor && `por ${activity.actor}`}</p></div><span className="shrink-0 text-xs text-muted-foreground">{formatRelative(activity.createdAt)}</span></button>)}</CardContent></Card>
  </>;
}

function OverviewSkeleton() {
  return <><div className="mb-6"><Skeleton className="h-8 w-48" /><Skeleton className="mt-3 h-4 w-96 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-2xl" />)}</div><div className="mt-5 grid gap-5 xl:grid-cols-2"><Skeleton className="h-[360px] rounded-2xl" /><Skeleton className="h-[360px] rounded-2xl" /></div><div className="mt-5 grid gap-5 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[320px] rounded-2xl" />)}</div></>;
}
