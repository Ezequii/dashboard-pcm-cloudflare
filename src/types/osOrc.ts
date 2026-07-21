export type OsOrcStatus =
  | "FALTA LANÇAMENTO"
  | "FALTA O PEDIDO"
  | "FALTA NF"
  | "CONCLUÍDO"
  | string;

export interface OsOrcRecord {
  id: string;
  sourceRow: number;
  dataRecebimento: string | null;
  dataLancamento: string | null;
  prefixo: string;
  equipamento: string;
  fornecedor: string;
  numeroOrcamento: string;
  valorServico: number;
  valorPecas: number;
  valorTotal: number;
  solicitante: string;
  numeroOrdemServico: string;
  numeroRequisicao: string;
  numeroPedidoCompra: string;
  dataPedido: string | null;
  numeroNfsDanfe: string;
  dataLancamentoNfs: string | null;
  status: OsOrcStatus;
  observacoes: string;
}

export interface DatasetMetadata {
  schemaVersion: number;
  sourceFile: string;
  sourceSheet: string;
  generatedAt: string;
  recordCount: number;
  pendingCount: number;
  completedCount: number;
  statusCounts: Record<string, number>;
  totalValue: number;
  pendingValue: number;
}

export interface OsOrcDataset {
  metadata: DatasetMetadata;
  records: OsOrcRecord[];
}

export type AppPage = "overview" | "consulta";
