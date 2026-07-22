import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, History, Loader2, RotateCcw, UploadCloud, X } from "lucide-react";
import * as React from "react";
import { api } from "@/lib/api";
import { parseWorkbook, type ImportOrcRow } from "@/lib/importer";
import { formatNumber, formatRelative } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Progress, Skeleton } from "@/components/ui";

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const { data: history, isLoading } = useQuery({ queryKey: ["imports"], queryFn: api.imports });
  const [file, setFile] = React.useState<File | null>(null);
  const [rows, setRows] = React.useState<ImportOrcRow[]>([]);
  const [sheet, setSheet] = React.useState("");
  const [issueCount, setIssueCount] = React.useState(0);
  const [status, setStatus] = React.useState<"idle" | "parsing" | "ready" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectFile = async (selected?: File) => {
    if (!selected) return;
    setStatus("parsing"); setMessage(""); setFile(selected); setProgress(8);
    try {
      const parsed = await parseWorkbook(selected);
      setRows(parsed.rows); setSheet(parsed.sheetName); setIssueCount(parsed.issues); setProgress(100); setStatus("ready");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao ler o arquivo"); setStatus("error"); }
  };
  const reset = () => { setFile(null); setRows([]); setSheet(""); setIssueCount(0); setProgress(0); setStatus("idle"); setMessage(""); if (inputRef.current) inputRef.current.value = ""; };
  const confirm = async () => {
    if (!file || !rows.length) return;
    setStatus("uploading"); setProgress(3); setMessage("Enviando arquivo original para o R2...");
    try {
      const form = new FormData(); form.append("file", file); form.append("sheetName", sheet); form.append("totalRows", String(rows.length));
      const { batchId } = await api.startImport(form);
      const chunkSize = 12; // compatível com o limite de consultas por invocação do D1 no plano Free
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunkIndex = Math.floor(i / chunkSize);
        setMessage(`Processando registros ${i + 1}–${Math.min(i + chunkSize, rows.length)}...`);
        await api.importChunk(batchId, rows.slice(i, i + chunkSize), chunkIndex);
        setProgress(8 + Math.round(((i + chunkSize) / rows.length) * 86));
      }
      setMessage("Finalizando importação e atualizando indicadores...");
      await api.finalizeImport(batchId);
      setProgress(100); setStatus("done");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["imports"] }), queryClient.invalidateQueries({ queryKey: ["overview"] }), queryClient.invalidateQueries({ queryKey: ["orcs"] })]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na importação"); setStatus("error"); }
  };

  return <>
    <PageHeader title="Importações" description="Atualize a base com segurança. Os dados confirmados ficam disponíveis para todos os usuários do link." actions={<Button variant="outline" asChild><a href="/modelo-importacao-orcs.csv" download><Download className="h-4 w-4" />Baixar modelo</a></Button>} />
    <section className="grid gap-5 xl:grid-cols-[1fr_.72fr]">
      <Card className="overflow-hidden"><CardHeader><div><CardTitle>Nova importação</CardTitle><CardDescription>Arquivo XLSX ou CSV com a base de acompanhamento dos ORCs.</CardDescription></div><UploadCloud className="h-5 w-5 text-primary" /></CardHeader><CardContent>
        {status === "idle" && <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void selectFile(e.dataTransfer.files[0]); }} className="soft-grid flex min-h-[330px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/[.018] px-6 text-center transition hover:border-primary/55 hover:bg-primary/[.03]"><div className="rounded-2xl bg-primary-subtle p-4 text-primary"><FileSpreadsheet className="h-8 w-8" /></div><h3 className="mt-5 text-lg font-semibold">Arraste sua planilha para esta área</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">A V1 reconhece automaticamente a aba “Acompanhamento RC 2026” e o cabeçalho real da planilha atual.</p><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => void selectFile(e.target.files?.[0])} /><Button className="mt-6" onClick={() => inputRef.current?.click()}>Selecionar arquivo</Button><p className="mt-3 text-xs text-muted-foreground">XLSX ou CSV · recomendado até 25 MB</p></div>}
        {status === "parsing" && <div className="flex min-h-[330px] flex-col items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 font-medium">Analisando estrutura da planilha</p><p className="mt-1 text-sm text-muted-foreground">Localizando colunas, datas e relacionamentos...</p><Progress className="mt-6 w-64" value={progress} /></div>}
        {(status === "ready" || status === "uploading" || status === "done") && <div className="space-y-5"><div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/35 p-4"><div className="rounded-xl bg-success-subtle p-2.5 text-success"><FileSpreadsheet className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file?.name}</p><p className="mt-1 text-xs text-muted-foreground">{sheet} · {file ? Math.round(file.size / 1024) : 0} KB</p></div>{status === "ready" && <button onClick={reset} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>}</div>
          <div className="grid gap-3 sm:grid-cols-3"><Summary label="Registros encontrados" value={rows.length} tone="primary" /><Summary label="Para revisar" value={issueCount} tone="warning" /><Summary label="Sem alerta" value={rows.length - issueCount} tone="success" /></div>
          {status === "ready" && <><div className="overflow-hidden rounded-2xl border border-border"><div className="border-b border-border bg-muted/35 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[.07em] text-muted-foreground">Prévia dos dados</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-4 py-3">Linha</th><th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3">ORC</th><th className="px-4 py-3">Equipamento</th><th className="px-4 py-3">Resultado</th></tr></thead><tbody>{rows.slice(0,6).map((row) => <tr key={row.sourceRowNumber} className="border-b border-border/60 last:border-0"><td className="px-4 py-3 font-mono">{row.sourceRowNumber}</td><td className="max-w-[180px] truncate px-4 py-3">{row.supplier || "—"}</td><td className="px-4 py-3 font-mono">{row.externalQuoteNumber || "—"}</td><td className="max-w-[220px] truncate px-4 py-3">{row.equipment || "—"}</td><td className="px-4 py-3">{row.issues.length ? <Badge variant="warning">{row.issues.length} alerta(s)</Badge> : <Badge variant="success">Válido</Badge>}</td></tr>)}</tbody></table></div></div><div className="flex flex-col justify-between gap-3 rounded-2xl bg-primary-subtle p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-primary">Pronto para atualizar a base compartilhada</p><p className="mt-1 text-xs text-muted-foreground">A confirmação cria ou atualiza registros no D1 e salva o arquivo original no R2.</p></div><Button onClick={confirm}><UploadCloud className="h-4 w-4" />Confirmar importação</Button></div></>}
          {status === "uploading" && <div className="rounded-2xl border border-border p-5"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /><div><p className="text-sm font-semibold">Importação em andamento</p><p className="mt-1 text-xs text-muted-foreground">{message}</p></div></div><Progress className="mt-5" value={progress} /><p className="mt-2 text-right text-xs font-semibold text-primary">{progress}%</p></div>}
          {status === "done" && <div className="rounded-2xl border border-success/20 bg-success-subtle p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-success" /><h3 className="mt-3 font-semibold">Base atualizada com sucesso</h3><p className="mt-1 text-sm text-muted-foreground">Os demais dispositivos verão os novos dados ao atualizar ou em até 60 segundos.</p><Button variant="outline" className="mt-5" onClick={reset}>Importar outro arquivo</Button></div>}
        </div>}
        {status === "error" && <div className="flex min-h-[330px] flex-col items-center justify-center text-center"><div className="rounded-2xl bg-destructive/10 p-4 text-destructive"><AlertTriangle className="h-8 w-8" /></div><h3 className="mt-4 font-semibold">Não foi possível concluir</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p><Button variant="outline" className="mt-5" onClick={reset}><RotateCcw className="h-4 w-4" />Tentar novamente</Button></div>}
      </CardContent></Card>
      <Card><CardHeader><div><CardTitle className="flex items-center gap-2"><History className="h-4 w-4 text-primary" />Histórico de importações</CardTitle><CardDescription>Arquivos processados, usuários e resultados.</CardDescription></div></CardHeader><CardContent className="space-y-2">{isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : history?.length ? history.map((batch) => <div key={batch.id} className="rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-muted/45"><div className="flex items-start gap-3"><div className="rounded-xl bg-muted p-2.5 text-muted-foreground"><FileSpreadsheet className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{batch.filename}</p><p className="mt-1 text-xs text-muted-foreground">{batch.createdBy} · {formatRelative(batch.createdAt)}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px]"><Badge variant="success">{formatNumber(batch.createdRows)} novos</Badge><Badge variant="default">{formatNumber(batch.updatedRows)} atualizados</Badge>{batch.issueRows > 0 && <Badge variant="warning">{formatNumber(batch.issueRows)} alertas</Badge>}</div></div></div></div>) : <EmptyState title="Nenhuma importação" description="O histórico aparecerá após a primeira atualização da base." />}</CardContent></Card>
    </section>
  </>;
}
function Summary({ label, value, tone }: { label: string; value: number; tone: "primary" | "warning" | "success" }) { const c = tone === "primary" ? "text-primary bg-primary-subtle" : tone === "warning" ? "text-warning bg-warning-subtle" : "text-success bg-success-subtle"; return <div className={`rounded-2xl p-4 ${c}`}><p className="numeric text-2xl font-semibold">{formatNumber(value)}</p><p className="mt-1 text-xs font-medium opacity-80">{label}</p></div>; }
