/**
 * Módulo de persistência de mensagens WhatsApp
 * Tabela gerenciada pelo Prisma: wa_messages
 */
import { prisma } from "@/lib/db";

export interface WaMessage {
    id: string;
    instanceName: string;
    remoteJid: string;
    messageId?: string | null;
    body: string;
    fromMe: boolean;
    status: string;
    timestamp: number;
}

export async function saveWaMessage(msg: WaMessage) {
    await prisma.waMessage.upsert({
        where: { id: msg.id },
        create: {
            id: msg.id,
            instanceName: msg.instanceName,
            remoteJid: msg.remoteJid,
            messageId: msg.messageId ?? null,
            body: msg.body,
            fromMe: msg.fromMe,
            status: msg.status,
            timestamp: msg.timestamp,
        },
        update: {
            status: msg.status,
        },
    });
}

export async function getWaMessages(instanceName: string, remoteJid: string, limit = 50): Promise<any[]> {
    const rows = await prisma.waMessage.findMany({
        where: { instanceName, remoteJid },
        orderBy: { timestamp: "asc" },
        take: limit,
    });

    return rows.map((r) => ({
        id: r.id,
        body: r.body,
        fromMe: r.fromMe,
        status: r.status,
        timestamp: r.timestamp,
        time: new Date(r.timestamp * 1000).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        }),
    }));
}
