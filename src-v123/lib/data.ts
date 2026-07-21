import type { ExecutivePayload, PublicationStatus, RowRecord, Filters } from "../types";

type SecurityPolicy = {
  environment?: string;
  accessRequired?: boolean;
  anonymousAccessAllowed?: boolean;
  failClosed?: boolean;
  localDevelopmentAllowed?: boolean;
  identityEndpoint?: string;
  allowedRoles?: string[];
  defaultRole?: string;
  roleMappings?: {
    adminGroups?: string[];
    leadershipGroups?: string[];
    adminEmails?: string[];
    leadershipEmails?: string[];
  };
};

function values(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];
}

function isLocalDevelopment(): boolean {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function resolveRole(policy: SecurityPolicy, identity: Record<string, unknown>): string {
  const mappings = policy.roleMappings || {};
  const email = String(identity.email || identity.user_email || "").toLowerCase();
  const custom = identity.custom && typeof identity.custom === "object"
    ? identity.custom as Record<string, unknown>
    : {};
  const nestedIdentity = identity.identity && typeof identity.identity === "object"
    ? identity.identity as Record<string, unknown>
    : {};
  const groups = [
    ...values(identity.groups),
    ...values(custom.groups),
    ...values(nestedIdentity.groups),
  ].map((item) => item.toLowerCase());

  const adminEmails = values(mappings.adminEmails).map((item) => item.toLowerCase());
  const leadershipEmails = values(mappings.leadershipEmails).map((item) => item.toLowerCase());
  const adminGroups = values(mappings.adminGroups).map((item) => item.toLowerCase());
  const leadershipGroups = values(mappings.leadershipGroups).map((item) => item.toLowerCase());

  if (adminEmails.includes(email) || groups.some((group) => adminGroups.includes(group))) return "admin";
  if (leadershipEmails.includes(email) || groups.some((group) => leadershipGroups.includes(group))) return "leadership";
  return String(policy.defaultRole || "viewer");
}

async function verifyCorporateAccess(): Promise<void> {
  const policyResponse = await fetch("/static/config/security-config.json", { cache: "no-store" });
  if (!policyResponse.ok) {
    throw new Error(`Configuração de segurança indisponível (${policyResponse.status}).`);
  }
  const policy = await policyResponse.json() as SecurityPolicy;

  if (
    policy.environment === "development"
    && policy.localDevelopmentAllowed === true
    && isLocalDevelopment()
  ) {
    return;
  }

  if (!policy.accessRequired && policy.anonymousAccessAllowed) return;
  if (!policy.accessRequired && policy.failClosed === false) return;

  try {
    const identityResponse = await fetch(
      policy.identityEndpoint || "/cdn-cgi/access/get-identity",
      { cache: "no-store" }
    );
    if (!identityResponse.ok) {
      throw new Error(`Acesso corporativo não confirmado (HTTP ${identityResponse.status}).`);
    }
    const identity = await identityResponse.json() as Record<string, unknown>;
    const role = resolveRole(policy, identity);
    const allowedRoles = values(policy.allowedRoles);
    if (allowedRoles.length && !allowedRoles.includes(role)) {
      throw new Error("Seu perfil não está autorizado para esta aplicação.");
    }
  } catch (error) {
    if (policy.failClosed !== false) throw error;
  }
}

export async function loadDashboardData(): Promise<{
  executive: ExecutivePayload;
  publication: PublicationStatus;
}> {
  await verifyCorporateAccess();

  const [executiveResponse, publicationResponse] = await Promise.all([
    fetch("/static/data/executive-data.json", { cache: "no-store" }),
    fetch("/static/data/publication-status.json", { cache: "no-store" }),
  ]);

  if (!executiveResponse.ok) {
    throw new Error(`Falha ao carregar dados executivos (${executiveResponse.status}).`);
  }
  if (!publicationResponse.ok) {
    throw new Error(`Falha ao carregar status de publicação (${publicationResponse.status}).`);
  }

  const executive = await executiveResponse.json() as ExecutivePayload;
  const publication = await publicationResponse.json() as PublicationStatus;

  if (!Array.isArray(executive.rows)) {
    throw new Error("Contrato executivo inválido: rows ausente.");
  }

  return { executive, publication };
}

export function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export function uniqueValues(rows: RowRecord[], key: string): string[] {
  return [...new Set(rows.map((row) => normalize(row[key])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function applyFilters(rows: RowRecord[], filters: Filters): RowRecord[] {
  return rows.filter((row) => {
    if (filters.solicitante && normalize(row["SOLICITANTE"]) !== filters.solicitante) return false;
    if (filters.fornecedor && normalize(row["FORNECEDOR"]) !== filters.fornecedor) return false;
    if (filters.etapa && normalize(row["ETAPA"]) !== filters.etapa) return false;
    if (filters.mes && normalize(row["MES_RECEBIMENTO"]) !== filters.mes) return false;
    return true;
  });
}

export function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(0).replace(".", ",")} mil`;
  return formatCurrency(value);
}

export function contextLabel(filters: Filters): string {
  const active = Object.values(filters).filter(Boolean).length;
  return active ? "Personalizada" : "Geral";
}
