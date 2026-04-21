import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
}

function warningMessage(customerName: string, daysUntilSuspension: number): string {
  return (
    `⚠️ *Aviso importante, ${customerName}!*\n\n` +
    `Identificamos uma fatura em aberto no seu contrato de Plugin Grafana (Netstream Topology).\n\n` +
    `Seu acesso será *suspenso automaticamente em ${daysUntilSuspension} dia(s)* caso o pagamento não seja regularizado.\n\n` +
    `Entre em contato com nosso suporte para evitar a interrupção do serviço.\n` +
    `📞 (11) 95990-4100 | 🌐 suporte.netstream.net.br`
  );
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const results = { warned: 0, suspended: 0, blocked: 0, reactivated: 0, errors: 0 };

  const licenses = await prisma.pluginLicense.findMany({
    where: {
      status: { in: ["active", "suspended"] },
      isTrial: false,
      service: { category: "plugin-grafana" },
    },
    include: {
      client: { select: { name: true, phone: true } },
      service: { select: { title: true } },
    },
  });

  for (const license of licenses) {
    try {
      // Busca fatura mais antiga pendente e vencida
      const overdueTransaction = await prisma.transaction.findFirst({
        where: {
          OR: [
            { clientId: license.clientId },
            { serviceId: license.serviceId },
          ],
          type: "receita",
          status: "pendente",
          dueDate: { lt: new Date() },
        },
        orderBy: { dueDate: "asc" },
      });

      // Sem atraso → limpa estado e reativa se estava suspenso
      if (!overdueTransaction) {
        if (license.overdueDetectedAt || license.status === "suspended") {
          await prisma.pluginLicense.update({
            where: { id: license.id },
            data: { overdueDetectedAt: null, lastWarningAt: null, status: "active" },
          });
          results.reactivated++;
        }
        continue;
      }

      // Registra início do atraso na primeira detecção
      const overdueStart = license.overdueDetectedAt ?? new Date();
      if (!license.overdueDetectedAt) {
        await prisma.pluginLicense.update({
          where: { id: license.id },
          data: { overdueDetectedAt: overdueStart },
        });
        continue; // processa estágios no próximo ciclo
      }

      const dias = daysSince(overdueStart);
      const grace = license.graceDays;

      if (dias >= grace + 5) {
        // Estágio 3: bloqueio definitivo
        if (license.status !== "blocked") {
          await prisma.pluginLicense.update({
            where: { id: license.id },
            data: { status: "blocked" },
          });
          results.blocked++;
        }
      } else if (dias >= grace) {
        // Estágio 2: suspensão
        if (license.status !== "suspended") {
          await prisma.pluginLicense.update({
            where: { id: license.id },
            data: { status: "suspended" },
          });
          results.suspended++;
        }
      } else if (dias >= grace - 2) {
        // Estágio 1: aviso WhatsApp (uma vez por estágio)
        const jaAvisouNesseEstagio =
          license.lastWarningAt &&
          daysSince(license.lastWarningAt) < grace - 2;

        if (!jaAvisouNesseEstagio && license.client?.phone) {
          const diasRestantes = grace - dias;
          const sent = await sendWhatsAppMessage(
            license.client.phone,
            warningMessage(license.client.name ?? license.customerName, diasRestantes)
          );
          if (sent) {
            await prisma.pluginLicense.update({
              where: { id: license.id },
              data: { lastWarningAt: new Date() },
            });
            results.warned++;
          }
        }
      }
    } catch (err) {
      console.error(`[CRON_LICENSE] Erro na licença ${license.id}:`, err);
      results.errors++;
    }
  }

  console.log("[CRON_LICENSE] Resultado:", results);
  return NextResponse.json({ ok: true, ...results });
}
