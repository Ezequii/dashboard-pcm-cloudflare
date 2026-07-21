import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Hash,
  PackageCheck,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { OsOrcRecord } from "../types/osOrc";
import {
  formatCurrency,
  formatDate
} from "../lib/format";
import { StatusBadge } from "./StatusBadge";

interface DetailDrawerProps {
  record: OsOrcRecord | null;
  position: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

function Field({
  label,
  value,
  priority = false
}: {
  label: string;
  value: string;
  priority?: boolean;
}) {
  return (
    <div className={`detail-field ${priority ? "detail-field--priority" : ""}`}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export function DetailDrawer({
  record,
  position,
  total,
  onClose,
  onPrevious,
  onNext
}: DetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!record) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        onPrevious();
        return;
      }
      if (event.key === "ArrowRight") {
        onNext();
        return;
      }
      if (event.key !== "Tab") return;

      const drawer = document.querySelector<HTMLElement>(".detail-drawer");
      if (!drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [record, onClose, onNext, onPrevious]);

  if (!record) return null;

  return (
    <div className="drawer-layer" role="presentation">
      <button
        className="drawer-backdrop"
        type="button"
        aria-label="Fechar detalhes"
        onClick={onClose}
      />
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-drawer-title"
      >
        <header className="detail-drawer__header">
          <div>
            <span className="eyebrow">Detalhe do registro</span>
            <span className="detail-drawer__eyebrow">Detalhe do orçamento</span>
            <h2 id="detail-drawer-title" className="detail-drawer__orc">
              ORC {record.numeroOrcamento || "—"}
            </h2>
            <div className="detail-drawer__identity">
              <span className="detail-drawer__os"><strong>OS</strong> {record.numeroOrdemServico || "—"}</span>
              <span className="detail-drawer__supplier">{record.fornecedor || "Fornecedor não informado"}</span>
            </div>
            <div className="detail-drawer__status">
              <StatusBadge status={record.status} />
              <span>
                {position + 1} de {total}
              </span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="detail-drawer__body">
          <section className="detail-section">
            <div className="detail-section__title">
              <ClipboardCheck size={18} />
              <h3>Identificação</h3>
            </div>
            <div className="detail-grid">
              <Field
                label="Data de recebimento"
                value={formatDate(record.dataRecebimento)}
                priority
              />
              <Field
                label="Nº Ordem de Serviço"
                value={record.numeroOrdemServico}
                priority
              />
              <Field
                label="Nº Orçamento final"
                value={record.numeroOrcamento}
                priority
              />
              <Field label="Solicitante" value={record.solicitante} priority />
              <Field label="Prefixo" value={record.prefixo} priority />
              <Field label="Equipamento" value={record.equipamento} />
              <Field label="Fornecedor" value={record.fornecedor} priority />
            </div>
          </section>

          <section className="detail-section">
            <div className="detail-section__title">
              <CircleDollarSign size={18} />
              <h3>Valores</h3>
            </div>
            <div className="detail-grid detail-grid--three">
              <Field
                label="Serviço"
                value={formatCurrency(record.valorServico)}
              />
              <Field label="Peças" value={formatCurrency(record.valorPecas)} />
              <Field
                label="Valor total"
                value={formatCurrency(record.valorTotal)}
              />
            </div>
          </section>

          <section className="detail-section">
            <div className="detail-section__title">
              <PackageCheck size={18} />
              <h3>Andamento do processo</h3>
            </div>
            <div className="detail-grid">
              <Field
                label="Data lançamento"
                value={formatDate(record.dataLancamento)}
              />
              <Field
                label="Nº Requisição"
                value={record.numeroRequisicao}
                priority
              />
              <Field
                label="Nº Pedido de compra"
                value={record.numeroPedidoCompra}
                priority
              />
              <Field label="Data do pedido" value={formatDate(record.dataPedido)} />
              <Field label="Nº NFS / DANFE" value={record.numeroNfsDanfe} />
              <Field
                label="Data lançamento NFS"
                value={formatDate(record.dataLancamentoNfs)}
              />
            </div>
          </section>

          <section className="detail-section">
            <div className="detail-section__title">
              <FileText size={18} />
              <h3>Observações adicionais</h3>
            </div>
            <div className="detail-notes">
              {record.observacoes || "Nenhuma observação registrada."}
            </div>
          </section>

          <div className="detail-source">
            <Hash size={15} />
            Linha de origem na planilha: {record.sourceRow}
          </div>
        </div>

        <footer className="detail-drawer__footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onPrevious}
            disabled={position <= 0}
          >
            <ArrowLeft size={17} />
            Anterior
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onNext}
            disabled={position >= total - 1}
          >
            Próximo
            <ArrowRight size={17} />
          </button>
        </footer>
      </aside>
    </div>
  );
}
