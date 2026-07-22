import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, CheckCircle2, ChevronRight, Circle, Download, FileText, History, Link2, MoreHorizontal, Paperclip, ReceiptText, Save, X } from "lucide-react";
import * as React from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatRelative, getMissingStep, stageLabel } from "@/lib/utils";
import { Badge, Button, Card, Input, Select, Skeleton } from "@/components/ui";
import { StageBadge } from "@/components/StageBadge";
import type { OrcDetail, Stage } from "@/types";

const tabs = ["Resumo", "Rastreabilidade", "Documentos", "Histórico"] as const;
type Tab = typeof tabs[number];

export function RequestDrawer({ id, open, onOpenChange }: { id?: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = React.useState<Tab>("Resumo");
  const { data, isLoading } = useQuery({ queryKey: ["orc", id], queryFn: () => api.orc(id!), enabled: !!id && open });
  React.useEffect(() => { if (open) setTab("Resumo"); }, [open, id]);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-[#06111a]/35 backdrop-blur-[2px] data-[state=open]:animate-in" /><Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background shadow-drawer duration-300 data-[state=open]:animate-in data-[state=open]:slide-in-from-right sm:max-w-[640px] 2xl:max-w-[720px]">
    {isLoading || !data ? <DrawerSkeleton onClose={() => onOpenChange(false)} /> : <DrawerBody data={data} tab={tab} setTab={setTab} onClose={() => onOpenChange(false)} />}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function DrawerBody({ data, tab, setTab, onClose }: { data: OrcDetail; tab: Tab; setTab: (tab: Tab) => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [stage, setStage] = React.useState<Stage>(data.stage);
  const [notes, setNotes] = React.useState(data.notes ?? "");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { setStage(data.stage); setNotes(data.notes ?? ""); setEditing(false); }, [data.id, data.revision]);
  const mutation = useMutation({ mutationFn: () => api.updateOrc(data.id, { stage, notes, revision: data.revision }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orc", data.id] }); queryClient.invalidateQueries({ queryKey: ["orcs"] }); queryClient.invalidateQueries({ queryKey: ["overview"] }); setEditing(false); } });
  const uploadMutation = useMutation({ mutationFn: (file: File) => api.uploadDocument(data.id, file), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orc", data.id] }); setTab("Documentos"); } });
  const steps = [
    { label: "ORC recebido", done: !!data.receivedAt },
    { label: "ORC lançado", done: !!data.launchedAt },
    { label: "OS vinculada", done: data.serviceOrderNumbers.length > 0 },
    { label: "Requisição criada", done: data.requisitionNumbers.length > 0 },
    { label: "Pedido emitido", done: data.purchaseOrderNumbers.length > 0 },
    { label: "NF recebida", done: data.invoiceNumbers.length > 0 },
    { label: "NF lançada", done: data.invoiceLaunchDates.length > 0 }
  ];
  return <>
    <header className="shrink-0 border-b border-border bg-card/80 px-5 pb-4 pt-5 backdrop-blur-xl sm:px-6">
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><Badge variant="outline" className="font-mono">{data.internalCode}</Badge>{data.qualityIssueCount > 0 && <Badge variant="danger"><AlertTriangle className="h-3 w-3" />{data.qualityIssueCount} inconsistência(s)</Badge>}</div><Dialog.Title className="mt-3 truncate text-xl font-semibold tracking-[-0.025em]">{data.notes || data.equipment || "Solicitação de manutenção"}</Dialog.Title><Dialog.Description className="mt-1 truncate text-sm text-muted-foreground">{data.prefixText || "Sem prefixo"} · {data.equipment || "Equipamento não identificado"}</Dialog.Description></div><div className="flex gap-1"><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted"><MoreHorizontal className="h-5 w-5" /></button><button onClick={onClose} className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button></div></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="numeric text-2xl font-semibold tracking-[-0.035em]">{formatCurrency(data.totalAmountCents)}</p><StageBadge stage={data.stage} /></div>
    </header>

    <div className="flex-1 overflow-y-auto">
      <div className="space-y-5 p-5 sm:p-6">
        <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-subtle via-primary-subtle/65 to-card p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary p-2.5 text-primary-foreground"><ReceiptText className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[.09em] text-primary">O que está faltando</p><h3 className="mt-2 text-lg font-semibold">{getMissingStep(data.stage)}</h3><p className="mt-1 text-sm text-muted-foreground">{data.stage === "CONCLUIDO" ? "Todos os marcos obrigatórios foram atendidos." : `Solicitação em aberto há ${data.ageDays} dia(s). Última atualização ${formatRelative(data.updatedAt)}.`}</p></div></div></section>

        <section className="premium-card p-4"><div className="grid gap-1 sm:grid-cols-2">{steps.map((step, index) => <div key={step.label} className="flex items-center gap-3 rounded-xl p-2.5"><div className={`flex h-7 w-7 items-center justify-center rounded-full ${step.done ? "bg-success-subtle text-success" : "bg-muted text-muted-foreground"}`}>{step.done ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}</div><div><p className={`text-sm font-medium ${!step.done ? "text-muted-foreground" : ""}`}>{step.label}</p><p className="text-[11px] text-muted-foreground">Etapa {index + 1} de 7</p></div></div>)}</div></section>

        <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/95 p-1 shadow-sm backdrop-blur-xl">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${tab === item ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item}</button>)}</div>

        {tab === "Resumo" && <div className="space-y-4"><InfoGrid data={data} />{editing ? <Card className="p-4"><label className="text-xs font-semibold text-muted-foreground">Situação</label><Select className="mt-2 w-full" value={stage} onChange={(e) => setStage(e.target.value as Stage)}><option value="SEM_LANCAMENTO">Sem lançamento</option><option value="SEM_PEDIDO">Sem pedido</option><option value="SEM_NF">Sem NF</option><option value="CONCLUIDO">Concluído</option><option value="INCONSISTENTE">Inconsistente</option></Select><label className="mt-4 block text-xs font-semibold text-muted-foreground">Descrição / observação</label><Input className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} /><div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><Save className="h-4 w-4" />Salvar</Button></div></Card> : <button onClick={() => setEditing(true)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/20 hover:bg-primary/[.02]"><div><p className="text-sm font-medium">Atualizar dados principais</p><p className="mt-1 text-xs text-muted-foreground">Situação e observação da solicitação.</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>}</div>}
        {tab === "Rastreabilidade" && <Traceability data={data} />}
        {tab === "Documentos" && <Documents data={data} />}
        {tab === "Histórico" && <HistoryPanel data={data} />}
      </div>
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card/90 px-5 py-4 backdrop-blur-xl sm:px-6"><input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadMutation.mutate(file); event.currentTarget.value = ""; }} /><Button variant="outline" disabled={uploadMutation.isPending} onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" />{uploadMutation.isPending ? "Enviando..." : "Adicionar documento"}</Button><Button onClick={() => setEditing(true)}>Atualizar solicitação</Button></footer>
  </>;
}

function InfoGrid({ data }: { data: OrcDetail }) {
  const rows = [["Fornecedor", data.supplier], ["Solicitante", data.requester], ["Recebimento", formatDate(data.receivedAt)], ["Lançamento", formatDate(data.launchedAt)], ["Serviço", formatCurrency(data.serviceAmountCents)], ["Peças", formatCurrency(data.partsAmountCents)], ["Orçamento externo", data.externalQuoteNumber]];
  return <Card className="overflow-hidden"><div className="grid sm:grid-cols-2">{rows.map(([label, value], index) => <div key={label} className={`p-4 ${index % 2 === 0 ? "sm:border-r" : ""} ${index < rows.length - 2 ? "border-b" : ""}`}><p className="text-[11px] font-semibold uppercase tracking-[.07em] text-muted-foreground">{label}</p><p className="mt-1.5 break-words text-sm font-medium">{value || "—"}</p></div>)}</div></Card>;
}

function Traceability({ data }: { data: OrcDetail }) {
  const groups = [["Ordens de serviço", data.serviceOrderNumbers], ["Requisições", data.requisitionNumbers], ["Pedidos de compra", data.purchaseOrderNumbers], ["Datas dos pedidos", data.purchaseOrderDates.map(formatDate)], ["Notas fiscais / DANFE", data.invoiceNumbers], ["Lançamentos de NF", data.invoiceLaunchDates.map(formatDate)]] as const;
  return <div className="space-y-3">{groups.map(([title, values]) => <Card key={title} className="p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{title}</h3><Link2 className="h-4 w-4 text-muted-foreground" /></div><div className="mt-3 flex flex-wrap gap-2">{values.length ? values.map((value) => <Badge variant="outline" className="font-mono" key={value}>{value}</Badge>) : <p className="text-sm text-muted-foreground">Nenhuma informação vinculada.</p>}</div></Card>)}</div>;
}

function Documents({ data }: { data: OrcDetail }) {
  return <div className="space-y-3">{data.documents.length ? data.documents.map((doc) => <Card key={doc.id} className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-subtle p-2.5 text-primary"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{doc.filename}</p><p className="mt-1 text-xs text-muted-foreground">{Math.round(doc.sizeBytes / 1024)} KB · {formatRelative(doc.createdAt)}</p></div><Button variant="ghost" size="icon" aria-label={`Baixar ${doc.filename}`} onClick={() => window.open(api.documentUrl(doc.id), "_blank", "noopener,noreferrer")}><Download className="h-4 w-4" /></Button></Card>) : <Card className="p-8 text-center"><Paperclip className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Nenhum documento anexado</p><p className="mt-1 text-xs text-muted-foreground">Orçamentos, pedidos e notas fiscais aparecerão aqui.</p></Card>}</div>;
}

function HistoryPanel({ data }: { data: OrcDetail }) {
  return <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-border">{data.history.map((event) => <div key={event.id} className="relative flex gap-4 py-3"><div className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary"><History className="h-4 w-4" /></div><div className="pt-0.5"><p className="text-sm font-medium">{event.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{event.description}{event.actor ? ` · ${event.actor}` : ""}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatRelative(event.createdAt)}</p></div></div>)}</div>;
}

function DrawerSkeleton({ onClose }: { onClose: () => void }) { return <><div className="flex items-start justify-between border-b border-border p-6"><div className="w-full"><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-8 w-4/5" /><Skeleton className="mt-3 h-4 w-2/3" /></div><button onClick={onClose}><X className="h-5 w-5" /></button></div><div className="space-y-5 p-6"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-72 rounded-2xl" /></div></>; }
