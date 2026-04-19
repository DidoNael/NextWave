const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    const config = configs[0];
    if (!config || !config.apiUrl || !config.globalApiKey) {
        console.log('Config não encontrada');
        return;
    }

    const apiUrl = (config.apiUrl.includes('localhost') || config.apiUrl.includes('127.0.0.1'))
        ? 'http://evolution-api:8081'
        : config.apiUrl;

    const channels = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppChannel" WHERE "isActive" = 1 AND "status" = \'open\'');
    console.log('Canais conectados:', channels.length);

    for (const ch of channels) {
        console.log('Configurando webhook para:', ch.instanceName);
        const res = await fetch(`${apiUrl}/webhook/set/${ch.instanceName}`, {
            method: 'POST',
            headers: { 'apikey': config.globalApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                webhook: {
                    enabled: true,
                    url: 'http://nextwave-crm:3000/api/whatsapp/webhook',
                    webhookByEvents: false,
                    webhookBase64: false,
                    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
                }
            })
        });
        const data = await res.json().catch(() => ({}));
        console.log('Resultado:', res.status, JSON.stringify(data));
    }
}

main().finally(() => db.$disconnect());
