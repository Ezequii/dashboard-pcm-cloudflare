import { CheckCircle2, FilePenLine, ReceiptText, ShoppingCart } from "lucide-react";
import type { RowRecord } from "../types";
import { compactCurrency, numberValue, normalize } from "../lib/data";

const stages = [
  { name: "SEM LANÇAMENTO", label: "Sem lançamento", icon: FilePenLine, tone: "red" },
  { name: "SEM PEDIDO", label: "Sem pedido", icon: ShoppingCart, tone: "amber" },
  { name: "SEM NF", label: "Sem NF", icon: ReceiptText, tone: "blue" },
  { name: "CONCLUÍDO", label: "Concluído", icon: CheckCircle2, tone: "green" },
] as const;

export function ProcessFlow({ rows, onStage }: { rows: RowRecord[]; onStage: (stage: string) => void }) {
  const total = rows.length || 1;
  return (
    <section className="v123-panel">
      <div className="v123-panel-head">
        <div>
          <span className="v123-eyebrow">Fluxo do processo</span>
          <h2>Distribuição por etapa</h2>
        </div>
        <span className="v123-muted">{rows.length.toLocaleString("pt-BR")} registros</span>
      </div>
      <div className="v123-flow-grid">
        {stages.map(({ name, label, icon: Icon, tone }) => {
          const stageRows = rows.filter((row) => normalize(row["ETAPA"]) === name);
          const value = stageRows.reduce((sum, row) => sum + numberValue(row["VALOR TOTAL"]), 0);
          const pct = Math.round((stageRows.length / total) * 100);
          return (
            <button className={`v123-flow-card v123-flow-card--${tone}`} type="button" key={name} onClick={() => onStage(name)}>
              <span className="v123-flow-icon"><Icon size={18} /></span>
              <span className="v123-flow-label">{label}</span>
              <strong>{stageRows.length.toLocaleString("pt-BR")}</strong>
              <small>{compactCurrency(value)} · {pct}%</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
