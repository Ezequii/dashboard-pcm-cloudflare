import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "orange";
}

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue"
}: KpiCardProps) {
  return (
    <article className="kpi-card">
      <div className={`kpi-card__icon kpi-card__icon--${tone}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="kpi-card__content">
        <span className="kpi-card__label">{label}</span>
        <strong className="kpi-card__value">{value}</strong>
        <span className="kpi-card__detail">{detail}</span>
      </div>
    </article>
  );
}
