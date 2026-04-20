import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

/**
 * Gera uma chave pública de licença no padrão NSTM-xxxx
 */
export function generateLicenseKey(): string {
  return "NSTM-" + randomBytes(16).toString("hex").toUpperCase();
}

/**
 * Gera uma chave secreta de 32 bytes para assinaturas HMAC
 */
export function generateSecretKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Cria uma licença de plugin vinculada a um serviço/organização
 */
export async function createPluginLicense({
  customerName,
  customerEmail,
  organizationId,
  serviceId,
  clientId,
  isTrial = false,
  trialDays = 3
}: {
  customerName: string;
  customerEmail?: string | null;
  organizationId: string;
  serviceId?: string | null;
  clientId?: string | null;
  isTrial?: boolean;
  trialDays?: number;
}) {
  let trialEndsAt: Date | null = null;
  if (isTrial) {
    trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
  }

  return await prisma.pluginLicense.create({
    data: {
      key: generateLicenseKey(),
      secretKey: generateSecretKey(),
      customerName,
      customerEmail,
      status: "active",
      isTrial,
      trialEndsAt,
      serviceId,
      clientId,
      organizationId,
    },
  });
}
