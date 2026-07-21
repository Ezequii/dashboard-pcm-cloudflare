import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { RowRecord } from "../types";
import { compactCurrency, normalize } from "../lib/data";

const columns = [
  "ETAPA",
  "DATA DE RECEBIMENTO",
  "Nº PEDIDO DE COMPRA",
  "DIAS PARADO",
  "Nº REQUISIÇÃO",
  "Nº ORÇAMENTO FINAL",
  "VALOR TOTAL",
  "FORNECEDOR",
  "SOLICITANTE",
  "PREFIXO",
];

export function DataTable({ rows, onOpen }: { rows: RowRecord[]; onOpen: (row: RowRecord) => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    if (!q) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => normalize(value).toLocaleLowerCase("pt-BR").includes(q))
    );
  }, [rows, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pages);
  const current = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <section className="v123-table-panel">
      <div className="v123-table-toolbar">
        <div className="v123-table-title">
          <span className="v123-eyebrow">Registros</span>
          <strong>{filtered.length.toLocaleString("pt-BR")} encontrados</strong>
        </div>
        <label className="v123-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="O que você quer encontrar?"
          />
        </label>
        <button className="v123-secondary-button" type="button"><SlidersHorizontal size={16}/> Filtros avançados</button>
        <div className="v123-pagination">
          <button type="button" aria-label="Página anterior" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17}/></button>
          <span>{safePage} / {pages}</span>
          <button type="button" aria-label="Próxima página" disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><ChevronRight size={17}/></button>
        </div>
      </div>
      <div className="v123-table-scroll">
        <table>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {current.map((row, index) => (
              <tr key={`${normalize(row["_ROW_ID"])}-${index}`} onClick={() => onOpen(row)}>
                {columns.map((column) => (
                  <td key={column}>
                    {column === "VALOR TOTAL"
                      ? compactCurrency(Number(row[column] || 0))
                      : normalize(row[column]) || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
