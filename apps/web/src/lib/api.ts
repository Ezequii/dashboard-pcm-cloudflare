import type { AnalyticsResponse, CurrentUser, ImportBatch, OrcDetail, OrcListResponse, OverviewResponse, UserRecord, UserRole } from "@/types";
import { demoAnalytics, demoImports, demoOrcDetail, demoOrcs, demoOverview } from "@/lib/demo-data";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const DEMO = import.meta.env.VITE_DEMO_MODE === "true";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (DEMO) return demoRoute<T>(path, init);
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Falha inesperada" }));
    throw new Error(payload.message ?? `Erro ${response.status}`);
  }
  return response.json() as Promise<T>;
}


async function download(path: string): Promise<Blob> {
  if (DEMO) {
    const header = "Solicitação;Fornecedor;Equipamento;Valor;Situação\n";
    const rows = demoOrcs.map((item) => `${item.internalCode};${item.supplier ?? ""};${item.equipment ?? ""};${(item.totalAmountCents/100).toFixed(2)};${item.stage}`).join("\n");
    return new Blob(["\uFEFF", header, rows], { type: "text/csv;charset=utf-8" });
  }
  const response = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível gerar a exportação.");
  return response.blob();
}

function demoRoute<T>(path: string, init?: RequestInit): T {
  if (path === "/api/me") return { email: "ezequiel@empresa.com", name: "Ezequiel Caetano", role: "admin" } as T;
  if (path === "/api/users") return [
    { email: "ezequiel@empresa.com", displayName: "Ezequiel Caetano", role: "admin", isActive: true, lastSeenAt: new Date().toISOString() },
    { email: "charles@empresa.com", displayName: "Charles Romayni", role: "analyst", isActive: true, lastSeenAt: new Date(Date.now()-3600000).toISOString() }
  ] as T;
  if (path.startsWith("/api/users/") && init?.method === "PATCH") return { email: decodeURIComponent(path.split("/").pop() ?? ""), displayName: "Usuário", role: "viewer", isActive: true } as T;
  if (path.startsWith("/api/overview")) return demoOverview as T;
  if (path.startsWith("/api/analytics")) return demoAnalytics as T;
  if (path === "/api/imports") return demoImports as T;
  if (path === "/api/imports/start") return { batchId: "demo-import" } as T;
  if (path.includes("/chunk")) return { created: 0, updated: 0, issues: 0 } as T;
  if (path.includes("/finalize")) return demoImports[0] as T;
  const detailMatch = path.match(/^\/api\/orcs\/([^?]+)$/);
  if (detailMatch) return { ...demoOrcDetail, id: detailMatch[1] } as T;
  if (path.startsWith("/api/orcs")) return { items: demoOrcs, total: 241, page: 1, pageSize: 20 } as T;
  if (init?.method === "PATCH") return demoOrcDetail as T;
  return {} as T;
}

export const api = {
  me: () => request<CurrentUser>("/api/me"),
  users: () => request<UserRecord[]>("/api/users"),
  updateUser: (email: string, payload: { role?: UserRole; isActive?: boolean }) => request<UserRecord>(`/api/users/${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  overview: (params = "") => request<OverviewResponse>(`/api/overview${params}`),
  orcs: (params = "") => request<OrcListResponse>(`/api/orcs${params}`),
  orc: (id: string) => request<OrcDetail>(`/api/orcs/${id}`),
  updateOrc: (id: string, payload: Record<string, unknown>) => request<OrcDetail>(`/api/orcs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  uploadDocument: (id: string, file: File, category = "OUTRO") => { const form = new FormData(); form.append("file", file); form.append("category", category); return request<{ id: string; filename: string; contentType: string; sizeBytes: number; createdAt: string }>(`/api/orcs/${id}/documents`, { method: "POST", body: form }); },
  documentUrl: (id: string) => `${BASE}/api/documents/${id}/download`,
  analytics: (params = "") => request<AnalyticsResponse>(`/api/analytics${params}`),
  imports: () => request<ImportBatch[]>("/api/imports"),
  startImport: (form: FormData) => request<{ batchId: string }>("/api/imports/start", { method: "POST", body: form }),
  importChunk: (batchId: string, rows: unknown[], chunkIndex: number) => request<{ created: number; updated: number; issues: number }>(`/api/imports/${batchId}/chunk`, { method: "POST", body: JSON.stringify({ rows, chunkIndex }) }),
  finalizeImport: (batchId: string) => request<ImportBatch>(`/api/imports/${batchId}/finalize`, { method: "POST", body: JSON.stringify({}) }),
  exportOrcs: (params = "") => download(`/api/export/orcs.csv${params}`)
};
