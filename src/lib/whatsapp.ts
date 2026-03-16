import { prisma } from "@/lib/db";
import { saveWaMessage, getWaMessages } from "@/lib/wa-messages";

async function getActiveConfig() {
    const configs: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "WhatsAppConfig" WHERE "id" = 'default' LIMIT 1`
    );
    const config = configs[0];
    if (!config || !config.apiUrl || !config.globalApiKey) return null;

    // Substitui localhost pelo hostname interno do Docker
    const apiUrl = (config.apiUrl.includes("localhost") || config.apiUrl.includes("127.0.0.1"))
        ? "http://evolution-api:8081"
        : config.apiUrl;

    return { apiUrl, apiKey: config.globalApiKey };
}

async function getActiveInstance(): Promise<string | null> {
    // Tenta primeiro um canal conectado
    const connected: any[] = await prisma.$queryRawUnsafe(
        `SELECT "instanceName" FROM "WhatsAppChannel" WHERE "isActive" = 1 AND "status" = 'open' ORDER BY "updatedAt" DESC LIMIT 1`
    );
    if (connected.length > 0) return connected[0].instanceName;

    // Fallback: qualquer canal ativo
    const fallback: any[] = await prisma.$queryRawUnsafe(
        `SELECT "instanceName" FROM "WhatsAppChannel" WHERE "isActive" = 1 ORDER BY "updatedAt" DESC LIMIT 1`
    );
    return fallback[0]?.instanceName ?? null;
}

export async function sendWhatsAppMessage(to: string, message: string) {
    try {
        const config = await getActiveConfig();
        if (!config) {
            console.warn("[WHATSAPP_SERVICE] Configuração ausente ou incompleta.");
            return false;
        }

        const instance = await getActiveInstance();
        if (!instance) {
            console.warn("[WHATSAPP_SERVICE] Nenhum canal ativo encontrado.");
            return false;
        }

        const cleanNumber = to.replace(/\D/g, "");
        const url = `${config.apiUrl}/message/sendText/${instance}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": config.apiKey,
            },
            body: JSON.stringify({
                number: cleanNumber,
                text: message,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("[WHATSAPP_SEND_ERROR]", JSON.stringify(err));
            return false;
        }

        const sent = await response.json();

        // Persiste a mensagem enviada no banco local (tabela wa_messages)
        try {
            await saveWaMessage({
                id: sent.key?.id || `local-${Date.now()}`,
                instanceName: instance,
                remoteJid: `${cleanNumber}@s.whatsapp.net`,
                messageId: sent.key?.id ?? null,
                body: message,
                fromMe: true,
                status: sent.status || "PENDING",
                timestamp: sent.messageTimestamp || Math.floor(Date.now() / 1000),
            });
        } catch (saveErr) {
            console.error("[WHATSAPP_SAVE_ERROR]", saveErr);
        }

        return true;
    } catch (error) {
        console.error("[WHATSAPP_SERVICE_ERROR]", error);
        return false;
    }
}

export async function getWhatsAppMessages(phone: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    try {
        const config = await getActiveConfig();
        const instance = await getActiveInstance();

        // Mensagens salvas localmente (sempre disponíveis)
        const localMessages = instance
            ? await getWaMessages(instance, remoteJid)
            : [];
        const localIds = new Set(localMessages.map((m: any) => m.id));

        if (!config || !instance) return localMessages;

        // Tenta buscar histórico na Evolution API
        let apiMessages: any[] = [];
        try {
            const url = `${config.apiUrl}/chat/findMessages/${instance}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": config.apiKey },
                body: JSON.stringify({ where: { key: { remoteJid } }, limit: 50 }),
            });

            if (response.ok) {
                const data = await response.json();
                const raw = Array.isArray(data) ? data : data.messages ?? [];
                apiMessages = raw.map((msg: any) => ({
                    id: msg.key?.id || String(Date.now()),
                    body:
                        msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.imageMessage?.caption ||
                        "[mídia]",
                    fromMe: msg.key?.fromMe ?? false,
                    time: msg.messageTimestamp
                        ? new Date(Number(msg.messageTimestamp) * 1000).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                          })
                        : "Agora",
                    timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) : 0,
                }));
            }
        } catch {
            // Evolution API indisponível — usa apenas mensagens locais
        }

        // Mescla: API tem prioridade, locais preenchem o que a API não retornou
        const apiIds = new Set(apiMessages.map((m: any) => m.id));
        const onlyLocal = localMessages.filter((m: any) => !apiIds.has(m.id));
        const merged = [...apiMessages, ...onlyLocal];
        merged.sort((a: any, b: any) => a.timestamp - b.timestamp);
        return merged;
    } catch (error) {
        console.error("[WHATSAPP_GET_MESSAGES_ERROR]", error);
        return [];
    }
}

export async function getWhatsAppChats() {
    try {
        const config = await getActiveConfig();
        if (!config) return [];

        const instance = await getActiveInstance();
        if (!instance) return [];

        const url = `${config.apiUrl}/chat/findMany/${instance}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": config.apiKey },
            body: JSON.stringify({ where: {} }),
        });

        if (!response.ok) return [];

        const data = await response.json();

        return (Array.isArray(data) ? data : [])
            .filter((chat: any) => chat.remoteJid && !chat.remoteJid.includes("@g.us")) // exclui grupos
            .map((chat: any) => ({
                id: chat.remoteJid,
                phone: chat.remoteJid.split("@")[0],
                customerName: chat.pushName || chat.name || null,
                lastMessage:
                    chat.lastMessage?.message?.conversation ||
                    chat.lastMessage?.message?.extendedTextMessage?.text ||
                    "",
                time: chat.updatedAt
                    ? new Date(chat.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : "Agora",
                unread: chat.unreadMessages || 0,
            }));
    } catch (error) {
        console.error("[WHATSAPP_GET_CHATS_ERROR]", error);
        return [];
    }
}
