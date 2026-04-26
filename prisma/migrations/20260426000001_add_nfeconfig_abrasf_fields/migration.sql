-- AlterTable: adiciona campos ABRASF v3 obrigatórios no NfeConfig
ALTER TABLE "NfeConfig"
  ADD COLUMN IF NOT EXISTS "regimeEspecialTributacao"  TEXT NOT NULL DEFAULT '6',
  ADD COLUMN IF NOT EXISTS "incentivadorCultural"      TEXT NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS "exigibilidadeIss"          TEXT NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS "codigoTributacaoMunicipio" TEXT;
