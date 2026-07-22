import { statusLabel } from "../lib/format";

export function StatusBadge({ status }: { status: string }) {
  const normalized =
    status === "CONCLUÍDO"
      ? "success"
      : status === "FALTA NF"
        ? "warning"
        : status === "FALTA O PEDIDO"
          ? "orange"
          : "info";

  return (
    <span className={`status-badge status-badge--${normalized}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
