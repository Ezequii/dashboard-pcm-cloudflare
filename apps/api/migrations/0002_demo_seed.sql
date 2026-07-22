INSERT OR IGNORE INTO users (email,display_name,role,last_seen_at) VALUES
('dev@local.test','Ezequiel Caetano','admin',CURRENT_TIMESTAMP),
('charles@empresa.com','Charles Romayni','analyst',CURRENT_TIMESTAMP),
('kamilla@empresa.com','Kamilla Santos','requester',CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO orcs (
 id,internal_code,received_at,launched_at,prefix_text,equipment,supplier,external_quote_number,
 service_amount_cents,parts_amount_cents,total_amount_cents,requester,owner_email,
 service_order_numbers_json,requisition_numbers_json,purchase_order_numbers_json,purchase_order_dates_json,
 invoice_numbers_json,invoice_launch_dates_json,stage,source_status,notes,data_quality_json,source_key,
 source_row_number,created_by,updated_by,created_at,updated_at,completed_at
) VALUES
('demo-1','ORC-2026-002184','2026-07-17','2026-07-18','61521066','COLHEDORA DE ALGODÃO JOHN DEERE CP690','ASTER MÁQUINAS','63295146',1450000,533226,1983226,'CHARLES ROMAYNI','dev@local.test','["9728651"]','["834744"]','[]','[]','[]','[]','SEM_PEDIDO','FALTA PEDIDO','Recuperação do eletroventilador','[]','demo-source-1',3,'dev@local.test','dev@local.test',datetime('now','-5 days'),datetime('now','-12 minutes'),NULL),
('demo-2','ORC-2026-002183','2026-07-09','2026-07-10','23120016','EMPILHADEIRA COMBUSTÃO TOYOTA 8FGU30','DM MANUTENÇÕES','4300/15801',895000,0,895000,'EDUARDO PALMA','charles@empresa.com','["9717127"]','["834504"]','["41779305"]','["2026-07-10"]','[]','[]','SEM_NF','FALTA NF','Revisar dois cilindros','[]','demo-source-2',4,'dev@local.test','charles@empresa.com',datetime('now','-13 days'),datetime('now','-58 minutes'),NULL),
('demo-3','ORC-2026-002182','2026-07-19',NULL,'31521034','CHASSI COLHEDORA DE ALGODÃO','PARANÁ PEÇAS','9896014',2720000,0,2720000,'KAMYLLA SANTOS','dev@local.test','["9721001"]','[]','[]','[]','[]','[]','SEM_LANCAMENTO','FALTA LANÇAMENTO','Jateamento e pintura','[]','demo-source-3',5,'dev@local.test','dev@local.test',datetime('now','-3 days'),datetime('now','-2 hours'),NULL),
('demo-4','ORC-2026-002181','2026-06-18','2026-06-19','81521333','SEMI REBOQUE TANQUE RODOTÉCNICA 31.000L','CAMPO ERE','RC-55212',11800000,2400000,14200000,'CHARLES ROMAYNI',NULL,'["9721002"]','["834510"]','["41780001"]','["2026-06-20"]','[]','[]','SEM_NF','FALTA NF','Revisar vínculo entre pedido e NF','["Valor acima de R$ 100 mil","Documento fiscal ausente"]','demo-source-4',6,'dev@local.test','dev@local.test',datetime('now','-34 days'),datetime('now','-3 hours'),NULL),
('demo-5','ORC-2026-002180','2026-07-11','2026-07-12','40892','UTILITÁRIO FIAT STRADA FREE 1.3 CD','AGRO AR','247',320000,48000,368000,'JOÃO PEDRO','charles@empresa.com','["9721003"]','["834511"]','["41780002"]','["2026-07-13"]','[]','[]','SEM_NF','FALTA NF','Aplicação de insulfilm','[]','demo-source-5',7,'dev@local.test','charles@empresa.com',datetime('now','-11 days'),datetime('now','-4 hours'),NULL),
('demo-6','ORC-2026-002179','2026-07-03','2026-07-04','51521085 / 51521087','COLHEDORA DE ALGODÃO JOHN DEERE CP690','ASTER MÁQUINAS','42107',244359,0,244359,'KAMYLLA SANTOS','dev@local.test','["9728651"]','["834744"]','["41779605","41779606"]','["2026-07-05","2026-07-05"]','["315328-1","161-26"]','["2026-07-08","2026-07-09"]','CONCLUIDO','CONCLUÍDO','Serviço concluído','[]','demo-source-6',8,'dev@local.test','dev@local.test',datetime('now','-19 days'),datetime('now','-34 minutes'),datetime('now','-34 minutes'));

INSERT OR IGNORE INTO audit_events (id,entity_type,entity_id,action,title,description,actor_email,created_at) VALUES
('audit-1','ORC','demo-1','UPDATE','Pedido informado','Pedido 41896855 adicionado','dev@local.test',datetime('now','-12 minutes')),
('audit-2','ORC','demo-6','UPDATE','Solicitação concluída','NF validada e lançada','charles@empresa.com',datetime('now','-34 minutes')),
('audit-3','ORC','demo-2','DOCUMENT_ADD','Nota fiscal recebida','Documento vinculado ao ORC','kamilla@empresa.com',datetime('now','-70 minutes')),
('audit-4','ORC','demo-3','UPDATE','Responsável atualizado','Atribuído ao time de PCM','dev@local.test',datetime('now','-154 minutes'));
