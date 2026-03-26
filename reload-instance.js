// Tenta recarregar/reconectar instância via outros endpoints
async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    await db.$disconnect();

    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': configs[0].globalApiKey, 'Content-Type': 'application/json' };

    // Lista endpoints disponíveis via OPTIONS ou testando variações
    const endpoints = [
        ['POST', '/instance/restart/teste20'],
        ['POST', '/instance/reloadInstance/teste20'],
        ['GET', '/instance/restart/teste20'],
        ['DELETE', '/instance/logout/teste20'],
    ];

    for (const [method, path] of endpoints) {
        const r = await fetch(`${apiUrl}${path}`, { method, headers }).catch(e => ({ status: 'ERR', text: async () => e.message }));
        const t = await r.text().catch(() => '');
        if (!t.includes('Cannot') && !t.includes('404')) {
            console.log(`${method} ${path}: ${r.status} ${t.substring(0, 100)}`);
        }
    }

    // Tenta via /instance/set (atualizar instância)
    const setRes = await fetch(`${apiUrl}/webhook/set/teste20`, {
        method: 'POST', headers,
        body: JSON.stringify({
            webhook: {
                enabled: true,
                url: 'http://nextwave-crm:3000/api/whatsapp/webhook',
                webhookByEvents: false,
                webhookBase64: false,
                events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET', 'SEND_MESSAGE', 'CONNECTION_UPDATE'],
            }
        })
    });
    console.log('Webhook set com SEND_MESSAGE:', setRes.status, (await setRes.text()).substring(0, 200));
}
main().catch(e => console.error(e));
