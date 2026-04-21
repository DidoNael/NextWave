import { prisma } from "@/lib/db";

interface LogParams {
  licenseId: string;
  event: string;
  fromStatus?: string;
  toStatus?: string;
  description: string;
  actor?: string;
}

export async function logLicenseEvent(params: LogParams): Promise<void> {
  try {
    await prisma.pluginLicenseLog.create({
      data: {
        licenseId: params.licenseId,
        event: params.event,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        description: params.description,
        actor: params.actor ?? "system",
      },
    });
  } catch (e) {
    console.error("[LicenseLog] Falha ao registrar evento:", e);
  }
}
