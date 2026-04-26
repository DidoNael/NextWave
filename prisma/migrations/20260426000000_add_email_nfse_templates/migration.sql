-- CreateTable: modelos de email para envio de NFS-e
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable: adiciona referências de template ao cliente
ALTER TABLE "Client" ADD COLUMN "nfseTemplateId"   TEXT REFERENCES "NfseTipoServico"("id") ON DELETE SET NULL;
ALTER TABLE "Client" ADD COLUMN "emailTemplateId"  TEXT REFERENCES "EmailTemplate"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_nfseTemplateId_idx"  ON "Client"("nfseTemplateId");
CREATE INDEX IF NOT EXISTS "Client_emailTemplateId_idx" ON "Client"("emailTemplateId");

-- Seed: template de email padrão
INSERT OR IGNORE INTO "EmailTemplate" ("id", "name", "subject", "body", "isDefault", "createdAt", "updatedAt") VALUES (
  'default-nfse-email',
  'Padrão NFS-e',
  'NFS-e nº {{numero}} emitida — {{valor}}',
  '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 8px;color:#1a1a2e">Nota Fiscal de Serviço Emitida</h2>
  <p style="color:#555">Olá, <strong>{{nomeCliente}}</strong>.</p>
  <p style="color:#555">Sua Nota Fiscal de Serviço eletrônica foi emitida com sucesso.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border:1px solid #eee;color:#888">Número NFS-e</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">{{numero}}</td></tr>
    <tr><td style="padding:8px;border:1px solid #eee;color:#888">Valor</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">{{valor}}</td></tr>
    <tr><td style="padding:8px;border:1px solid #eee;color:#888">Serviço</td><td style="padding:8px;border:1px solid #eee">{{discriminacao}}</td></tr>
  </table>
  {{linkNfse}}
  <p style="color:#aaa;font-size:11px;margin-top:24px">Em caso de dúvidas, entre em contato conosco.</p>
</div>',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
