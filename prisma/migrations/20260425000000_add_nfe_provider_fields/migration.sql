-- AlterTable: adiciona campos de provedor ao NfeConfig
ALTER TABLE "NfeConfig" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'ginfes';
ALTER TABLE "NfeConfig" ADD COLUMN IF NOT EXISTS "providerCredentials" TEXT;
