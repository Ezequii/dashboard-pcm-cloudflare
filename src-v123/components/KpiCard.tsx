import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
  onClick?: () => void;
};

export function KpiCard({ title, value, subtitle, icon: Icon, tone = "blue", onClick }: Props) {
  const interactive = Boolean(onClick);
  return (
    <article
      className={`v123-kpi v123-kpi--${tone}${interactive ? " is-interactive" : ""}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="v123-kpi__icon"><Icon size={20} strokeWidth={1.9} /></div>
      <div className="v123-kpi__body">
        <span className="v123-kpi__title">{title}</span>
        <strong className="v123-kpi__value">{value}</strong>
        <span className="v123-kpi__subtitle">{subtitle}</span>
      </div>
    </article>
  );
}
