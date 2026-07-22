import { Hono, type Context } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

type Role = "admin" | "analyst" | "manager" | "requester" | "viewer" | "auditor";
type UserContext = { email: string; name: string; role: Role };
type Bindings = {
  DB: D1Database;
  FILES: R2Bucket;
  APP_ENV: string;
  WEB_ORIGIN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ADMIN_EMAILS: string;
};
type Variables = { user: UserContext };

type DbOrc = {
  id: string; internal_code: string; system_external_id: string | null; received_at: string | null; launched_at: string | null;
  prefix_text: string | null; equipment: string | null; supplier: string | null; external_quote_number: string | null;
  service_amount_cents: number; parts_amount_cents: number; total_amount_cents: number; requester: string | null; owner_email: string | null;
  service_order_numbers_json: string; requisition_numbers_json: string; purchase_order_numbers_json: string; purchase_order_dates_json: string;
  invoice_numbers_json: string; invoice_launch_dates_json: string; stage: Stage; source_status: string | null; notes: string | null;
  data_quality_json: string; source_key: string; source_row_number: number | null; import_batch_id: string | null;
  created_by: string; updated_by: string; created_at: string; updated_at: string; completed_at: string | null; revision: number;
  age_days?: number;
};
type Stage = "SEM_LANCAMENTO" | "SEM_PEDIDO" | "SEM_NF" | "CONCLUIDO" | "INCONSISTENTE";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  const allowed = c.env.WEB_ORIGIN?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  if (origin && (c.env.APP_ENV === "development" || allowed.includes(origin))) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Headers", "Content-Type, Cf-Access-Jwt-Assertion, X-Dev-User-Email");
    c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  }
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") return next();
  try {
    const user = await authenticate(c);
    c.set("user", user);
    const active = await ensureUser(c.env.DB, user, c.env.ADMIN_EMAILS);
    if (!active) return c.json({ message: "Usuário desativado no Portal PCM." }, 403);
    await next();
  } catch (error) {
    console.error("auth_error", error);
    return c.json({ message: "Acesso não autorizado." }, 401);
  }
});

app.get("/api/health", (c) => c.json({ ok: true, service: "dashboard-pcm-api", timestamp: new Date().toISOString() }));

app.get("/api/me", (c) => {
  const user = c.get("user");
  return c.json(user);
});

app.get("/api/users", async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ message: "Apenas administradores podem gerenciar usuários." }, 403);
  const rows = await c.env.DB.prepare(`SELECT email, display_name, role, is_active, last_seen_at, created_at, updated_at
    FROM users ORDER BY is_active DESC, display_name COLLATE NOCASE`).all<{ email:string; display_name:string; role:Role; is_active:number; last_seen_at:string|null; created_at:string; updated_at:string }>();
  return c.json((rows.results ?? []).map((row) => ({
    email: row.email, displayName: row.display_name, role: row.role, isActive: row.is_active === 1,
    lastSeenAt: row.last_seen_at, createdAt: row.created_at, updatedAt: row.updated_at
  })));
});

app.patch("/api/users/:email", async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ message: "Apenas administradores podem gerenciar usuários." }, 403);
  const email = decodeURIComponent(c.req.param("email")).trim().toLowerCase();
  const payload = z.object({
    role: z.enum(["admin","analyst","manager","requester","viewer","auditor"]).optional(),
    isActive: z.boolean().optional()
  }).refine((value) => value.role !== undefined || value.isActive !== undefined, { message: "Nenhuma alteração informada." }).parse(await c.req.json());
  if (email === user.email && payload.isActive === false) return c.json({ message: "Você não pode desativar o próprio usuário." }, 409);
  const before = await c.env.DB.prepare("SELECT email, display_name, role, is_active FROM users WHERE email=?").bind(email).first<{ email:string;display_name:string;role:Role;is_active:number }>();
  if (!before) return c.json({ message: "Usuário não encontrado." }, 404);
  const role = payload.role ?? before.role;
  const isActive = payload.isActive === undefined ? before.is_active : (payload.isActive ? 1 : 0);
  await c.env.DB.prepare("UPDATE users SET role=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE email=?").bind(role,isActive,email).run();
  await audit(c.env.DB, { entityType: "USER", entityId: email, action: "USER_UPDATE", title: "Permissão de usuário atualizada", description: `${before.display_name}: ${role} · ${isActive ? "ativo" : "inativo"}`, before, after: { role, isActive: isActive === 1 }, actor: user.email });
  return c.json({ email, displayName: before.display_name, role, isActive: isActive === 1 });
});

app.get("/api/overview", async (c) => {
  const db = c.env.DB;
  const scope = scopeFor(c.get("user"));
  const period = overviewPeriod(c.req.query("period"));
  const receivedPeriod = periodClause(period, "received_at");
  const completedPeriod = periodClause(period, "COALESCE(completed_at,updated_at)");
  const scopedOrcs = `(SELECT * FROM orcs WHERE ${scope.sql})`;
  const [summary, attention, completed, flow, suppliers, requesters, equipment, recent] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount_cents),0) AS amount FROM ${scopedOrcs} WHERE stage <> 'CONCLUIDO'`).bind(...scope.params).first<{ count: number; amount: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM ${scopedOrcs} WHERE stage <> 'CONCLUIDO' AND (
      data_quality_json <> '[]' OR total_amount_cents >= 10000000 OR (received_at IS NOT NULL AND julianday('now') - julianday(received_at) > 15)
    )`).bind(...scope.params).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM ${scopedOrcs} WHERE stage = 'CONCLUIDO' ${completedPeriod.sql}`).bind(...scope.params, ...completedPeriod.params).first<{ count: number }>(),
    db.prepare(`SELECT stage, COUNT(*) AS count, COALESCE(SUM(total_amount_cents),0) AS amount
      FROM ${scopedOrcs} WHERE stage IN ('SEM_LANCAMENTO','SEM_PEDIDO','SEM_NF') GROUP BY stage`).bind(...scope.params).all<{ stage: Stage; count: number; amount: number }>(),
    ranking(db, "supplier", scope, receivedPeriod), ranking(db, "requester", scope, receivedPeriod), ranking(db, "equipment", scope, receivedPeriod),
    db.prepare(`SELECT a.id, a.entity_id, o.internal_code, a.title, a.description, a.actor_email, a.created_at FROM audit_events a JOIN ${scopedOrcs} o ON o.id = a.entity_id WHERE a.entity_type = 'ORC' ORDER BY a.created_at DESC LIMIT 8`).bind(...scope.params).all<{ id: string; entity_id: string; internal_code: string; title: string; description: string | null; actor_email: string; created_at: string }>()
  ]);
  const attentionRows = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS count FROM ${scopedOrcs} WHERE stage <> 'CONCLUIDO' AND received_at IS NOT NULL AND julianday('now') - julianday(received_at) > 15`).bind(...scope.params).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM ${scopedOrcs} WHERE stage <> 'CONCLUIDO' AND owner_email IS NULL`).bind(...scope.params).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM ${scopedOrcs} WHERE data_quality_json <> '[]'`).bind(...scope.params).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM ${scopedOrcs} WHERE stage <> 'CONCLUIDO' AND total_amount_cents >= 10000000`).bind(...scope.params).first<{ count: number }>()
  ]);
  const flowMap = new Map((flow.results ?? []).map((r) => [r.stage, r]));
  const flowItems = [
    { stage: "SEM_LANCAMENTO" as const, label: "Sem lançamento" },
    { stage: "SEM_PEDIDO" as const, label: "Sem pedido" },
    { stage: "SEM_NF" as const, label: "Sem NF" }
  ].map((item) => ({ ...item, count: flowMap.get(item.stage)?.count ?? 0, amountCents: flowMap.get(item.stage)?.amount ?? 0 }));
  return c.json({
    metrics: {
      inProgress: { value: summary?.count ?? 0, helper: `${flowItems.reduce((s, x) => s + x.count, 0)} no fluxo atual` },
      inProgressValue: { value: 0, amountCents: summary?.amount ?? 0, helper: "Valor total ainda em processamento" },
      attention: { value: attention?.count ?? 0, helper: `${attentionRows[0]?.count ?? 0} solicitações atrasadas` },
      completed: { value: completed?.count ?? 0, helper: period.helper }
    },
    flow: flowItems,
    attention: [
      { key: "overdue", label: "Solicitações atrasadas", count: attentionRows[0]?.count ?? 0, description: "Fora do prazo esperado para a etapa atual", severity: "critical" },
      { key: "unassigned", label: "Sem responsável", count: attentionRows[1]?.count ?? 0, description: "Precisam de definição de responsabilidade", severity: "neutral" },
      { key: "inconsistent", label: "Inconsistências", count: attentionRows[2]?.count ?? 0, description: "Dados incompletos ou incompatíveis", severity: "warning" },
      { key: "highValue", label: "Acima de R$ 100 mil", count: attentionRows[3]?.count ?? 0, description: "Solicitações de alto impacto financeiro", severity: "info" }
    ],
    suppliers: mapRanking(suppliers.results), requesters: mapRanking(requesters.results), equipment: mapRanking(equipment.results),
    recentActivity: (recent.results ?? []).map((r) => ({ id: r.id, orcId: r.entity_id, code: r.internal_code, title: r.title, description: r.description, actor: displayName(r.actor_email), createdAt: r.created_at })),
    updatedAt: new Date().toISOString()
  });
});

app.get("/api/orcs", async (c) => {
  const query = c.req.query();
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
  const scope = scopeFor(c.get("user"));
  const where: string[] = [scope.sql];
  const values: unknown[] = [...scope.params];
  const add = (sql: string, ...params: unknown[]) => { where.push(sql); values.push(...params); };
  if (query.q) { const q = `%${query.q.trim()}%`; add(`(internal_code LIKE ? OR external_quote_number LIKE ? OR supplier LIKE ? OR requester LIKE ? OR equipment LIKE ? OR prefix_text LIKE ? OR service_order_numbers_json LIKE ? OR requisition_numbers_json LIKE ? OR purchase_order_numbers_json LIKE ? OR invoice_numbers_json LIKE ?)`, q,q,q,q,q,q,q,q,q,q); }
  if (query.stage) add("stage = ?", query.stage);
  if (query.status === "em-andamento") add("stage <> 'CONCLUIDO'");
  if (query.supplier) add("supplier = ?", query.supplier);
  if (query.requester) add("requester = ?", query.requester);
  if (query.equipment) add("equipment = ?", query.equipment);
  if (query.attention) {
    if (query.attention === "overdue") add("stage <> 'CONCLUIDO' AND received_at IS NOT NULL AND julianday('now') - julianday(received_at) > 15");
    else if (query.attention === "unassigned") add("stage <> 'CONCLUIDO' AND owner_email IS NULL");
    else if (query.attention === "inconsistent") add("data_quality_json <> '[]'");
    else if (query.attention === "highValue") add("stage <> 'CONCLUIDO' AND total_amount_cents >= 10000000");
    else add("stage <> 'CONCLUIDO' AND (data_quality_json <> '[]' OR total_amount_cents >= 10000000 OR (received_at IS NOT NULL AND julianday('now') - julianday(received_at) > 15))");
  }
  const whereSql = where.join(" AND ");
  const order = query.sort === "valor-desc" ? "total_amount_cents DESC" : "updated_at DESC";
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(`SELECT *, CAST(MAX(0, julianday('now') - julianday(COALESCE(received_at,created_at))) AS INTEGER) AS age_days FROM orcs WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize).all<DbOrc>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS count FROM orcs WHERE ${whereSql}`).bind(...values).first<{ count: number }>()
  ]);
  return c.json({ items: (rows.results ?? []).map(mapOrcList), total: total?.count ?? 0, page, pageSize });
});

app.get("/api/export/orcs.csv", async (c) => {
  const query = c.req.query();
  const scope = scopeFor(c.get("user"));
  const where: string[] = [scope.sql];
  const values: unknown[] = [...scope.params];
  const add = (sql: string, ...params: unknown[]) => { where.push(sql); values.push(...params); };
  if (query.q) { const q = `%${query.q.trim()}%`; add(`(internal_code LIKE ? OR external_quote_number LIKE ? OR supplier LIKE ? OR requester LIKE ? OR equipment LIKE ? OR prefix_text LIKE ? OR service_order_numbers_json LIKE ? OR requisition_numbers_json LIKE ? OR purchase_order_numbers_json LIKE ? OR invoice_numbers_json LIKE ?)`, q,q,q,q,q,q,q,q,q,q); }
  if (query.stage) add("stage = ?", query.stage);
  if (query.status === "em-andamento") add("stage <> 'CONCLUIDO'");
  if (query.supplier) add("supplier = ?", query.supplier);
  if (query.requester) add("requester = ?", query.requester);
  if (query.equipment) add("equipment = ?", query.equipment);
  const rows = await c.env.DB.prepare(`SELECT internal_code,received_at,launched_at,prefix_text,equipment,supplier,external_quote_number,service_amount_cents,parts_amount_cents,total_amount_cents,requester,service_order_numbers_json,requisition_numbers_json,purchase_order_numbers_json,purchase_order_dates_json,invoice_numbers_json,invoice_launch_dates_json,stage,notes FROM orcs WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT 10000`).bind(...values).all<Record<string, unknown>>();
  const headers = ["Solicitação","Recebimento","Lançamento","Prefixo","Equipamento","Fornecedor","ORC externo","Valor serviço","Valor peças","Valor total","Solicitante","OS","Requisição","Pedido","Data pedido","NF/DANFE","Lançamento NF","Situação","Observações"];
  const lines = [headers.map(csvCell).join(";")];
  for (const row of rows.results ?? []) {
    lines.push([
      row.internal_code,row.received_at,row.launched_at,row.prefix_text,row.equipment,row.supplier,row.external_quote_number,
      Number(row.service_amount_cents ?? 0)/100,Number(row.parts_amount_cents ?? 0)/100,Number(row.total_amount_cents ?? 0)/100,row.requester,
      parseArray(String(row.service_order_numbers_json ?? "[]")).join(" | "),parseArray(String(row.requisition_numbers_json ?? "[]")).join(" | "),
      parseArray(String(row.purchase_order_numbers_json ?? "[]")).join(" | "),parseArray(String(row.purchase_order_dates_json ?? "[]")).join(" | "),
      parseArray(String(row.invoice_numbers_json ?? "[]")).join(" | "),parseArray(String(row.invoice_launch_dates_json ?? "[]")).join(" | "),
      stageLabel(String(row.stage) as Stage),row.notes
    ].map(csvCell).join(";"));
  }
  const body = `\uFEFF${lines.join("\r\n")}`;
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="solicitacoes-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "private, no-store" } });
});

app.get("/api/orcs/:id", async (c) => {
  const id = c.req.param("id");
  const scope = scopeFor(c.get("user"));
  const orc = await c.env.DB.prepare(`SELECT *, CAST(MAX(0, julianday('now') - julianday(COALESCE(received_at,created_at))) AS INTEGER) AS age_days FROM orcs WHERE id = ? AND ${scope.sql}`).bind(id, ...scope.params).first<DbOrc>();
  if (!orc) return c.json({ message: "Solicitação não encontrada." }, 404);
  const [documents, history] = await Promise.all([
    c.env.DB.prepare("SELECT id, filename, content_type, size_bytes, created_at FROM documents WHERE orc_id = ? ORDER BY created_at DESC").bind(id).all<{ id: string; filename: string; content_type: string; size_bytes: number; created_at: string }>(),
    c.env.DB.prepare("SELECT id, title, description, actor_email, created_at FROM audit_events WHERE entity_type = 'ORC' AND entity_id = ? ORDER BY created_at DESC LIMIT 100").bind(id).all<{ id: string; title: string; description: string | null; actor_email: string; created_at: string }>()
  ]);
  return c.json({
    ...mapOrcList(orc),
    serviceOrderNumbers: parseArray(orc.service_order_numbers_json), requisitionNumbers: parseArray(orc.requisition_numbers_json),
    purchaseOrderNumbers: parseArray(orc.purchase_order_numbers_json), purchaseOrderDates: parseArray(orc.purchase_order_dates_json),
    invoiceNumbers: parseArray(orc.invoice_numbers_json), invoiceLaunchDates: parseArray(orc.invoice_launch_dates_json), dataQuality: parseArray(orc.data_quality_json), revision: orc.revision,
    documents: (documents.results ?? []).map((d) => ({ id: d.id, filename: d.filename, contentType: d.content_type, sizeBytes: d.size_bytes, createdAt: d.created_at })),
    history: (history.results ?? []).map((h) => ({ id: h.id, orcId: id, title: h.title, description: h.description, actor: displayName(h.actor_email), createdAt: h.created_at }))
  });
});

const updateSchema = z.object({ stage: z.enum(["SEM_LANCAMENTO","SEM_PEDIDO","SEM_NF","CONCLUIDO","INCONSISTENTE"]).optional(), notes: z.string().nullable().optional(), revision: z.number().int().positive(), ownerEmail: z.string().email().nullable().optional() });
app.patch("/api/orcs/:id", async (c) => {
  const user = c.get("user");
  if (!canWrite(user.role)) return c.json({ message: "Seu perfil não permite alterações." }, 403);
  const id = c.req.param("id");
  const payload = updateSchema.parse(await c.req.json());
  const before = await c.env.DB.prepare("SELECT * FROM orcs WHERE id = ?").bind(id).first<DbOrc>();
  if (!before) return c.json({ message: "Solicitação não encontrada." }, 404);
  const stage = payload.stage ?? before.stage;
  const notes = payload.notes === undefined ? before.notes : payload.notes;
  const owner = payload.ownerEmail === undefined ? before.owner_email : payload.ownerEmail;
  const result = await c.env.DB.prepare(`UPDATE orcs SET stage = ?, notes = ?, owner_email = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP,
    completed_at = CASE WHEN ? = 'CONCLUIDO' THEN COALESCE(completed_at,CURRENT_TIMESTAMP) ELSE NULL END, revision = revision + 1
    WHERE id = ? AND revision = ?`).bind(stage, notes, owner, user.email, stage, id, payload.revision).run();
  if ((result.meta.changes ?? 0) === 0) return c.json({ message: "Os dados foram atualizados por outro usuário. Recarregue e tente novamente." }, 409);
  await audit(c.env.DB, { entityType: "ORC", entityId: id, action: "UPDATE", title: `Solicitação atualizada para ${stageLabel(stage)}`, description: notes ?? undefined, before, after: { stage, notes, owner }, actor: user.email });
  const updated = await c.env.DB.prepare("SELECT *, CAST(MAX(0, julianday('now') - julianday(COALESCE(received_at,created_at))) AS INTEGER) AS age_days FROM orcs WHERE id = ?").bind(id).first<DbOrc>();
  return c.json({ ...mapOrcList(updated!), serviceOrderNumbers: parseArray(updated!.service_order_numbers_json), requisitionNumbers: parseArray(updated!.requisition_numbers_json), purchaseOrderNumbers: parseArray(updated!.purchase_order_numbers_json), purchaseOrderDates: parseArray(updated!.purchase_order_dates_json), invoiceNumbers: parseArray(updated!.invoice_numbers_json), invoiceLaunchDates: parseArray(updated!.invoice_launch_dates_json), dataQuality: parseArray(updated!.data_quality_json), documents: [], history: [], revision: updated!.revision });
});

app.post("/api/orcs/:id/documents", async (c) => {
  const user = c.get("user");
  if (!canWrite(user.role)) return c.json({ message: "Seu perfil não permite anexar documentos." }, 403);
  const orcId = c.req.param("id");
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ message: "Arquivo não informado." }, 400);
  const id = crypto.randomUUID();
  const key = `orcs/${orcId}/${id}-${safeFilename(file.name)}`;
  await c.env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { orcId, uploadedBy: user.email } });
  await c.env.DB.prepare("INSERT INTO documents (id,orc_id,r2_key,filename,content_type,size_bytes,category,created_by) VALUES (?,?,?,?,?,?,?,?)").bind(id, orcId, key, file.name, file.type || "application/octet-stream", file.size, String(form.get("category") ?? "OUTRO"), user.email).run();
  await audit(c.env.DB, { entityType: "ORC", entityId: orcId, action: "DOCUMENT_ADD", title: "Documento adicionado", description: file.name, actor: user.email });
  return c.json({ id, filename: file.name, contentType: file.type, sizeBytes: file.size, createdAt: new Date().toISOString() }, 201);
});

app.get("/api/documents/:id/download", async (c) => {
  const scope = scopeFor(c.get("user"));
  const doc = await c.env.DB.prepare(`SELECT d.r2_key,d.filename,d.content_type FROM documents d JOIN orcs o ON o.id=d.orc_id WHERE d.id=? AND ${scope.sql}`).bind(c.req.param("id"), ...scope.params).first<{ r2_key: string; filename: string; content_type: string }>();
  if (!doc) return c.json({ message: "Documento não encontrado." }, 404);
  const object = await c.env.FILES.get(doc.r2_key);
  if (!object) return c.json({ message: "Arquivo não encontrado no armazenamento." }, 404);
  return new Response(object.body, { headers: { "Content-Type": doc.content_type, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`, "Cache-Control": "private, no-store" } });
});

app.get("/api/analytics", async (c) => {
  const scope = scopeFor(c.get("user"));
  const scopedOrcs = `(SELECT * FROM orcs WHERE ${scope.sql})`;
  const [monthly, flow, aging, costs, suppliers, requesters, equipment] = await Promise.all([
    c.env.DB.prepare(`WITH months AS (
      SELECT strftime('%Y-%m', received_at) AS month, COUNT(*) AS received,
      SUM(CASE WHEN stage='CONCLUIDO' THEN 1 ELSE 0 END) AS completed, COALESCE(SUM(total_amount_cents),0) AS amount
      FROM ${scopedOrcs} WHERE received_at >= date('now','-6 months') GROUP BY strftime('%Y-%m',received_at)
    ) SELECT * FROM months ORDER BY month`).bind(...scope.params).all<{ month: string; received: number; completed: number; amount: number }>(),
    c.env.DB.prepare(`SELECT stage, COUNT(*) AS count, COALESCE(SUM(total_amount_cents),0) AS amount FROM ${scopedOrcs} WHERE stage IN ('SEM_LANCAMENTO','SEM_PEDIDO','SEM_NF') GROUP BY stage`).bind(...scope.params).all<{ stage: Stage; count: number; amount: number }>(),
    c.env.DB.prepare(`SELECT CASE WHEN age <= 2 THEN '0–2 dias' WHEN age <= 7 THEN '3–7 dias' WHEN age <= 15 THEN '8–15 dias' WHEN age <= 30 THEN '16–30 dias' ELSE '30+ dias' END AS label, COUNT(*) AS count FROM (SELECT MAX(0,CAST(julianday('now')-julianday(received_at) AS INTEGER)) age FROM ${scopedOrcs} WHERE stage <> 'CONCLUIDO' AND received_at IS NOT NULL) GROUP BY label ORDER BY MIN(age)`).bind(...scope.params).all<{ label: string; count: number }>(),
    c.env.DB.prepare(`SELECT strftime('%Y-%m',received_at) AS label, COALESCE(SUM(service_amount_cents),0) AS service, COALESCE(SUM(parts_amount_cents),0) AS parts FROM ${scopedOrcs} WHERE received_at >= date('now','-6 months') GROUP BY strftime('%Y-%m',received_at) ORDER BY label`).bind(...scope.params).all<{ label: string; service: number; parts: number }>(),
    ranking(c.env.DB,"supplier", scope), ranking(c.env.DB,"requester", scope), ranking(c.env.DB,"equipment", scope)
  ]);
  const stageNames: Record<string,string> = { SEM_LANCAMENTO: "Sem lançamento", SEM_PEDIDO: "Sem pedido", SEM_NF: "Sem NF" };
  return c.json({
    monthly: (monthly.results ?? []).map((x) => ({ month: monthLabel(x.month), received: x.received, completed: x.completed, amountCents: x.amount })),
    flow: (flow.results ?? []).map((x) => ({ stage: x.stage, label: stageNames[x.stage], count: x.count, amountCents: x.amount })), aging: aging.results ?? [],
    costs: (costs.results ?? []).map((x) => ({ label: monthLabel(x.label), serviceCents: x.service, partsCents: x.parts })),
    suppliers: mapRanking(suppliers.results), requesters: mapRanking(requesters.results), equipment: mapRanking(equipment.results)
  });
});

app.get("/api/imports", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM import_batches ORDER BY created_at DESC LIMIT 50").all<{ id: string; filename: string; status: string; total_rows: number; created_rows: number; updated_rows: number; issue_rows: number; created_at: string; created_by: string }>();
  return c.json((rows.results ?? []).map((x) => ({ id: x.id, filename: x.filename, status: x.status, totalRows: x.total_rows, createdRows: x.created_rows, updatedRows: x.updated_rows, issueRows: x.issue_rows, createdAt: x.created_at, createdBy: displayName(x.created_by) })));
});

app.post("/api/imports/start", async (c) => {
  const user = c.get("user");
  if (!canWrite(user.role)) return c.json({ message: "Seu perfil não permite importações." }, 403);
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ message: "Arquivo não informado." }, 400);
  if (file.size > 25 * 1024 * 1024) return c.json({ message: "O arquivo excede o limite de 25 MB." }, 413);
  const batchId = crypto.randomUUID();
  const key = `imports/${new Date().toISOString().slice(0,10)}/${batchId}-${safeFilename(file.name)}`;
  await c.env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, customMetadata: { uploadedBy: user.email, batchId } });
  await c.env.DB.prepare("INSERT INTO import_batches (id,filename,r2_key,sheet_name,status,total_rows,created_by) VALUES (?,?,?,?,?,?,?)").bind(batchId, file.name, key, String(form.get("sheetName") ?? ""), "PROCESSING", Number(form.get("totalRows") ?? 0), user.email).run();
  return c.json({ batchId }, 201);
});

const importRowSchema = z.object({
  sourceRowNumber: z.number().int().positive(), systemId: z.string().nullable().optional(), receivedAt: z.string().nullable(), launchedAt: z.string().nullable(), prefixText: z.string().nullable(), equipment: z.string().nullable(), supplier: z.string().nullable(), externalQuoteNumber: z.string().nullable(), serviceAmountCents: z.number().int(), partsAmountCents: z.number().int(), totalAmountCents: z.number().int(), requester: z.string().nullable(), serviceOrderNumbers: z.array(z.string()), requisitionNumbers: z.array(z.string()), purchaseOrderNumbers: z.array(z.string()), purchaseOrderDates: z.array(z.string()), invoiceNumbers: z.array(z.string()), invoiceLaunchDates: z.array(z.string()), sourceStatus: z.string().nullable(), notes: z.string().nullable(), issues: z.array(z.string())
});
app.post("/api/imports/:batchId/chunk", async (c) => {
  const user = c.get("user");
  if (!canWrite(user.role)) return c.json({ message: "Seu perfil não permite importações." }, 403);
  const batchId = c.req.param("batchId");
  const body = z.object({ rows: z.array(importRowSchema).max(12), chunkIndex: z.number().int().nonnegative() }).parse(await c.req.json());
  const batch = await c.env.DB.prepare("SELECT status FROM import_batches WHERE id = ?").bind(batchId).first<{ status: string }>();
  if (!batch || batch.status !== "PROCESSING") return c.json({ message: "Lote de importação inválido ou já finalizado." }, 409);
  let created = 0, updated = 0, issues = 0;
  for (const row of body.rows) {
    const sourceKey = await sourceHash(row);
    const existing = await c.env.DB.prepare("SELECT id, internal_code FROM orcs WHERE source_key = ? OR (? IS NOT NULL AND system_external_id = ?) LIMIT 1").bind(sourceKey, row.systemId ?? null, row.systemId ?? null).first<{ id: string; internal_code: string }>();
    const stage = deriveStage(row);
    const id = existing?.id ?? crypto.randomUUID();
    const year = row.receivedAt?.slice(0,4) ?? String(new Date().getFullYear());
    const code = existing?.internal_code ?? `ORC-${year}-${sourceKey.slice(0,8).toUpperCase()}`;
    const completedAt = stage === "CONCLUIDO" ? new Date().toISOString() : null;
    if (existing) {
      await c.env.DB.prepare(`UPDATE orcs SET system_external_id=?, received_at=?, launched_at=?, prefix_text=?, equipment=?, supplier=?, external_quote_number=?, service_amount_cents=?, parts_amount_cents=?, total_amount_cents=?, requester=?, service_order_numbers_json=?, requisition_numbers_json=?, purchase_order_numbers_json=?, purchase_order_dates_json=?, invoice_numbers_json=?, invoice_launch_dates_json=?, stage=?, source_status=?, notes=?, data_quality_json=?, source_key=?, source_row_number=?, import_batch_id=?, updated_by=?, updated_at=CURRENT_TIMESTAMP, completed_at=?, revision=revision+1 WHERE id=?`).bind(row.systemId ?? null,row.receivedAt,row.launchedAt,row.prefixText,row.equipment,row.supplier,row.externalQuoteNumber,row.serviceAmountCents,row.partsAmountCents,row.totalAmountCents,row.requester,JSON.stringify(row.serviceOrderNumbers),JSON.stringify(row.requisitionNumbers),JSON.stringify(row.purchaseOrderNumbers),JSON.stringify(row.purchaseOrderDates),JSON.stringify(row.invoiceNumbers),JSON.stringify(row.invoiceLaunchDates),stage,row.sourceStatus,row.notes,JSON.stringify(row.issues),sourceKey,row.sourceRowNumber,batchId,user.email,completedAt,id).run();
      updated++;
    } else {
      await c.env.DB.prepare(`INSERT INTO orcs (id,internal_code,system_external_id,received_at,launched_at,prefix_text,equipment,supplier,external_quote_number,service_amount_cents,parts_amount_cents,total_amount_cents,requester,owner_email,service_order_numbers_json,requisition_numbers_json,purchase_order_numbers_json,purchase_order_dates_json,invoice_numbers_json,invoice_launch_dates_json,stage,source_status,notes,data_quality_json,source_key,source_row_number,import_batch_id,created_by,updated_by,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,code,row.systemId ?? null,row.receivedAt,row.launchedAt,row.prefixText,row.equipment,row.supplier,row.externalQuoteNumber,row.serviceAmountCents,row.partsAmountCents,row.totalAmountCents,row.requester,null,JSON.stringify(row.serviceOrderNumbers),JSON.stringify(row.requisitionNumbers),JSON.stringify(row.purchaseOrderNumbers),JSON.stringify(row.purchaseOrderDates),JSON.stringify(row.invoiceNumbers),JSON.stringify(row.invoiceLaunchDates),stage,row.sourceStatus,row.notes,JSON.stringify(row.issues),sourceKey,row.sourceRowNumber,batchId,user.email,user.email,completedAt).run();
      created++;
    }
    await audit(c.env.DB, {
      entityType: "ORC", entityId: id, action: existing ? "IMPORT_UPDATE" : "IMPORT_CREATE",
      title: existing ? "Solicitação atualizada por importação" : "Solicitação criada por importação",
      description: `${row.supplier ?? "Fornecedor não informado"} · orçamento ${row.externalQuoteNumber ?? "—"}`,
      after: { stage, totalAmountCents: row.totalAmountCents, sourceRowNumber: row.sourceRowNumber, issues: row.issues },
      actor: user.email, importBatchId: batchId
    });
    if (row.issues.length) issues++;
  }
  await c.env.DB.prepare("UPDATE import_batches SET created_rows=created_rows+?, updated_rows=updated_rows+?, issue_rows=issue_rows+?, processed_chunks=processed_chunks+1 WHERE id=?").bind(created,updated,issues,batchId).run();
  return c.json({ created, updated, issues });
});

app.post("/api/imports/:batchId/finalize", async (c) => {
  const user = c.get("user");
  if (!canWrite(user.role)) return c.json({ message: "Seu perfil não permite importações." }, 403);
  const batchId = c.req.param("batchId");
  await c.env.DB.prepare("UPDATE import_batches SET status='COMPLETED', completed_at=CURRENT_TIMESTAMP WHERE id=? AND status='PROCESSING'").bind(batchId).run();
  const batch = await c.env.DB.prepare("SELECT * FROM import_batches WHERE id=?").bind(batchId).first<{ id:string; filename:string; status:string; total_rows:number; created_rows:number; updated_rows:number; issue_rows:number; created_at:string; created_by:string }>();
  if (!batch) return c.json({ message: "Importação não encontrada." }, 404);
  await audit(c.env.DB, { entityType: "IMPORT", entityId: batchId, action: "IMPORT_COMPLETED", title: "Importação concluída", description: `${batch.created_rows} novos, ${batch.updated_rows} atualizados e ${batch.issue_rows} com alertas`, actor: user.email, importBatchId: batchId });
  return c.json({ id: batch.id, filename: batch.filename, status: batch.status, totalRows: batch.total_rows, createdRows: batch.created_rows, updatedRows: batch.updated_rows, issueRows: batch.issue_rows, createdAt: batch.created_at, createdBy: displayName(batch.created_by) });
});

app.onError((error, c) => {
  console.error("unhandled_error", error);
  if (error instanceof z.ZodError) return c.json({ message: "Dados inválidos.", issues: error.flatten() }, 422);
  return c.json({ message: "Não foi possível concluir a operação." }, 500);
});

async function authenticate(c: Context<{ Bindings: Bindings; Variables: Variables }>): Promise<UserContext> {
  const admins = c.env.ADMIN_EMAILS?.split(",").map((x: string) => x.trim().toLowerCase()).filter(Boolean) ?? [];
  if (c.env.APP_ENV === "development" || !c.env.ACCESS_TEAM_DOMAIN || !c.env.ACCESS_AUD) {
    const email = (c.req.header("X-Dev-User-Email") ?? admins[0] ?? "dev@local.test").toLowerCase();
    return { email, name: displayName(email), role: admins.includes(email) || email === "dev@local.test" ? "admin" : "analyst" };
  }
  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (!token) throw new Error("Missing Access JWT");
  const team = c.env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  let jwks = jwksCache.get(team);
  if (!jwks) { jwks = createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`)); jwksCache.set(team, jwks); }
  const { payload } = await jwtVerify(token, jwks, { audience: c.env.ACCESS_AUD });
  const email = String(payload.email ?? "").toLowerCase();
  if (!email) throw new Error("Access JWT without email");
  return { email, name: String(payload.name ?? displayName(email)), role: admins.includes(email) ? "admin" : "viewer" };
}

async function ensureUser(db: D1Database, user: UserContext, adminEmails: string) {
  const admins = adminEmails?.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) ?? [];
  const existing = await db.prepare("SELECT role,is_active FROM users WHERE email=?").bind(user.email).first<{ role: Role; is_active:number }>();
  const role = existing?.role ?? (admins.includes(user.email) ? "admin" : user.role);
  user.role = role;
  await db.prepare(`INSERT INTO users (email,display_name,role,last_seen_at) VALUES (?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name,last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).bind(user.email,user.name,role).run();
  return existing?.is_active !== 0;
}

function canWrite(role: Role) { return ["admin","analyst","manager"].includes(role); }
function parseArray(value: string | null): string[] { try { const result = JSON.parse(value ?? "[]"); return Array.isArray(result) ? result.map(String) : []; } catch { return []; } }
function csvCell(value: unknown) { const text = String(value ?? "").replace(/"/g, "\"\""); return `"${text}"`; }
function safeFilename(name: string) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-"); }
function displayName(email: string) { const local = email.split("@")[0] ?? email; return local.split(/[._-]/).filter(Boolean).map((p) => p.charAt(0).toUpperCase()+p.slice(1)).join(" "); }
function stageLabel(stage: Stage) { return ({ SEM_LANCAMENTO:"Sem lançamento", SEM_PEDIDO:"Sem pedido", SEM_NF:"Sem NF", CONCLUIDO:"Concluído", INCONSISTENTE:"Inconsistente" } as const)[stage]; }
function monthLabel(value: string) { const [year, month] = value.split("-"); const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]; return month ? names[Number(month)-1] : `${month}/${year}`; }
function mapRanking(rows: unknown[] | undefined) { return (rows as Array<{ name: string; count: number; amount: number }> | undefined ?? []).map((r) => ({ name: r.name || "Não informado", count: r.count, amountCents: r.amount ?? 0 })); }
type Scope = { sql: string; params: unknown[] };
function scopeFor(user: UserContext): Scope {
  if (["admin","analyst","manager","auditor"].includes(user.role)) return { sql: "1=1", params: [] };
  return { sql: "UPPER(TRIM(COALESCE(requester,''))) = UPPER(TRIM(?))", params: [user.name] };
}
type SqlClause = { sql: string; params: unknown[] };
type OverviewPeriod = { key: "month"|"30d"|"year"|"all"; helper: string };
function overviewPeriod(value: string | undefined): OverviewPeriod {
  if (value === "30d") return { key: "30d", helper: "Concluídas nos últimos 30 dias" };
  if (value === "year") return { key: "year", helper: "Concluídas neste ano" };
  if (value === "all") return { key: "all", helper: "Concluídas em todo o histórico" };
  return { key: "month", helper: "Concluídas neste mês" };
}
function periodClause(period: OverviewPeriod, column: string): SqlClause {
  if (period.key === "30d") return { sql: `AND ${column} >= datetime('now','-30 days')`, params: [] };
  if (period.key === "year") return { sql: `AND ${column} >= datetime('now','start of year')`, params: [] };
  if (period.key === "all") return { sql: "", params: [] };
  return { sql: `AND ${column} >= datetime('now','start of month')`, params: [] };
}
async function ranking(db: D1Database, field: "supplier"|"requester"|"equipment", scope: Scope = { sql: "1=1", params: [] }, period: SqlClause = { sql: "", params: [] }) { return db.prepare(`SELECT COALESCE(NULLIF(TRIM(${field}),''),'Não informado') AS name, COUNT(*) AS count, COALESCE(SUM(total_amount_cents),0) AS amount FROM orcs WHERE ${scope.sql} ${period.sql} GROUP BY COALESCE(NULLIF(TRIM(${field}),''),'Não informado') ORDER BY count DESC LIMIT 5`).bind(...scope.params, ...period.params).all<{ name:string;count:number;amount:number }>(); }
function mapOrcList(row: DbOrc) { return { id: row.id, internalCode: row.internal_code, receivedAt: row.received_at, launchedAt: row.launched_at, prefixText: row.prefix_text, equipment: row.equipment, supplier: row.supplier, externalQuoteNumber: row.external_quote_number, serviceAmountCents: row.service_amount_cents, partsAmountCents: row.parts_amount_cents, totalAmountCents: row.total_amount_cents, requester: row.requester, stage: row.stage, notes: row.notes, qualityIssueCount: parseArray(row.data_quality_json).length, ageDays: Number(row.age_days ?? 0), updatedAt: row.updated_at }; }
function deriveStage(row: z.infer<typeof importRowSchema>): Stage { if (!row.launchedAt) return "SEM_LANCAMENTO"; if (!row.purchaseOrderNumbers.length) return "SEM_PEDIDO"; if (!row.invoiceNumbers.length) return "SEM_NF"; return "CONCLUIDO"; }
async function sourceHash(row: z.infer<typeof importRowSchema>) { const base = row.systemId ? `id:${row.systemId}` : [row.supplier,row.externalQuoteNumber,row.receivedAt,row.prefixText,row.serviceOrderNumbers.join("|"),row.requisitionNumbers.join("|")].map((x) => String(x ?? "").trim().toUpperCase()).join("¦"); const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base)); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2,"0")).join(""); }
async function audit(db: D1Database, event: { entityType:string; entityId:string; action:string; title:string; description?:string; before?:unknown; after?:unknown; actor:string; importBatchId?:string }) { await db.prepare("INSERT INTO audit_events (id,entity_type,entity_id,action,title,description,before_json,after_json,actor_email,import_batch_id) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),event.entityType,event.entityId,event.action,event.title,event.description ?? null,event.before ? JSON.stringify(event.before) : null,event.after ? JSON.stringify(event.after) : null,event.actor,event.importBatchId ?? null).run(); }

export default app;
