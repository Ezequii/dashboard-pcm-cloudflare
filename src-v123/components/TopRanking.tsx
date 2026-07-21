import { Trophy } from "lucide-react";
import type { RowRecord } from "../types";
import { compactCurrency, normalize, numberValue } from "../lib/data";

function rank(rows: RowRecord[], key: string) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const label = normalize(row[key]) || "Não informado";
    map.set(label, (map.get(label) || 0) + numberValue(row["VALOR TOTAL"]));
  });
  return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0,3);
}

export function TopRanking({ rows }: { rows: RowRecord[] }) {
  const suppliers = rank(rows, "FORNECEDOR");
  const requesters = rank(rows, "SOLICITANTE");
  return (
    <section className="v123-panel">
      <div className="v123-panel-head">
        <div>
          <span className="v123-eyebrow"><Trophy size={15} /> Top 3 do contexto</span>
          <h2>Maiores valores</h2>
        </div>
      </div>
      <div className="v123-ranking-grid">
        {[["Fornecedores com maior valor geral", suppliers], ["Solicitantes com maior valor geral", requesters]].map(([title, items]) => (
          <article className="v123-ranking-card" key={title as string}>
            <h3>{title as string}</h3>
            {(items as [string, number][]).map(([label, value], index) => (
              <div className="v123-ranking-row" key={label}>
                <span>{index + 1}</span>
                <strong>{label}</strong>
                <small>{compactCurrency(value)}</small>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
