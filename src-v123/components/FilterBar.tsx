import { SlidersHorizontal, RotateCcw } from "lucide-react";
import type { Filters } from "../types";

type Props = {
  filters: Filters;
  options: {
    solicitantes: string[];
    fornecedores: string[];
    etapas: string[];
    meses: string[];
  };
  onChange: (next: Filters) => void;
};

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="v123-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

export function FilterBar({ filters, options, onChange }: Props) {
  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <section className="v123-context-card" aria-label="Contexto atual">
      <div className="v123-context-head">
        <div>
          <div className="v123-eyebrow"><SlidersHorizontal size={15} /> Contexto atual</div>
          <strong>{hasFilters ? "Visão: Personalizada" : "Visão: Geral"}</strong>
        </div>
        {hasFilters && (
          <button
            className="v123-text-button"
            type="button"
            onClick={() => onChange({ solicitante: "", fornecedor: "", etapa: "", mes: "" })}
          >
            <RotateCcw size={14} /> Limpar tudo
          </button>
        )}
      </div>
      <div className="v123-filter-grid">
        <SelectField label="Solicitante" value={filters.solicitante} values={options.solicitantes}
          onChange={(value) => onChange({ ...filters, solicitante: value })} />
        <SelectField label="Fornecedor" value={filters.fornecedor} values={options.fornecedores}
          onChange={(value) => onChange({ ...filters, fornecedor: value })} />
        <SelectField label="Etapa" value={filters.etapa} values={options.etapas}
          onChange={(value) => onChange({ ...filters, etapa: value })} />
        <SelectField label="Mês" value={filters.mes} values={options.meses}
          onChange={(value) => onChange({ ...filters, mes: value })} />
      </div>
    </section>
  );
}
