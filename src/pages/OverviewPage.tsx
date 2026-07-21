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
  recordLabel,
  statusLabel
} from "../lib/format";
import { KpiCard } from "../components/KpiCard";
import { StatusBadge } from "../components/StatusBadge";

interface OverviewPageProps {
  records: OsOrcRecord[];
  metadata: DatasetMetadata;
  onOpenRecord: (record: OsOrcRecord) => void;
}

export function OverviewPage({
  records,
  metadata,
  onOpenRecord
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
            Acompanhamento executivo dos OS/ORCs recebidos e do avanço até
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
          label="OS/ORCs pendentes"
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
          detail={oldestItem ? recordLabel(oldestItem.record) : "Sem pendências"}
          icon={Clock3}
          tone="orange"
        />
      </section>

      <section className="section-card process-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Fluxo operacional</span>
            <h2>Etapa atual dos registros</h2>
          </div>
          <span className="section-heading__note">
            Cada OS/ORC aparece em uma única etapa
          </span>
        </div>

        <div className="process-flow">
          {[
            ["FALTA LANÇAMENTO", "01", "Recebido"],
            ["FALTA O PEDIDO", "02", "Lançado"],
            ["FALTA NF", "03", "Pedido emitido"],
            ["CONCLUÍDO", "04", "Finalizado"]
          ].map(([status, step, label]) => {
            const count = metadata.statusCounts[status] ?? 0;
            return (
              <div className="process-step" key={status}>
                <div className="process-step__number">{step}</div>
                <div className="process-step__content">
                  <span>{label}</span>
                  <strong>{formatInteger(count)}</strong>
                  <small>{statusLabel(status)}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="analytics-grid">
        <article className="section-card chart-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Volume</span>
              <h2>OS/ORCs recebidos por mês</h2>
            </div>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="monthlyArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0874a6" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0874a6" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5ebef" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [formatInteger(Number(value)), "Recebidos"]}
                  contentStyle={{ borderRadius: 12, borderColor: "#dce5ea" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0874a6"
                  strokeWidth={2.5}
                  fill="url(#monthlyArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="section-card chart-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Pendências</span>
              <h2>Concentração por etapa</h2>
            </div>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pendingByStatus}
                layout="vertical"
                margin={{ top: 12, right: 24, left: 18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5ebef" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={104}
                />
                <Tooltip
                  formatter={(value) => [formatInteger(Number(value)), "Registros"]}
                  contentStyle={{ borderRadius: 12, borderColor: "#dce5ea" }}
                />
                <Bar dataKey="total" fill="#e59f2b" radius={[0, 7, 7, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="ranking-grid">
        <article className="section-card ranking-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Financeiro</span>
              <h2>Fornecedores com maior valor pendente</h2>
            </div>
          </div>
          <div className="ranking-list">
            {suppliers.map((item, index) => (
              <div className="ranking-row" key={item.name}>
                <span className="ranking-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="ranking-name">
                  <strong>{item.name}</strong>
                  <span>Valor em andamento</span>
                </div>
                <strong className="ranking-value">{formatCurrency(item.value)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="section-card ranking-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Responsáveis</span>
              <h2>Solicitantes com mais pendências</h2>
            </div>
          </div>
          <div className="ranking-list">
            {requesters.map((item, index) => (
              <div className="ranking-row" key={item.name}>
                <span className="ranking-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="ranking-name">
                  <strong>{item.name}</strong>
                  <span>OS/ORCs pendentes</span>
                </div>
                <strong className="ranking-value">{formatInteger(item.value)}</strong>
              </div>
            ))}
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
                <strong>{recordLabel(record)}</strong>
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
