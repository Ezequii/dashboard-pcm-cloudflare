import type { AnalyticsResponse, ImportBatch, OrcDetail, OrcListItem, OverviewResponse } from "@/types";

const now = new Date();
const isoAgo = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

export const demoOverview: OverviewResponse = {
  metrics: {
    inProgress: { value: 241, delta: 5.2, helper: "+12 no período" },
    inProgressValue: { value: 0, amountCents: 266000000, helper: "R$ 2,66 mi em processamento" },
    attention: { value: 37, helper: "14 solicitações atrasadas" },
    completed: { value: 186, delta: 8, helper: "+8% vs. período anterior" }
  },
  flow: [
    { stage: "SEM_LANCAMENTO", label: "Sem lançamento", count: 57, amountCents: 84980000 },
    { stage: "SEM_PEDIDO", label: "Sem pedido", count: 90, amountCents: 99860000 },
    { stage: "SEM_NF", label: "Sem NF", count: 94, amountCents: 80780000 }
  ],
  attention: [
    { key: "overdue", label: "Solicitações atrasadas", count: 14, description: "Fora do prazo esperado para a etapa atual", severity: "critical" },
    { key: "unassigned", label: "Sem responsável", count: 11, description: "Precisam de definição de responsabilidade", severity: "neutral" },
    { key: "inconsistent", label: "Inconsistências", count: 8, description: "Dados incompletos ou incompatíveis", severity: "warning" },
    { key: "highValue", label: "Acima de R$ 100 mil", count: 4, description: "Solicitações de alto impacto financeiro", severity: "info" }
  ],
  suppliers: [
    { name: "ASTER MÁQUINAS", count: 45, amountCents: 48200000, secondary: "6 em atenção" },
    { name: "CAMPO ERE", count: 38, amountCents: 36100000, secondary: "3 em atenção" },
    { name: "DM MANUTENÇÕES", count: 31, amountCents: 29800000, secondary: "5 em atenção" },
    { name: "PARANÁ PEÇAS", count: 26, amountCents: 21700000, secondary: "2 em atenção" }
  ],
  requesters: [
    { name: "CHARLES ROMAYNI", count: 82, secondary: "24 em andamento" },
    { name: "KAMYLLA SANTOS", count: 61, secondary: "17 em andamento" },
    { name: "EDUARDO PALMA", count: 54, secondary: "15 em andamento" },
    { name: "JOÃO PEDRO", count: 47, secondary: "12 em andamento" }
  ],
  equipment: [
    { name: "COLHEDORA DE ALGODÃO CP690", count: 32, secondary: "11 máquinas" },
    { name: "PULVERIZADOR JOHN DEERE M4030", count: 24, secondary: "8 máquinas" },
    { name: "TRATOR JOHN DEERE 8400R", count: 19, secondary: "7 máquinas" },
    { name: "PLANTADEIRA DB90", count: 16, secondary: "6 máquinas" }
  ],
  recentActivity: [
    { id: "a1", orcId: "o1", code: "ORC-2026-002184", title: "Pedido informado", description: "Pedido 41896855 adicionado", actor: "Ezequiel Caetano", createdAt: isoAgo(12) },
    { id: "a2", orcId: "o2", code: "ORC-2026-002179", title: "Solicitação concluída", description: "NF validada e lançada", actor: "Charles Romayni", createdAt: isoAgo(34) },
    { id: "a3", orcId: "o3", code: "ORC-2026-002150", title: "Nota fiscal recebida", description: "Documento vinculado ao ORC", actor: "Kamilla Santos", createdAt: isoAgo(70) },
    { id: "a4", orcId: "o4", code: "ORC-2026-002142", title: "Responsável atualizado", description: "Atribuído ao time de PCM", actor: "Sistema", createdAt: isoAgo(154) }
  ],
  updatedAt: now.toISOString()
};

export const demoOrcs: OrcListItem[] = [
  { id: "o1", internalCode: "ORC-2026-002184", receivedAt: "2026-07-17", launchedAt: "2026-07-18", prefixText: "61521066", equipment: "COLHEDORA DE ALGODÃO JOHN DEERE CP690", supplier: "ASTER MÁQUINAS", externalQuoteNumber: "63295146", serviceAmountCents: 1450000, partsAmountCents: 533226, totalAmountCents: 1983226, requester: "CHARLES ROMAYNI", stage: "SEM_PEDIDO", notes: "Recuperação do eletroventilador", qualityIssueCount: 0, ageDays: 4, updatedAt: isoAgo(12) },
  { id: "o2", internalCode: "ORC-2026-002183", receivedAt: "2026-07-09", launchedAt: "2026-07-10", prefixText: "23120016", equipment: "EMPILHADEIRA COMBUSTÃO TOYOTA 8FGU30", supplier: "DM MANUTENÇÕES", externalQuoteNumber: "4300/15801", serviceAmountCents: 895000, partsAmountCents: 0, totalAmountCents: 895000, requester: "EDUARDO PALMA", stage: "SEM_NF", notes: "Revisar dois cilindros", qualityIssueCount: 0, ageDays: 12, updatedAt: isoAgo(58) },
  { id: "o3", internalCode: "ORC-2026-002182", receivedAt: "2026-07-19", launchedAt: null, prefixText: "31521034", equipment: "CHASSI COLHEDORA DE ALGODÃO", supplier: "PARANÁ PEÇAS", externalQuoteNumber: "9896014", serviceAmountCents: 2720000, partsAmountCents: 0, totalAmountCents: 2720000, requester: "KAMYLLA SANTOS", stage: "SEM_LANCAMENTO", notes: "Jateamento e pintura", qualityIssueCount: 0, ageDays: 2, updatedAt: isoAgo(120) },
  { id: "o4", internalCode: "ORC-2026-002181", receivedAt: "2026-06-18", launchedAt: "2026-06-19", prefixText: "81521333", equipment: "SEMI REBOQUE TANQUE RODOTÉCNICA 31.000L", supplier: "CAMPO ERE", externalQuoteNumber: "RC-55212", serviceAmountCents: 11800000, partsAmountCents: 2400000, totalAmountCents: 14200000, requester: "CHARLES ROMAYNI", stage: "INCONSISTENTE", notes: "Revisar vínculo entre pedido e NF", qualityIssueCount: 2, ageDays: 33, updatedAt: isoAgo(180) },
  { id: "o5", internalCode: "ORC-2026-002180", receivedAt: "2026-07-11", launchedAt: "2026-07-12", prefixText: "40892", equipment: "UTILITÁRIO FIAT STRADA FREE 1.3 CD", supplier: "AGRO AR", externalQuoteNumber: "247", serviceAmountCents: 320000, partsAmountCents: 48000, totalAmountCents: 368000, requester: "JOÃO PEDRO", stage: "SEM_NF", notes: "Aplicação de insulfilm", qualityIssueCount: 0, ageDays: 10, updatedAt: isoAgo(260) },
  { id: "o6", internalCode: "ORC-2026-002179", receivedAt: "2026-07-03", launchedAt: "2026-07-04", prefixText: "51521085 / 51521087", equipment: "COLHEDORA DE ALGODÃO JOHN DEERE CP690", supplier: "ASTER MÁQUINAS", externalQuoteNumber: "42107", serviceAmountCents: 244359, partsAmountCents: 0, totalAmountCents: 244359, requester: "KAMYLLA SANTOS", stage: "CONCLUIDO", notes: "Serviço concluído", qualityIssueCount: 0, ageDays: 0, updatedAt: isoAgo(34) }
];

export const demoOrcDetail: OrcDetail = {
  ...demoOrcs[0],
  serviceOrderNumbers: ["9728651"],
  requisitionNumbers: ["834744"],
  purchaseOrderNumbers: [],
  purchaseOrderDates: [],
  invoiceNumbers: [],
  invoiceLaunchDates: [],
  dataQuality: [],
  revision: 3,
  documents: [
    { id: "d1", filename: "orc-63295146.pdf", contentType: "application/pdf", sizeBytes: 284210, createdAt: isoAgo(420) }
  ],
  history: demoOverview.recentActivity
};

export const demoAnalytics: AnalyticsResponse = {
  monthly: [
    { month: "Fev", received: 218, completed: 196, amountCents: 128000000 },
    { month: "Mar", received: 246, completed: 231, amountCents: 164000000 },
    { month: "Abr", received: 232, completed: 239, amountCents: 151000000 },
    { month: "Mai", received: 271, completed: 248, amountCents: 189000000 },
    { month: "Jun", received: 258, completed: 266, amountCents: 173000000 },
    { month: "Jul", received: 204, completed: 186, amountCents: 146000000 }
  ],
  flow: demoOverview.flow,
  aging: [{ label: "0–2 dias", count: 48 }, { label: "3–7 dias", count: 71 }, { label: "8–15 dias", count: 54 }, { label: "16–30 dias", count: 39 }, { label: "30+ dias", count: 29 }],
  costs: [{ label: "Fev", serviceCents: 82000000, partsCents: 46000000 }, { label: "Mar", serviceCents: 101000000, partsCents: 63000000 }, { label: "Abr", serviceCents: 93000000, partsCents: 58000000 }, { label: "Mai", serviceCents: 116000000, partsCents: 73000000 }, { label: "Jun", serviceCents: 104000000, partsCents: 69000000 }, { label: "Jul", serviceCents: 89000000, partsCents: 57000000 }],
  suppliers: demoOverview.suppliers,
  requesters: demoOverview.requesters,
  equipment: demoOverview.equipment
};

export const demoImports: ImportBatch[] = [
  { id: "imp1", filename: "CONTROLE_DE_REQUISICOES_2026.xlsx", status: "COMPLETED", totalRows: 2269, createdRows: 2269, updatedRows: 0, issueRows: 53, createdAt: isoAgo(1440), createdBy: "Ezequiel Caetano" },
  { id: "imp2", filename: "CONTROLE_DE_REQUISICOES_2026_REVISAO.xlsx", status: "COMPLETED", totalRows: 184, createdRows: 12, updatedRows: 172, issueRows: 4, createdAt: isoAgo(8640), createdBy: "Charles Romayni" }
];
