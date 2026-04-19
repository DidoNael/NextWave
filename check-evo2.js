// Verificar versão e testar endpoint correto do webhook
async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    await db.$disconnect();

    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': configs[0].globalApiKey, 'Content-Type': 'application/json' };

    // Versão da API
    const verRes = await fetch(`${apiUrl}/`, { headers }).catch(() => null);
    if (verRes?.ok) {
        const ver = await verRes.json().catch(() => null);
        console.log('Versão API:', JSON.stringify(ver));
    }

    // Busca webhook atual
    const whGet = await fetch(`${apiUrl}/webhook/find/teste20`, { headers });
    console.log('GET webhook status:', whGet.status);
    const wh = await whGet.json();
    console.log('Webhook atual:', JSON.stringify(wh, null, 2));

    // Tenta endpoint alternativo (v1 format)
    const whSet2 = await fetch(`${apiUrl}/webhook/set/teste20`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            url: 'http://nextwave-crm:3000/api/whatsapp/webhook',
            enabled: true,
            webhookByEvents: false,
            webhookBase64: false,
            events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'SEND_MESSAGE']
        })
    });
    console.log('Webhook set v2 (flat):', whSet2.status, await whSet2.text());
}
main().catch(e => console.error('Erro:', e.message));
