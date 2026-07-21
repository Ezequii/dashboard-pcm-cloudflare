import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileClock,
  TrendingUp
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DatasetMetadata, OsOrcRecord } from "../types/osOrc";
import {
  buildMonthlySeries,
  buildPendingStatusSeries,
  oldestPending,
  topRequestersByPending,
  topSuppliersByPendingValue
} from "../lib/analytics";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatInteger,
  statusLabel
} from "../lib/format";
import { KpiCard } from "../components/KpiCard";
import { StatusBadge } from "../components/StatusBadge";

interface OverviewPageProps {
  records: OsOrcRecord[];
  metadata: DatasetMetadata;
  onOpenRecord: (record: OsOrcRecord) => void;
  onOpenConsulta: (preset: { supplier?: string; requester?: string; status?: string }) => void;
}

export function OverviewPage({
  records,
  metadata,
  onOpenRecord,
  onOpenConsulta
}: OverviewPageProps) {
  const monthly = useMemo(() => buildMonthlySeries(records), [records]);
  const pendingByStatus = useMemo(
    () => buildPendingStatusSeries(records),
    [records]
  );
  const suppliers = useMemo(
    () => topSuppliersByPendingValue(records),
    [records]
  );
  const requesters = useMemo(
    () => topRequestersByPending(records),
    [records]
  );
  const oldest = useMemo(() => oldestPending(records), [records]);

  const oldestItem = oldest[0];
  const completionRate =
    metadata.recordCount > 0
      ? (metadata.completedCount / metadata.recordCount) * 100
      : 0;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">PCM · OS &amp; Orçamentos</span>
          <h1>Visão Geral</h1>
          <p>
            Acompanhamento executivo dos orçamentos recebidos e do avanço até
            pedido, NF e conclusão.
          </p>
        </div>
        <div className="page-header__meta">
          <span>Base atual</span>
          <strong>{formatInteger(metadata.recordCount)} registros</strong>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Indicadores principais">
        <KpiCard
          label="Orçamentos pendentes"
          value={formatInteger(metadata.pendingCount)}
          detail={`${((metadata.pendingCount / metadata.recordCount) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da base`}
          icon={AlertTriangle}
          tone="amber"
        />
        <KpiCard
          label="Valor em andamento"
          value={formatCompactCurrency(metadata.pendingValue)}
          detail="Somatório dos registros pendentes"
          icon={TrendingUp}
          tone="blue"
        />
        <KpiCard
          label="Concluídos"
          value={formatInteger(metadata.completedCount)}
          detail={`${completionRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de conclusão`}
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Pendência mais antiga"
          value={oldestItem ? `${oldestItem.days} dias` : "—"}
          detail={oldestItem ? `ORC ${oldestItem.record.numeroOrcamento || "—"}` : "Sem pendências"}
          icon={Clock3}
          tone="orange"
        />
      </section>


      <section className="ranking-grid">
        <article className="section-card ranking-card ranking-card--premium">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Liderança</span>
              <h2>Solicitantes com mais pendências</h2>
              <small className="section-subcopy">Clique para abrir a Consulta já filtrada</small>
            </div>
          </div>
          <div className="ranking-list ranking-list--premium">
            {requesters.map((item, index) => {
              const max = Math.max(...requesters.map((entry) => entry.count), 1);
              const width = Math.max(8, Math.round((item.count / max) * 100));
              return (
                <button
                  type="button"
                  className="ranking-premium-row"
                  key={item.name}
                  onClick={() => onOpenConsulta({ requester: item.name })}
                >
                  <span className="ranking-premium-row__index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="ranking-premium-row__body">
                    <div className="ranking-premium-row__top">
                      <strong>{item.name}</strong>
                      <strong>{formatInteger(item.count)}</strong>
                    </div>
                    <div className="ranking-premium-row__meta">
                      <span>{formatInteger(item.count)} orçamentos</span>
                      <span>{formatCompactCurrency(item.value)}</span>
                    </div>
                    <div className="ranking-premium-row__bar">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        <article className="section-card ranking-card ranking-card--premium">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Financeiro</span>
              <h2>Fornecedores com maior valor pendente</h2>
              <small className="section-subcopy">Clique para abrir a Consulta já filtrada</small>
            </div>
          </div>
          <div className="ranking-list ranking-list--premium">
            {suppliers.map((item, index) => {
              const max = Math.max(...suppliers.map((entry) => entry.value), 1);
              const width = Math.max(8, Math.round((item.value / max) * 100));
              return (
                <button
                  type="button"
                  className="ranking-premium-row"
                  key={item.name}
                  onClick={() => onOpenConsulta({ supplier: item.name })}
                >
                  <span className="ranking-premium-row__index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="ranking-premium-row__body">
                    <div className="ranking-premium-row__top">
                      <strong>{item.name}</strong>
                      <strong>{formatCurrency(item.value)}</strong>
                    </div>
                    <div className="ranking-premium-row__meta">
                      <span>{formatInteger(item.count)} orçamentos pendentes</span>
                      <span>Valor em andamento</span>
                    </div>
                    <div className="ranking-premium-row__bar">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      </section>

      <section className="section-card oldest-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Prioridade</span>
            <h2>Pendências mais antigas</h2>
          </div>
          <FileClock size={20} />
        </div>

        <div className="oldest-list">
          {oldest.map(({ record, days }) => (
            <button
              type="button"
              className="oldest-row"
              key={record.id}
              onClick={() => onOpenRecord(record)}
            >
              <div>
                <strong><span className="oldest-identity__orc">ORC {record.numeroOrcamento || "—"}</span></strong>
                <span>
                  {record.fornecedor || "Fornecedor não informado"} ·{" "}
                  {formatDate(record.dataRecebimento)}
                </span>
              </div>
              <StatusBadge status={record.status} />
              <strong className="oldest-days">{days} dias</strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
