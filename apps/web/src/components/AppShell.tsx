import { Activity, Bell, Download, LayoutDashboard, LineChart, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun } from "lucide-react";
import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";

const nav = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/acompanhamento", label: "Acompanhamento", icon: Activity },
  { to: "/analises", label: "Análises", icon: LineChart },
  { to: "/importacoes", label: "Importações", icon: Download },
  { to: "/configuracoes", label: "Configurações", icon: Settings }
];

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem("pcm-sidebar") === "collapsed");
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 5 * 60_000 });
  const userName = currentUser?.name ?? "Usuário";
  const initials = userName.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "US";
  const roleLabel = ({ admin: "Administrador", analyst: "Analista PCM", manager: "Gestor", requester: "Solicitante", viewer: "Leitura", auditor: "Auditor" } as const)[currentUser?.role ?? "viewer"];
  React.useEffect(() => localStorage.setItem("pcm-sidebar", collapsed ? "collapsed" : "expanded"), [collapsed]);
  return <div className="min-h-screen bg-background">
    <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-border/80 bg-card/95 backdrop-blur-xl transition-[width] duration-200 lg:flex lg:flex-col", collapsed ? "w-[76px]" : "w-[244px]")}>
      <div className={cn("flex h-[68px] items-center border-b border-border/70", collapsed ? "justify-center px-3" : "px-5")}>
        <img src="/amaggi-logo.png" alt="AMAGGI" className={cn("object-contain object-left transition-all", collapsed ? "h-7 w-9 object-cover object-left" : "h-8 w-[145px]")} />
      </div>
      <nav className="flex-1 space-y-1.5 p-3">
        {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} title={collapsed ? label : undefined} className={({ isActive }) => cn("group relative flex h-11 items-center rounded-xl text-sm font-medium transition-all", collapsed ? "justify-center" : "gap-3 px-3.5", isActive ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
          {({ isActive }) => <><Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-105", isActive && "text-primary")} />{!collapsed && <span>{label}</span>}{isActive && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-primary" />}</>}
        </NavLink>)}
      </nav>
      <div className="space-y-2 border-t border-border/70 p-3">
        <div className={cn("flex items-center rounded-xl bg-success-subtle text-success", collapsed ? "h-10 justify-center" : "gap-3 px-3 py-2.5")} title="Sistema operacional"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-25" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" /></span>{!collapsed && <div><p className="text-xs font-semibold">Sistema operacional</p><p className="text-[11px] text-success/70">Dados sincronizados</p></div>}</div>
        <button onClick={toggle} className={cn("flex h-10 w-full items-center rounded-xl text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground", collapsed ? "justify-center" : "gap-3 px-3")} title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}>{theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}{!collapsed && <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>}</button>
        <div className={cn("flex items-center rounded-xl border border-border bg-background/70", collapsed ? "h-11 justify-center" : "gap-3 p-2")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#23a067] text-xs font-semibold text-white">{initials}</div>{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{userName}</p><p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p></div>}
        </div>
        <button onClick={() => setCollapsed((v) => !v)} className="flex h-9 w-full items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground" title={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
      </div>
    </aside>

    <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[244px]")}>
      <header className="glass-topbar sticky top-0 z-30 flex h-[68px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden"><img src="/amaggi-logo.png" className="h-7 w-[118px] object-contain object-left" alt="AMAGGI" /></div>
        <div className="hidden flex-1 justify-center md:flex"><GlobalSearch /></div>
        <div className="ml-auto flex items-center gap-1.5"><div className="md:hidden"><GlobalSearch compact /></div><button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-card" /></button><button onClick={toggle} className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground sm:flex">{theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button><button className="ml-1 flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-2 pr-3 text-sm"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle text-xs font-semibold text-primary">{initials}</div><span className="hidden max-w-28 truncate font-medium xl:inline">{userName.split(" ")[0]}</span></button></div>
      </header>
      <main key={location.pathname} className="mx-auto min-h-[calc(100vh-68px)] max-w-[1760px] animate-fade-up px-4 pb-24 pt-6 md:px-6 md:pt-7 lg:px-8 lg:pb-10"><Outlet /></main>
    </div>

    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-border bg-card/95 p-1.5 shadow-drawer backdrop-blur-xl lg:hidden">
      {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn("flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition", isActive ? "bg-primary-subtle text-primary" : "text-muted-foreground")}><Icon className="h-[18px] w-[18px]" /><span className="w-full truncate text-center">{label === "Acompanhamento" ? "Acompanhar" : label}</span></NavLink>)}
    </nav>
  </div>;
}
