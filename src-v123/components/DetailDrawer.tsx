import { ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { RowRecord } from "../types";
import { compactCurrency, normalize } from "../lib/data";

const priority = new Set([
  "DATA DE RECEBIMENTO",
  "Nº REQUISIÇÃO",
  "Nº PEDIDO DE COMPRA",
  "SOLICITANTE",
  "PREFIXO",
  "FORNECEDOR",
  "Nº ORÇAMENTO FINAL",
  "ETAPA",
]);

const ordered = [
  "ETAPA", "DIAS PARADO", "SLA STATUS", "DONO DA AÇÃO", "FAIXA ATRASO",
  "DATA DE RECEBIMENTO", "DATA LANÇAMENTO", "DATA DO PEDIDO", "DATA LANÇAMENTO NFS",
  "Nº ORÇAMENTO FINAL", "Nº ORDEM SERVIÇO", "Nº NFS/DANFE", "STATUS",
  "FORNECEDOR", "SOLICITANTE", "PREFIXO", "EQUIPAMENTO", "VALOR TOTAL",
  "VALOR SERVIÇO", "VALOR PEÇAS", "Nº REQUISIÇÃO", "Nº PEDIDO DE COMPRA",
  "MES_RECEBIMENTO"
];

export function DetailDrawer({
  row,
  onClose,
  onPrevious,
  onNext,
}: {
  row: RowRecord | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!row) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [row, onClose, onPrevious, onNext]);

  if (!row) return null;
  const orc = normalize(row["Nº ORÇAMENTO FINAL"]) || "—";

  return (
    <div className="v123-drawer-layer" role="presentation">
      <button className="v123-drawer-backdrop" type="button" aria-label="Fechar detalhes" onClick={onClose} />
      <aside className="v123-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes da ORC ${orc}`}>
        <header className="v123-drawer-head">
          <div>
            <span className="v123-eyebrow">Detalhes da ORC / OS</span>
            <h2>ORC {orc}</h2>
          </div>
          <button ref={closeRef} className="v123-icon-button" type="button" aria-label="Fechar" onClick={onClose}><X size={19}/></button>
        </header>
        <div className="v123-drawer-actions">
          <button type="button" onClick={onPrevious}><ChevronLeft size={16}/> Anterior</button>
          <button type="button" onClick={onNext}>Próxima <ChevronRight size={16}/></button>
          <button type="button" onClick={() => navigator.clipboard?.writeText(orc)}><Copy size={15}/> Copiar ORC</button>
        </div>
        <div className="v123-detail-grid">
          {ordered.map((field) => {
            const raw = row[field];
            const value = field.startsWith("VALOR ") ? compactCurrency(Number(raw || 0)) : normalize(raw) || "Não informado";
            const empty = value === "Não informado";
            return (
              <div className={`v123-detail-field${priority.has(field) ? " is-priority" : ""}`} key={field}>
                <span>{field}</span>
                <strong className={empty ? "is-empty" : ""}>{value}</strong>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
