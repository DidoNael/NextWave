import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const channels: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WhatsAppChannel" WHERE "id" = ? LIMIT 1`,
            params.id
        );

        const channel = channels[0];
        if (!channel) {
            return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
        }

        const configs: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WhatsAppConfig" WHERE "id" = 'default' LIMIT 1`
        );
        const config = configs[0];

        if (!config || !config.apiUrl || !config.globalApiKey) {
            return NextResponse.json({ error: "Evolution API não configurada globalmente" }, { status: 400 });
        }

        const apiUrl = (config.apiUrl.includes('localhost') || config.apiUrl.includes('127.0.0.1'))
            ? 'http://evolution-api:8081'
            : config.apiUrl;

        const headers = { 'apikey': config.globalApiKey, 'Content-Type': 'application/json' };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            let connectRes = await fetch(`${apiUrl}/instance/connect/${channel.instanceName}`, {
                headers,
                signal: controller.signal
            });

            // Instância não existe → cria automaticamente e reconecta
            if (connectRes.status === 404) {
                console.log(`[QRCODE] Instância ${channel.instanceName} não existe. Criando...`);

                const createRes = await fetch(`${apiUrl}/instance/create`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        instanceName: channel.instanceName,
                        qrcode: true,
                        integration: "WHATSAPP-BAILEYS"
                    })
                });

                if (!createRes.ok) {
                    const errText = await createRes.text();
                    console.error(`[QRCODE] Falha ao criar instância: ${errText}`);
                    return NextResponse.json({ qrcode: null, status: 'error', message: "Falha ao criar instância na Evolution API" });
                }

                // Aguarda 2s para a instância inicializar
                await new Promise(resolve => setTimeout(resolve, 2000));

                connectRes = await fetch(`${apiUrl}/instance/connect/${channel.instanceName}`, { headers });
            }

            clearTimeout(timeoutId);

            console.log(`[QRCODE] Instância: ${channel.instanceName}, Status HTTP: ${connectRes.status}`);

            if (!connectRes.ok) {
                return NextResponse.json({ qrcode: null, status: 'preparing' });
            }

            const data = await connectRes.json();
            console.log(`[QRCODE] Resposta:`, JSON.stringify(data).substring(0, 200));

            // Já conectado — atualiza DB e retorna status
            if (data?.instance?.state === 'open' || data?.state === 'open') {
                // Busca número conectado
                const infoRes = await fetch(`${apiUrl}/instance/fetchInstances`, { headers }).catch(() => null);
                let phone: string | null = null;
                if (infoRes?.ok) {
                    const instances: any[] = await infoRes.json().catch(() => []);
                    const inst = instances.find((i: any) => i.name === channel.instanceName);
                    phone = inst?.ownerJid?.split('@')[0] ?? null;
                }
                // Sincroniza status no banco
                await prisma.$executeRawUnsafe(
                    `UPDATE "WhatsAppChannel" SET "status" = 'open', "updatedAt" = ? WHERE "id" = ?`,
                    new Date().toISOString(),
                    channel.id
                ).catch(() => null);

                // Configura webhook na Evolution API para receber mensagens em tempo real
                const webhookUrl = `http://nextwave-crm:3000/api/whatsapp/webhook`;
                await fetch(`${apiUrl}/webhook/set/${channel.instanceName}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        webhook: {
                            enabled: true,
                            url: webhookUrl,
                            webhookByEvents: false,
                            webhookBase64: false,
                            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
                        }
                    })
                }).catch((e) => console.warn('[QRCODE] Falha ao configurar webhook:', e.message));

                return NextResponse.json({ qrcode: null, status: 'connected', phone });
            }

            // QR lido mas ainda conectando — atualiza status para "connecting"
            if (data?.instance?.state === 'connecting' || data?.state === 'connecting') {
                await prisma.$executeRawUnsafe(
                    `UPDATE "WhatsAppChannel" SET "status" = 'connecting', "updatedAt" = ? WHERE "id" = ?`,
                    new Date().toISOString(),
                    channel.id
                ).catch(() => null);
            }

            // QR code disponível
            if (data?.base64) {
                return NextResponse.json({ qrcode: data.base64, status: 'ready' });
            }

            return NextResponse.json({ qrcode: null, status: 'preparing' });

        } catch (apiErr: any) {
            clearTimeout(timeoutId);
            console.error("[QRCODE] Erro ou timeout:", apiErr.message);
            return NextResponse.json({ qrcode: null, status: 'pending' });
        }

    } catch (error) {
        console.error("[WHATSAPP_CHANNEL_QRCODE]", error);
        return NextResponse.json({ error: "Erro ao gerar QR Code" }, { status: 500 });
    }
}
