import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLatestWhatsAppVersion } from "@/lib/tasks/whatsapp-version";

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
