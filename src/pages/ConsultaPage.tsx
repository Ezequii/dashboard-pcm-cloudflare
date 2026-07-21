import {
  Download,
  FilterX,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OsOrcRecord } from "../types/osOrc";
import {
  formatCurrency,
  formatDate,
  formatInteger,
  normalizeSearch,
  recordLabel
} from "../lib/format";
import { StatusBadge } from "../components/StatusBadge";
import { DetailDrawer } from "../components/DetailDrawer";

const PAGE_SIZE = 25;

interface ConsultaPageProps {
  records: OsOrcRecord[];
  initialRecord: OsOrcRecord | null;
  onInitialRecordConsumed: () => void;
  preset: { supplier?: string; requester?: string; status?: string } | null;
  onPresetConsumed: () => void;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function ConsultaPage({
  records,
  initialRecord,
  onInitialRecordConsumed,
  preset,
  onPresetConsumed
}: ConsultaPageProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [supplier, setSupplier] = useState("TODOS");
  const [requester, setRequester] = useState("TODOS");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<OsOrcRecord | null>(null);
  const [contextLabel, setContextLabel] = useState("");

  const suppliers = useMemo(
    () =>
      [...new Set(records.map((r) => r.fornecedor).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
    [records]
  );

  const requesters = useMemo(
    () =>
      [...new Set(records.map((r) => r.solicitante).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
    [records]
  );

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);

    return records.filter((record) => {
      if (status !== "TODOS" && record.status !== status) return false;
      if (supplier !== "TODOS" && record.fornecedor !== supplier) return false;
      if (requester !== "TODOS" && record.solicitante !== requester) return false;

      if (!query) return true;

      const haystack = normalizeSearch(
        [
          record.numeroOrdemServico,
          record.numeroOrcamento,
          record.numeroRequisicao,
          record.numeroPedidoCompra,
          record.numeroNfsDanfe,
          record.fornecedor,
          record.prefixo,
          record.equipamento,
          record.solicitante,
          record.observacoes
        ].join(" ")
      );

      return haystack.includes(query);
    });
  }, [records, requester, search, status, supplier]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectedIndex = selected
    ? filtered.findIndex((record) => record.id === selected.id)
    : -1;

  useEffect(() => {
    setPage(0);
  }, [search, status, supplier, requester]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  useEffect(() => {
    if (!initialRecord) return;
    setSelected(initialRecord);
    onInitialRecordConsumed();
  }, [initialRecord, onInitialRecordConsumed]);

  useEffect(() => {
    if (!preset) return;
    setSearch("");
    setStatus(preset.status ?? "TODOS");
    setSupplier(preset.supplier ?? "TODOS");
    setRequester(preset.requester ?? "TODOS");
    setPage(0);

    if (preset.requester) {
      setContextLabel(`Solicitante: ${preset.requester}`);
    } else if (preset.supplier) {
      setContextLabel(`Fornecedor: ${preset.supplier}`);
    } else if (preset.status) {
      setContextLabel(`Etapa: ${preset.status === "FALTA O PEDIDO" ? "Falta pedido" : preset.status === "FALTA LANÇAMENTO" ? "Falta lançamento" : preset.status === "FALTA NF" ? "Falta NF" : "Concluído"}`);
    }

    onPresetConsumed();
  }, [preset, onPresetConsumed]);

  const clearFilters = () => {
    setSearch("");
    setStatus("TODOS");
    setSupplier("TODOS");
    setRequester("TODOS");
    setContextLabel("");
  };

  const exportCsv = () => {
    const headers = [
      "Data recebimento",
      "OS",
      "ORC",
      "Prefixo",
      "Equipamento",
      "Fornecedor",
      "Solicitante",
      "Requisição",
      "Pedido",
      "Valor total",
      "Status"
    ];

    const rows = filtered.map((record) => [
      formatDate(record.dataRecebimento),
      record.numeroOrdemServico,
      record.numeroOrcamento,
      record.prefixo,
      record.equipamento,
      record.fornecedor,
      record.solicitante,
      record.numeroRequisicao,
      record.numeroPedidoCompra,
      record.valorTotal.toFixed(2).replace(".", ","),
      record.status
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(";"))
      .join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "consulta-os-orc.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const moveSelection = (direction: -1 | 1) => {
    if (selectedIndex < 0) return;
    const next = filtered[selectedIndex + direction];
    if (next) setSelected(next);
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Base operacional</span>
          <h1>Consulta de OS &amp; Orçamentos</h1>
          <p>
            Pesquise qualquer ponto do processo: OS, ORC, requisição, pedido,
            fornecedor, prefixo ou solicitante.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={exportCsv}>
          <Download size={18} />
          Exportar CSV
        </button>
      </header>

      {contextLabel && (
        <div className="consulta-context" role="status">
          <div>
            <span className="consulta-context__label">Contexto vindo da Visão Geral</span>
            <strong>{contextLabel}</strong>
          </div>
          <button type="button" className="ghost-button" onClick={clearFilters}>
            Limpar contexto
          </button>
        </div>
      )}

      <section className="section-card filters-card">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar OS, ORC, requisição, pedido, fornecedor, prefixo..."
            aria-label="Pesquisar registros"
          />
        </div>

        <div className="filter-row">
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="TODOS">Todos os status</option>
              <option value="FALTA LANÇAMENTO">Falta lançamento</option>
              <option value="FALTA O PEDIDO">Falta pedido</option>
              <option value="FALTA NF">Falta NF</option>
              <option value="CONCLUÍDO">Concluído</option>
            </select>
          </label>

          <label>
            <span>Fornecedor</span>
            <select
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
            >
              <option value="TODOS">Todos os fornecedores</option>
              {suppliers.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Solicitante</span>
            <select
              value={requester}
              onChange={(event) => setRequester(event.target.value)}
            >
              <option value="TODOS">Todos os solicitantes</option>
              {requesters.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="ghost-button" onClick={clearFilters}>
            <FilterX size={17} />
            Limpar
          </button>
        </div>
      </section>

      <section className="section-card table-card">
        <div className="table-card__header">
          <div>
            <span className="eyebrow">Resultado</span>
            <h2>{formatInteger(filtered.length)} registros encontrados</h2>
          </div>
          <div className="table-card__summary">
            <SlidersHorizontal size={17} />
            Página {page + 1} de {totalPages}
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recebimento</th>
                <th>OS / ORC</th>
                <th>Prefixo / Equipamento</th>
                <th>Fornecedor</th>
                <th>Requisição</th>
                <th>Pedido</th>
                <th className="align-right">Valor</th>
                <th>Etapa</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((record) => (
                <tr
                  key={record.id}
                  tabIndex={0}
                  onClick={() => setSelected(record)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(record);
                    }
                  }}
                >
                  <td>{formatDate(record.dataRecebimento)}</td>
                  <td>
                    <strong className="table-primary">{recordLabel(record)}</strong>
                    <span className="table-secondary">{record.solicitante || "—"}</span>
                  </td>
                  <td>
                    <strong className="table-primary">{record.prefixo || "—"}</strong>
                    <span className="table-secondary">{record.equipamento || "—"}</span>
                  </td>
                  <td>{record.fornecedor || "—"}</td>
                  <td>{record.numeroRequisicao || "—"}</td>
                  <td>{record.numeroPedidoCompra || "—"}</td>
                  <td className="align-right">{formatCurrency(record.valorTotal)}</td>
                  <td><StatusBadge status={record.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-result-list">
          {visible.map((record) => (
            <button
              type="button"
              className="mobile-result-card"
              key={record.id}
              onClick={() => setSelected(record)}
            >
              <div className="mobile-result-card__top">
                <strong>{recordLabel(record)}</strong>
                <StatusBadge status={record.status} />
              </div>
              <span>{record.fornecedor || "Fornecedor não informado"}</span>
              <div className="mobile-result-card__bottom">
                <span>{formatDate(record.dataRecebimento)}</span>
                <strong>{formatCurrency(record.valorTotal)}</strong>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <Search size={24} />
            <strong>Nenhum registro encontrado</strong>
            <span>Revise a busca ou limpe os filtros aplicados.</span>
          </div>
        )}

        <div className="pagination">
          <span>
            Exibindo{" "}
            {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de{" "}
            {formatInteger(filtered.length)}
          </span>
          <div>
            <button
              type="button"
              className="secondary-button"
              disabled={page === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      </section>

      <DetailDrawer
        record={selected}
        position={selectedIndex}
        total={filtered.length}
        onClose={() => setSelected(null)}
        onPrevious={() => moveSelection(-1)}
        onNext={() => moveSelection(1)}
      />
    </div>
  );
}
