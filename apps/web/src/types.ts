export type Stage = "SEM_LANCAMENTO" | "SEM_PEDIDO" | "SEM_NF" | "CONCLUIDO" | "INCONSISTENTE";

export interface OverviewMetric { value: number; amountCents?: number; delta?: number; helper?: string; }
export interface RankingItem { name: string; count: number; amountCents?: number; secondary?: string; }
export interface FlowItem { stage: Stage; label: string; count: number; amountCents: number; }
export interface AttentionItem { key: string; label: string; count: number; description: string; severity: "critical" | "warning" | "neutral" | "info"; }
export interface ActivityItem { id: string; orcId?: string; code?: string; title: string; description?: string; actor?: string; createdAt: string; }
export interface OverviewResponse {
  metrics: { inProgress: OverviewMetric; inProgressValue: OverviewMetric; attention: OverviewMetric; completed: OverviewMetric };
  flow: FlowItem[];
  attention: AttentionItem[];
  suppliers: RankingItem[];
  requesters: RankingItem[];
  equipment: RankingItem[];
  recentActivity: ActivityItem[];
  updatedAt: string;
}

export interface OrcListItem {
  id: string;
  internalCode: string;
  receivedAt: string | null;
  launchedAt: string | null;
  prefixText: string | null;
  equipment: string | null;
  supplier: string | null;
  externalQuoteNumber: string | null;
  serviceAmountCents: number;
  partsAmountCents: number;
  totalAmountCents: number;
  requester: string | null;
  stage: Stage;
  notes: string | null;
  qualityIssueCount: number;
  ageDays: number;
  updatedAt: string;
}

export interface OrcDetail extends OrcListItem {
  serviceOrderNumbers: string[];
  requisitionNumbers: string[];
  purchaseOrderNumbers: string[];
  purchaseOrderDates: string[];
  invoiceNumbers: string[];
  invoiceLaunchDates: string[];
  dataQuality: string[];
  documents: Array<{ id: string; filename: string; contentType: string; sizeBytes: number; createdAt: string }>;
  history: ActivityItem[];
  revision: number;
}

export interface OrcListResponse { items: OrcListItem[]; total: number; page: number; pageSize: number; }
export interface AnalyticsResponse {
  monthly: Array<{ month: string; received: number; completed: number; amountCents: number }>;
  flow: FlowItem[];
  aging: Array<{ label: string; count: number }>;
  costs: Array<{ label: string; serviceCents: number; partsCents: number }>;
  suppliers: RankingItem[];
  requesters: RankingItem[];
  equipment: RankingItem[];
}
export interface ImportBatch { id: string; filename: string; status: string; totalRows: number; createdRows: number; updatedRows: number; issueRows: number; createdAt: string; createdBy: string; }

export type UserRole = "admin" | "analyst" | "manager" | "requester" | "viewer" | "auditor";
export interface CurrentUser { email: string; name: string; role: UserRole; }
export interface UserRecord {
  email: string; displayName: string; role: UserRole; isActive: boolean;
  lastSeenAt: string | null; createdAt?: string; updatedAt?: string;
}
