PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','analyst','manager','requester','viewer','auditor')),
  area_scope_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  r2_key TEXT,
  sheet_name TEXT,
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK(status IN ('PROCESSING','COMPLETED','FAILED','REVERTED')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  issue_rows INTEGER NOT NULL DEFAULT 0,
  processed_chunks INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  error_message TEXT,
  FOREIGN KEY(created_by) REFERENCES users(email)
);

CREATE TABLE IF NOT EXISTS orcs (
  id TEXT PRIMARY KEY,
  internal_code TEXT NOT NULL UNIQUE,
  system_external_id TEXT,
  received_at TEXT,
  launched_at TEXT,
  prefix_text TEXT,
  equipment TEXT,
  supplier TEXT,
  external_quote_number TEXT,
  service_amount_cents INTEGER NOT NULL DEFAULT 0,
  parts_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  requester TEXT,
  owner_email TEXT,
  service_order_numbers_json TEXT NOT NULL DEFAULT '[]',
  requisition_numbers_json TEXT NOT NULL DEFAULT '[]',
  purchase_order_numbers_json TEXT NOT NULL DEFAULT '[]',
  purchase_order_dates_json TEXT NOT NULL DEFAULT '[]',
  invoice_numbers_json TEXT NOT NULL DEFAULT '[]',
  invoice_launch_dates_json TEXT NOT NULL DEFAULT '[]',
  stage TEXT NOT NULL CHECK(stage IN ('SEM_LANCAMENTO','SEM_PEDIDO','SEM_NF','CONCLUIDO','INCONSISTENTE')),
  source_status TEXT,
  notes TEXT,
  data_quality_json TEXT NOT NULL DEFAULT '[]',
  source_key TEXT NOT NULL UNIQUE,
  source_row_number INTEGER,
  import_batch_id TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(import_batch_id) REFERENCES import_batches(id),
  FOREIGN KEY(created_by) REFERENCES users(email),
  FOREIGN KEY(updated_by) REFERENCES users(email),
  FOREIGN KEY(owner_email) REFERENCES users(email)
);

CREATE INDEX IF NOT EXISTS idx_orcs_stage ON orcs(stage);
CREATE INDEX IF NOT EXISTS idx_orcs_received ON orcs(received_at);
CREATE INDEX IF NOT EXISTS idx_orcs_updated ON orcs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orcs_supplier ON orcs(supplier);
CREATE INDEX IF NOT EXISTS idx_orcs_requester ON orcs(requester);
CREATE INDEX IF NOT EXISTS idx_orcs_equipment ON orcs(equipment);
CREATE INDEX IF NOT EXISTS idx_orcs_total ON orcs(total_amount_cents DESC);
CREATE INDEX IF NOT EXISTS idx_orcs_import ON orcs(import_batch_id);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  orc_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'OUTRO',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(orc_id) REFERENCES orcs(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(email)
);
CREATE INDEX IF NOT EXISTS idx_documents_orc ON documents(orc_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  before_json TEXT,
  after_json TEXT,
  actor_email TEXT NOT NULL,
  import_batch_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(actor_email) REFERENCES users(email),
  FOREIGN KEY(import_batch_id) REFERENCES import_batches(id)
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_recent ON audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(updated_by) REFERENCES users(email)
);
