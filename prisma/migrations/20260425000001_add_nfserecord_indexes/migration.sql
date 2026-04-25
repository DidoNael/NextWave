-- CreateIndex: índices de performance no NfseRecord
CREATE INDEX IF NOT EXISTS "NfseRecord_clientId_idx" ON "NfseRecord"("clientId");
CREATE INDEX IF NOT EXISTS "NfseRecord_serviceId_idx" ON "NfseRecord"("serviceId");
CREATE INDEX IF NOT EXISTS "NfseRecord_status_idx" ON "NfseRecord"("status");
CREATE INDEX IF NOT EXISTS "NfseRecord_status_createdAt_idx" ON "NfseRecord"("status", "createdAt" DESC);
