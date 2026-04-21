import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLatestWhatsAppVersion } from "@/lib/tasks/whatsapp-version";
import { headers } from "next/headers";

export async function POST(req: Request) {
    try {
        const { taskId } = await req.json();

        const task = await prisma.scheduledTask.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
        }

        let result = "";
        let success = true;

        switch (task.type) {
            case "wa_check":
                const latestVersion = await getLatestWhatsAppVersion();
                if (latestVersion) {
                    await prisma.whatsAppConfig.upsert({
                        where: { id: "default" },
                        create: { id: "default", waVersion: latestVersion },
                        update: { waVersion: latestVersion }
                    });
                    result = `Versão sincronizada: ${latestVersion}`;
                } else {
                    result = "Não foi possível extrair a versão.";
                    success = false;
                }
                break;

            case "backup":
                // Mock de backup
                result = "Backup simulado com sucesso.";
                break;

            case "nfe_batch":
                // Lógica de faturamento em lote
                const activeSubscriptions = await prisma.subscription.findMany({
                    where: { status: "active" },
                    include: { client: true }
                });

                let count = 0;
                for (const sub of activeSubscriptions) {
                    await prisma.transaction.create({
                        data: {
                            user: { connect: { id: sub.userId } },
                            client: { connect: { id: sub.clientId } },
                            amount: sub.amount,
                            description: `Faturamento Mensal - ${sub.description}`,
                            type: "receita",
                            category: "servicos",
                            status: "pendente"
                        }
                    });
                    count++;
                }
                result = `Processamento em lote concluído: ${count} notas geradas.`;
                break;

            default:
                // Verificação de licenças de plugin
            case "license_check":
                const cronSecret = process.env.CRON_SECRET;
                const licenseRes = await fetch(
                    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/cron/license-check`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-cron-secret": cronSecret ?? "",
                        },
                    }
                );
                const licenseData = await licenseRes.json();
                result = `Licenças verificadas — suspensas: ${licenseData.suspended}, bloqueadas: ${licenseData.blocked}, avisadas: ${licenseData.warned}, reativadas: ${licenseData.reactivated}, erros: ${licenseData.errors}`;
                success = licenseRes.ok;
                break;

            default:
                result = `Tipo de tarefa ${task.type} ainda não implementado no worker.`;
                success = false;
        }

        // Atualizar última execução
        await prisma.scheduledTask.update({
            where: { id: taskId },
            data: {
                lastRun: new Date(),
                status: success ? "active" : "failed"
            }
        });

        return NextResponse.json({ message: result, success });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
