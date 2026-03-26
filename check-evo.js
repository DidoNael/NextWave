// Verifica estado da instância e webhook na Evolution API
async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();

    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    const config = configs[0];
    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': config.globalApiKey, 'Content-Type': 'application/json' };

    // Status da instância
    const statusRes = await fetch(`${apiUrl}/instance/connectionState/teste20`, { headers });
    const status = await statusRes.json();
    console.log('Status instância:', JSON.stringify(status));

    // Webhook atual
    const whRes = await fetch(`${apiUrl}/webhook/find/teste20`, { headers });
    const wh = await whRes.json();
    console.log('Webhook configurado:', JSON.stringify(wh));

    // Tenta buscar mensagens recentes
    const msgRes = await fetch(`${apiUrl}/chat/findMessages/teste20`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ where: {}, limit: 3 })
    });
    const msgs = await msgRes.json();
    console.log('Mensagens recentes na API:', JSON.stringify(msgs).substring(0, 500));

    await db.$disconnect();
}
main().catch(e => console.error(e));
