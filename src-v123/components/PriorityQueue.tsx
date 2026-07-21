import { ArrowRight, Clock3 } from "lucide-react";
import type { RowRecord } from "../types";
import { compactCurrency, normalize, numberValue } from "../lib/data";

export function PriorityQueue({ rows, onOpen }: { rows: RowRecord[]; onOpen: (row: RowRecord) => void }) {
  const pending = rows
    .filter((row) => normalize(row["ETAPA"]) !== "CONCLUÍDO")
    .sort((a, b) => numberValue(b["DIAS PARADO"]) - numberValue(a["DIAS PARADO"]))
    .slice(0, 5);

  return (
    <section className="v123-panel">
      <div className="v123-panel-head">
        <div>
          <span className="v123-eyebrow">Fila prioritária</span>
          <h2>Pendências mais antigas</h2>
        </div>
        <Clock3 size={18} className="v123-muted" />
      </div>
      <div className="v123-priority-list">
        {pending.map((row, index) => (
          <button type="button" className="v123-priority-row" key={`${normalize(row["_ROW_ID"])}-${index}`} onClick={() => onOpen(row)}>
            <span className="v123-priority-rank">{index + 1}</span>
            <span className="v123-priority-main">
              <strong>{normalize(row["FORNECEDOR"]) || "Fornecedor não informado"}</strong>
              <small>{normalize(row["ETAPA"])} · ORC {normalize(row["Nº ORÇAMENTO FINAL"]) || "—"}</small>
            </span>
            <span className="v123-priority-meta">
              <strong>{numberValue(row["DIAS PARADO"]).toLocaleString("pt-BR")} dias</strong>
              <small>{compactCurrency(numberValue(row["VALOR TOTAL"]))}</small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}
