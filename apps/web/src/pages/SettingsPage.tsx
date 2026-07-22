import { Building2, Database, FileClock, RefreshCw, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { UserRole } from "@/types";
import { formatRelative } from "@/lib/utils";

const sections = [
  { id: "general", label: "Geral", icon: Building2 },
  { id: "users", label: "Usuários e permissões", icon: UsersRound },
  { id: "data", label: "Dados e cadastros", icon: Database },
  { id: "imports", label: "Importação", icon: SlidersHorizontal },
  { id: "audit", label: "Auditoria", icon: FileClock }
];

export default function SettingsPage() {
  const [active, setActive] = React.useState("general");
  return <>
    <PageHeader title="Configurações" description="Preferências, permissões, parâmetros e rastreabilidade da aplicação." />
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <Card className="h-fit p-2"><nav className="flex gap-1 overflow-x-auto lg:flex-col">{sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActive(id)} className={`flex min-w-fit items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${active === id ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav></Card>
      {active === "general" && <General />}
      {active === "users" && <Users />}
      {active === "data" && <DataSettings />}
      {active === "imports" && <ImportSettings />}
      {active === "audit" && <AuditSettings />}
    </div>
  </>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card className="overflow-hidden"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="space-y-5 p-5">{children}</div></Card>; }
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <div className="grid gap-2 md:grid-cols-[230px_1fr]"><div><p className="text-sm font-medium">{label}</p>{hint && <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>}</div><div>{children}</div></div>; }

function General() { return <Section title="Configurações gerais" description="Identidade da unidade e preferências padrão."><Field label="Unidade padrão" hint="Escopo inicial exibido para usuários autorizados."><Select className="w-full"><option>Fazenda Itamarati Norte</option></Select></Field><Field label="Nome do produto"><Input defaultValue="Portal PCM" /></Field><Field label="Formato de data"><Select className="w-full"><option>DD/MM/AAAA</option></Select></Field><Field label="Atualização automática" hint="Intervalo de atualização da Visão Geral e da TV."><Select className="w-full"><option>60 segundos</option><option>30 segundos</option><option>5 minutos</option></Select></Field><div className="flex justify-end"><Button>Salvar alterações</Button></div></Section>; }
function Users() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["users"], queryFn: api.users, retry: false });
  const mutation = useMutation({
    mutationFn: ({ email, role, isActive }: { email: string; role?: UserRole; isActive?: boolean }) => api.updateUser(email, { role, isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });
  const roleLabel: Record<UserRole, string> = { admin: "Administrador", analyst: "Analista PCM", manager: "Gestor", requester: "Solicitante", viewer: "Leitura", auditor: "Auditor" };
  return <Section title="Usuários e permissões" description="O Cloudflare Access autentica; o Portal PCM define o perfil e o que cada pessoa pode alterar.">
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-4 py-3"><div><p className="text-sm font-medium">Acessos reconhecidos pelo sistema</p><p className="mt-1 text-xs text-muted-foreground">Um usuário aparece aqui após o primeiro acesso autenticado.</p></div><Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Atualizar</Button></div>
    {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-xl" />)}</div>}
    {isError && <div className="rounded-xl border border-warning/20 bg-warning-subtle p-4"><p className="text-sm font-semibold">Gerenciamento restrito</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{error instanceof Error ? error.message : "Seu perfil não possui acesso a esta área."}</p></div>}
    {users && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-border bg-muted/35 text-xs text-muted-foreground"><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Último acesso</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ação</th></tr></thead><tbody>{users.map((user) => <tr key={user.email} className="border-b border-border/60 last:border-0"><td className="px-4 py-3"><p className="font-medium">{user.displayName}</p><p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p></td><td className="px-4 py-3"><Select aria-label={`Perfil de ${user.displayName}`} className="min-w-[170px]" value={user.role} disabled={mutation.isPending} onChange={(event) => mutation.mutate({ email: user.email, role: event.target.value as UserRole })}>{(Object.keys(roleLabel) as UserRole[]).map((role) => <option key={role} value={role}>{roleLabel[role]}</option>)}</Select></td><td className="px-4 py-3 text-xs text-muted-foreground">{user.lastSeenAt ? formatRelative(user.lastSeenAt) : "Ainda não registrado"}</td><td className="px-4 py-3"><Badge variant={user.isActive ? "success" : "outline"}>{user.isActive ? "Ativo" : "Inativo"}</Badge></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ email: user.email, isActive: !user.isActive })}>{user.isActive ? "Desativar" : "Ativar"}</Button></td></tr>)}</tbody></table></div>}
    {mutation.isError && <p className="text-xs text-destructive">{mutation.error instanceof Error ? mutation.error.message : "Não foi possível atualizar o usuário."}</p>}
  </Section>;
}

function DataSettings() { return <Section title="Dados e cadastros" description="Cadastros auxiliares permanecem dentro de Configurações."><div className="grid gap-3 sm:grid-cols-2">{[["Fornecedores", "364 cadastros"], ["Equipamentos", "1.801 prefixos"], ["Solicitantes", "Sincronizados da base"], ["Centros de custo", "Relacionados aos ativos"]].map(([title, description]) => <button className="rounded-2xl border border-border p-4 text-left transition hover:border-primary/20 hover:bg-primary/[.02]" key={title}><p className="font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></button>)}</div></Section>; }
function ImportSettings() { return <Section title="Regras de importação" description="Critérios usados para validar e atualizar a base."><Field label="Aba padrão"><Input defaultValue="Acompanhamento RC 2026" /></Field><Field label="Possível duplicidade"><Select className="w-full"><option>Enviar para revisão</option><option>Ignorar automaticamente</option></Select></Field><Field label="Arquivo original"><Select className="w-full"><option>Guardar no R2</option></Select></Field><div className="flex justify-end"><Button>Salvar regras</Button></div></Section>; }
function AuditSettings() { return <Section title="Auditoria" description="Eventos críticos são imutáveis e associados ao usuário autenticado."><div className="rounded-2xl border border-success/20 bg-success-subtle p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-success" /><div><p className="text-sm font-semibold">Auditoria habilitada</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Importações, alterações de situação, documentos e correções de dados são registrados.</p></div></div></div><Field label="Retenção"><Select className="w-full"><option>Sem exclusão automática</option></Select></Field><Button variant="outline">Exportar log de auditoria</Button></Section>; }
