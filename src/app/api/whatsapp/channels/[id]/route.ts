import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        // 1. Buscar detalhes do canal
        const channel = await (prisma as any).whatsAppChannel.findUnique({
            where: { id: params.id }
        });

        if (!channel) {
            return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
        }

        // 2. Tentar deletar na Evolution API se houver configuração
        const configs: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WhatsAppConfig" WHERE "id" = 'default' LIMIT 1`
        );
        const config = configs[0];

        const apiUrl = channel.apiUrl || config?.apiUrl;
        const apiKey = channel.apiKey || config?.apiKey;

        if (apiUrl && apiKey && channel.instanceName) {
            try {
                // Logout primeiro (frequentemente necessário para evitar locks)
                await fetch(`${apiUrl}/instance/logout/${channel.instanceName}`, {
                    method: "DELETE",
                    headers: { "apikey": apiKey }
                });
                
                // Deleção real
                await fetch(`${apiUrl}/instance/delete/${channel.instanceName}`, {
                    method: "DELETE",
                    headers: { "apikey": apiKey }
                });
            } catch (apiErr) {
                console.warn("[WHATSAPP_EVOLUTION_DELETE_WARN]", apiErr);
                // Continuamos a deleção no banco mesmo se a API falhar (para permitir limpeza)
            }
        }

        // 3. Deletar no banco local
        await (prisma as any).whatsAppChannel.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WHATSAPP_CHANNEL_DELETE]", error);
        return NextResponse.json({ error: "Erro ao excluir canal" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { isActive, name } = body;
        const now = new Date().toISOString();

        if (isActive !== undefined) {
            await prisma.$executeRawUnsafe(
                `UPDATE "WhatsAppChannel" SET "isActive" = ?, "updatedAt" = ? WHERE "id" = ?`,
                isActive ? 1 : 0, now, params.id
            );
        }

        if (name !== undefined) {
            await prisma.$executeRawUnsafe(
                `UPDATE "WhatsAppChannel" SET "name" = ?, "updatedAt" = ? WHERE "id" = ?`,
                name, now, params.id
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WHATSAPP_CHANNEL_UPDATE]", error);
        return NextResponse.json({ error: "Erro ao atualizar canal" }, { status: 500 });
    }
}
