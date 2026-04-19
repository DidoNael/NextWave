import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const channels: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WhatsAppChannel" ORDER BY "updatedAt" DESC`
        );

        // Registra webhook para canais conectados (em background, não bloqueia resposta)
        const openChannels = channels.filter((c: any) => c.isActive && c.status === 'open');
        if (openChannels.length > 0) {
            const configs: any[] = await prisma.$queryRawUnsafe(
                `SELECT * FROM "WhatsAppConfig" WHERE "id" = 'default' LIMIT 1`
            );
            const config = configs[0];
            if (config?.apiUrl && config?.globalApiKey) {
                const apiUrl = (config.apiUrl.includes('localhost') || config.apiUrl.includes('127.0.0.1'))
                    ? 'http://evolution-api:8081'
                    : config.apiUrl;
                const headers = { 'apikey': config.globalApiKey, 'Content-Type': 'application/json' };
                const webhookUrl = 'http://nextwave-crm:3000/api/whatsapp/webhook';

                for (const ch of openChannels) {
                    fetch(`${apiUrl}/webhook/set/${ch.instanceName}`, {
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
                    }).catch(() => null);
                }
            }
        }

        return NextResponse.json(channels);
    } catch (error) {
        console.error("[WHATSAPP_CHANNELS_GET]", error);
        return NextResponse.json({ error: "Erro ao listar canais" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, instanceName } = body;

        if (!name || !instanceName) {
            return NextResponse.json({ error: "Nome e Instância são obrigatórios" }, { status: 400 });
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const waToken = crypto.randomUUID(); // Token da instancia gerado internamente

        // 1. Buscar configuracoes globais para conectar na Evolution API real
        const configs: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WhatsAppConfig" WHERE "id" = 'default' LIMIT 1`
        );
        const config = configs[0];

        if (config && config.apiUrl && config.globalApiKey) {
            // 2. Chamar a Evolution API para criar a instancia
            try {
                // Substitui localhost pelo hostname Docker para funcionar dentro do container
                const evoApiUrl = (config.apiUrl.includes('localhost') || config.apiUrl.includes('127.0.0.1'))
                    ? 'http://evolution-api:8081'
                    : config.apiUrl;
                const evoRes = await fetch(`${evoApiUrl}/instance/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': config.globalApiKey
                    },
                    body: JSON.stringify({
                        instanceName: instanceName,
                        token: waToken,
                        qrcode: true,
                        integration: "WHATSAPP-BAILEYS"
                    })
                });

                if (!evoRes.ok) {
                    const errorText = await evoRes.text();
                    console.error("[EVOLUTION_API] Falha ao criar instância:", errorText);
                }
            } catch (evoErr) {
                console.error("[EVOLUTION_API] Erro de rede ao conectar:", evoErr);
            }
        }

        // Usando Raw SQL para inserção direta
        await prisma.$executeRawUnsafe(
            `INSERT INTO "WhatsAppChannel" ("id", "name", "instanceName", "status", "isActive", "updatedAt") 
             VALUES (?, ?, ?, ?, ?, ?)`,
            id, name, instanceName, "disconnected", 1, now
        );

        return NextResponse.json({ id, name, instanceName, status: "disconnected", isActive: true });
    } catch (error) {
        console.error("[WHATSAPP_CHANNELS_POST]", error);
        return NextResponse.json({ error: "Erro ao criar canal" }, { status: 500 });
    }
}
