import { NextResponse } from "next/server";
import { saveWaMessage } from "@/lib/wa-messages";
import { notifyNewWaMessage } from "@/lib/wa-events";

/**
 * Webhook da Evolution API — recebe eventos de mensagens em tempo real.
 * Configurado automaticamente ao conectar um canal.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const event: string = body.event || body.type || "";
        const instanceName: string = body.instance || "";

        console.log(`[WEBHOOK] Evento recebido: ${event} | instância: ${instanceName}`);

        // Evento de nova mensagem recebida/enviada
        if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
            const data = body.data;
            if (!data) return NextResponse.json({ ok: true });

            const messages = Array.isArray(data) ? data : [data];

            for (const msg of messages) {
                const key = msg.key || {};
                const remoteJid: string = key.remoteJid || "";
                const fromMe: boolean = key.fromMe ?? false;
                const msgId: string = key.id || `wh-${Date.now()}`;

                // Ignora grupos
                if (!remoteJid || remoteJid.includes("@g.us")) continue;

                const body_text: string =
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    msg.message?.videoMessage?.caption ||
                    msg.message?.documentMessage?.caption ||
                    "[mídia]";

                const timestamp: number = msg.messageTimestamp
                    ? Number(msg.messageTimestamp)
                    : Math.floor(Date.now() / 1000);

                await saveWaMessage({
                    id: msgId,
                    instanceName,
                    remoteJid,
                    messageId: msgId,
                    body: body_text,
                    fromMe,
                    status: msg.status || (fromMe ? "PENDING" : "RECEIVED"),
                    timestamp,
                });

                // Notifica clientes SSE sobre nova mensagem
                if (!fromMe) notifyNewWaMessage();
            }
        }

        // Evento de atualização de status de mensagem
        if (event === "messages.update" || event === "MESSAGES_UPDATE") {
            // Poderia atualizar status no banco (DELIVERY_ACK, READ, etc.)
            // Por ora, apenas loga
            console.log("[WEBHOOK] message update:", JSON.stringify(body.data).substring(0, 200));
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[WEBHOOK_ERROR]", error);
        return NextResponse.json({ ok: true }); // Sempre 200 para a Evolution API não retentar
    }
}

// Permite que a Evolution API verifique o webhook com GET
export async function GET() {
    return NextResponse.json({ status: "webhook ativo" });
}
