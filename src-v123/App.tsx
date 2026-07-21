import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  Layers3,
  RefreshCw,
  SearchCheck,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ExecutivePayload, Filters, PublicationStatus, RowRecord, ViewName } from "./types";
import { applyFilters, compactCurrency, contextLabel, loadDashboardData, normalize, numberValue, uniqueValues } from "./lib/data";
import { KpiCard } from "./components/KpiCard";
import { FilterBar } from "./components/FilterBar";
import { ProcessFlow } from "./components/ProcessFlow";
import { PriorityQueue } from "./components/PriorityQueue";
import { TopRanking } from "./components/TopRanking";
import { DataTable } from "./components/DataTable";
import { DetailDrawer } from "./components/DetailDrawer";

const EMPTY_FILTERS: Filters = { solicitante: "", fornecedor: "", etapa: "", mes: "" };

export default function App() {
  const [executive, setExecutive] = useState<ExecutivePayload | null>(null);
  const [publication, setPublication] = useState<PublicationStatus | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewName>("executive");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedRow, setSelectedRow] = useState<RowRecord | null>(null);

  const reload = async () => {
    try {
      setError("");
      const data = await loadDashboardData();
      setExecutive(data.executive);
      setPublication(data.publication);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar dados.");
    }
  };

  useEffect(() => { void reload(); }, []);

  const allRows = executive?.rows || [];
  const rows = useMemo(() => applyFilters(allRows, filters), [allRows, filters]);

  const options = useMemo(() => ({
    solicitantes: uniqueValues(allRows, "SOLICITANTE"),
    fornecedores: uniqueValues(allRows, "FORNECEDOR"),
    etapas: uniqueValues(allRows, "ETAPA"),
    meses: uniqueValues(allRows, "MES_RECEBIMENTO"),
  }), [allRows]);

  const pending = rows.filter((row) => normalize(row["ETAPA"]) !== "CONCLUÍDO");
  const concluded = rows.length - pending.length;
  const pendingValue = pending.reduce((sum, row) => sum + numberValue(row["VALOR TOTAL"]), 0);
  const completion = rows.length ? concluded / rows.length * 100 : 0;
  const oldest = [...pending].sort((a,b) => numberValue(b["DIAS PARADO"]) - numberValue(a["DIAS PARADO"]))[0];

  const supplierTotals = new Map<string, { value: number; count: number; maxDays: number }>();
  pending.forEach((row) => {
    const supplier = normalize(row["FORNECEDOR"]) || "Não informado";
    const current = supplierTotals.get(supplier) || { value: 0, count: 0, maxDays: 0 };
    current.value += numberValue(row["VALOR TOTAL"]);
    current.count += 1;
    current.maxDays = Math.max(current.maxDays, numberValue(row["DIAS PARADO"]));
    supplierTotals.set(supplier, current);
  });
  const focus = [...supplierTotals.entries()].sort((a,b) => b[1].value - a[1].value)[0];

  const openRow = (row: RowRecord) => setSelectedRow(row);
  const moveSelected = (delta: number) => {
    if (!selectedRow || !rows.length) return;
    const currentIndex = rows.findIndex((row) => row["_ROW_ID"] === selectedRow["_ROW_ID"]);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + delta + rows.length) % rows.length;
    setSelectedRow(rows[nextIndex]);
  };

  const publishedAt = publication?.published_at
    ? new Date(publication.published_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "—";

  if (error) {
    return <main className="v123-status-page"><div><strong>Não foi possível abrir a prévia.</strong><p>{error}</p><button onClick={() => void reload()}>Tentar novamente</button></div></main>;
  }
  if (!executive) {
    return <main className="v123-status-page"><div className="v123-loader"/><p>Carregando prévia React...</p></main>;
  }

  return (
    <div className="v123-app">
      <header className="v123-topbar">
        <div className="v123-brand">
          <img src="/static/logo_amaggi.png" alt="AMAGGI" />
          <div>
            <div className="v123-brand-line">
              <h1>Controle de Requisições PCM</h1>
              <span>V123 · React Preview</span>
            </div>
            <p>Arquitetura visual experimental — mesmos dados publicados</p>
          </div>
        </div>

        <nav className="v123-tabs" aria-label="Navegação principal">
          <button className={view === "executive" ? "is-active" : ""} type="button" onClick={() => setView("executive")}>
            <BarChart3 size={17}/> <span>Visão Executiva<small>Indicadores e prioridades</small></span>
          </button>
          <button className={view === "base" ? "is-active" : ""} type="button" onClick={() => setView("base")}>
            <Database size={17}/> <span>Base de Tratativa<small>Registros operacionais</small></span>
          </button>
        </nav>

        <div className="v123-top-actions">
          <div className="v123-status-chip">
            <strong>{(publication?.records ?? rows.length).toLocaleString("pt-BR")} registros</strong>
            <small>Atualizado {publishedAt}</small>
          </div>
          <button className="v123-refresh" type="button" onClick={() => void reload()}><RefreshCw size={16}/> Recarregar</button>
        </div>
      </header>

      <main className="v123-page">
        <FilterBar filters={filters} options={options} onChange={setFilters} />

        {view === "executive" ? (
          <>
            <section className="v123-kpi-grid" aria-label="Indicadores principais">
              <KpiCard title="Valor em andamento" value={compactCurrency(pendingValue)}
                subtitle={`${pending.length.toLocaleString("pt-BR")} ORCs/OSs pendentes`} icon={CircleDollarSign} tone="blue"
                onClick={() => { setFilters({ ...filters, etapa: "" }); setView("base"); }} />
              <KpiCard title="ORÇs/OSs em andamento" value={pending.length.toLocaleString("pt-BR")}
                subtitle="Lançamento · pedido · NF" icon={Layers3} tone="slate"
                onClick={() => setView("base")} />
              <KpiCard title="Processo concluído" value={`${completion.toFixed(1).replace(".", ",")}%`}
                subtitle={`${concluded.toLocaleString("pt-BR")} de ${rows.length.toLocaleString("pt-BR")}`} icon={CheckCircle2} tone="green"
                onClick={() => { setFilters({ ...filters, etapa: "CONCLUÍDO" }); setView("base"); }} />
              <KpiCard title="Primeiro foco recomendado" value={focus?.[0] || "Sem pendências"}
                subtitle={focus ? `${focus[1].count} ORCs/OSs · ${compactCurrency(focus[1].value)}` : "Contexto sem prioridade"} icon={Target} tone="amber"
                onClick={focus ? () => { setFilters({ ...filters, fornecedor: focus[0] }); setView("base"); } : undefined} />
              <KpiCard title="Pendência mais antiga" value={oldest ? `${numberValue(oldest["DIAS PARADO"])} dias` : "—"}
                subtitle={oldest ? `${normalize(oldest["ETAPA"])} · ORC ${normalize(oldest["Nº ORÇAMENTO FINAL"]) || "—"}` : "Sem pendências"} icon={Clock3} tone="red"
                onClick={oldest ? () => openRow(oldest) : undefined} />
            </section>

            <section className="v123-two-column">
              <ProcessFlow rows={rows} onStage={(stage) => setFilters({ ...filters, etapa: stage })} />
              <PriorityQueue rows={rows} onOpen={openRow} />
            </section>

            <TopRanking rows={rows} />
          </>
        ) : (
          <DataTable rows={rows} onOpen={openRow} />
        )}

        <footer className="v123-footer">
          <span>Prévia experimental React/TypeScript sobre Vite</span>
          <span>Contexto: {contextLabel(filters)}</span>
        </footer>
      </main>

      <DetailDrawer
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onPrevious={() => moveSelected(-1)}
        onNext={() => moveSelected(1)}
      />
    </div>
  );
}
