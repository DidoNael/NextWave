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

        // Normaliza número: garante código de país 55 (Brasil)
        let cleanNumber = to.replace(/\D/g, "");
        if (cleanNumber.length <= 11) {
            cleanNumber = "55" + cleanNumber;
        }
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
        // Nota: o filtro por key.remoteJid causa 500 na Evolution API 2.2.3,
        // então buscamos as últimas 100 mensagens e filtramos no cliente.
        let apiMessages: any[] = [];
        try {
            const url = `${config.apiUrl}/chat/findMessages/${instance}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": config.apiKey },
                body: JSON.stringify({ where: {}, limit: 100 }),
            });

            if (response.ok) {
                const data = await response.json();
                const records: any[] = data.messages?.records ?? (Array.isArray(data) ? data : []);
                // Filtra apenas mensagens do contato específico
                const filtered = records.filter(
                    (msg: any) => msg.key?.remoteJid === remoteJid
                );

                // Persiste mensagens novas no wa_messages (substitui webhook para recebidas)
                const knownLocalIds = new Set(localMessages.map((m: any) => m.id));
                for (const msg of filtered) {
                    const msgId = msg.key?.id;
                    if (!msgId || knownLocalIds.has(msgId)) continue;
                    const bodyText =
                        msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.imageMessage?.caption ||
                        msg.message?.videoMessage?.caption ||
                        "[mídia]";
                    await saveWaMessage({
                        id: msgId,
                        instanceName: instance,
                        remoteJid,
                        messageId: msgId,
                        body: bodyText,
                        fromMe: msg.key?.fromMe ?? false,
                        status: msg.key?.fromMe ? "SENT" : "RECEIVED",
                        timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) : Math.floor(Date.now() / 1000),
                    }).catch(() => null);
                }

                apiMessages = filtered.map((msg: any) => ({
                    id: msg.key?.id || String(Date.now()),
                    body:
                        msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.imageMessage?.caption ||
                        msg.message?.videoMessage?.caption ||
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
        const instance = await getActiveInstance();

        // Busca conversas salvas localmente no wa_messages
        let localChats: any[] = [];
        if (instance) {
            const lastMsgs: any[] = await prisma.$queryRawUnsafe(
                `SELECT w1.remote_jid, w1.body, w1.timestamp, w1.from_me
                 FROM wa_messages w1
                 WHERE w1.instance_name = ?
                   AND w1.timestamp = (
                       SELECT MAX(w2.timestamp) FROM wa_messages w2
                       WHERE w2.instance_name = w1.instance_name
                         AND w2.remote_jid = w1.remote_jid
                   )
                 ORDER BY w1.timestamp DESC`,
                instance
            );
            localChats = lastMsgs
                .filter((r: any) => !r.remote_jid.includes("@g.us"))
                .map((r: any) => ({
                    id: r.remote_jid,
                    phone: r.remote_jid.split("@")[0],
                    customerName: null,
                    lastMessage: r.body || "",
                    time: new Date(Number(r.timestamp) * 1000).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    unread: 0,
                    _timestamp: Number(r.timestamp),
                }));
        }

        // Tenta buscar chats da Evolution API
        let apiChats: any[] = [];
        const config = await getActiveConfig();
        if (config && instance) {
            try {
                const url = `${config.apiUrl}/chat/findMany/${instance}`;
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "apikey": config.apiKey },
                    body: JSON.stringify({ where: {} }),
                });
                if (response.ok) {
                    const data = await response.json();
                    apiChats = (Array.isArray(data) ? data : [])
                        .filter((chat: any) => chat.remoteJid && !chat.remoteJid.includes("@g.us"))
                        .map((chat: any) => ({
                            id: chat.remoteJid,
                            phone: chat.remoteJid.split("@")[0],
                            customerName: chat.pushName || chat.name || null,
                            lastMessage:
                                chat.lastMessage?.message?.conversation ||
                                chat.lastMessage?.message?.extendedTextMessage?.text ||
                                "",
                            time: chat.updatedAt
                                ? new Date(chat.updatedAt).toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })
                                : "Agora",
                            unread: chat.unreadMessages || 0,
                            _timestamp: chat.updatedAt ? new Date(chat.updatedAt).getTime() / 1000 : 0,
                        }));
                }
            } catch {
                // Evolution API indisponível — usa apenas locais
            }
        }

        // Mescla: API tem prioridade (sobrescreve locais com mesmo remoteJid)
        const apiIds = new Set(apiChats.map((c: any) => c.id));
        const onlyLocal = localChats.filter((c: any) => !apiIds.has(c.id));
        const merged = [...apiChats, ...onlyLocal];
        merged.sort((a: any, b: any) => (b._timestamp || 0) - (a._timestamp || 0));

        // Enriquece com nomes do CRM (busca em lote por telefone)
        const phones = merged.map((c: any) => c.phone as string).filter(Boolean);
        if (phones.length > 0) {
            try {
                const clients: any[] = await prisma.$queryRawUnsafe(
                    `SELECT name, phone FROM "Client" WHERE phone IS NOT NULL`
                );
                // Mapa: últimos 11 dígitos → nome (para tolerar variações de código de país)
                const phoneMap = new Map<string, string>();
                for (const cl of clients) {
                    const digits = String(cl.phone).replace(/\D/g, "");
                    if (digits.length >= 8) phoneMap.set(digits.slice(-11), cl.name);
                }
                for (const chat of merged) {
                    const digits = String(chat.phone).replace(/\D/g, "");
                    const key = digits.slice(-11);
                    const crmName = phoneMap.get(key);
                    if (crmName) chat.customerName = crmName;
                }
            } catch {
                // Ignora erros de lookup — exibe nome do WhatsApp como fallback
            }
        }

        return merged.map(({ _timestamp, ...rest }: any) => rest);
    } catch (error) {
        console.error("[WHATSAPP_GET_CHATS_ERROR]", error);
        return [];
    }
}
