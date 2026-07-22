import {
  BarChart3,
  ClipboardList,
  LockKeyhole,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { AppPage, DatasetMetadata } from "../types/osOrc";
import { formatDateTime } from "../lib/format";

interface AppShellProps {
  page: AppPage;
  onPageChange: (page: AppPage) => void;
  metadata: DatasetMetadata;
  children: ReactNode;
}

const navItems = [
  { id: "overview" as const, label: "Visão Geral", icon: BarChart3 },
  { id: "consulta" as const, label: "Consulta", icon: ClipboardList }
];

export function AppShell({
  page,
  onPageChange,
  metadata,
  children
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = window.localStorage.getItem("pcm-sidebar-collapsed");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(max-width: 1280px)").matches;
  });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = window.localStorage.getItem("pcm-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("pcm-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("pcm-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [page]);

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${mobileMenuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">
            <img
              src={collapsed ? "/branding/app-icon.png" : "/branding/amaggi-logo.png"}
              alt="AMAGGI"
              className={`sidebar__logo ${collapsed ? "sidebar__logo--icon" : ""}`}
            />
          </div>
          <div className="sidebar__product">
            <span>PCM</span>
            <strong>Gestão de Orçamentos</strong>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Navegação principal">
          <span className="sidebar__nav-label">Navegação</span>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar__nav-item ${page === id ? "is-active" : ""}`}
              onClick={() => onPageChange(id)}
              aria-current={page === id ? "page" : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button
          type="button"
          className="sidebar__theme"
          onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
        </button>

        <button
            type="button"
            className="sidebar__collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span>{collapsed ? "Expandir" : "Recolher menu"}</span>
          </button>
          <div className="sidebar__security">
            <LockKeyhole size={17} />
            <div>
              <strong>Acesso corporativo</strong>
              <span>Protegido por Cloudflare Access</span>
            </div>
          </div>
          <div className="sidebar__dataset">
            <span>Base atualizada</span>
            <strong>{formatDateTime(metadata.generatedAt)}</strong>
          </div>
        </div>
      </aside>

      <button
        className="mobile-menu-button"
        type="button"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="app-main">{children}</main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={page === id ? "is-active" : ""}
            onClick={() => onPageChange(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
