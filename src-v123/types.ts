export type RowRecord = Record<string, string | number | boolean | null | undefined>;

export interface ExecutivePayload {
  boot?: {
    app_name?: string;
    stage_order?: string[];
    stage_colors?: Record<string, string>;
    metadata?: {
      linhas?: number;
      generated_at?: string;
      contagem_etapas?: Record<string, number>;
    };
  };
  rows: RowRecord[];
  generated_at?: string;
  data_version?: string;
}

export interface PublicationStatus {
  data_version?: string;
  published_at?: string;
  records?: number;
  status?: string;
}

export type ViewName = "executive" | "base";

export interface Filters {
  solicitante: string;
  fornecedor: string;
  etapa: string;
  mes: string;
}
