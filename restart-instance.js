// Reinicia a instância WhatsApp para aplicar configuração de webhook
async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    await db.$disconnect();

    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': configs[0].globalApiKey, 'Content-Type': 'application/json' };

    // Verifica webhook antes
    const wh = await (await fetch(`${apiUrl}/webhook/find/teste20`, { headers })).json();
    console.log('Webhook antes:', JSON.stringify({ enabled: wh.enabled, url: wh.url, events: wh.events }));

    // Reinicia instância (mantém a conexão WhatsApp)
    const restartRes = await fetch(`${apiUrl}/instance/restart/teste20`, {
        method: 'PUT', headers
    });
    console.log('Restart status:', restartRes.status, await restartRes.text());

    // Aguarda 3s e verifica estado
    await new Promise(r => setTimeout(r, 3000));
    const stateRes = await fetch(`${apiUrl}/instance/connectionState/teste20`, { headers });
    const state = await stateRes.json();
    console.log('Estado após restart:', JSON.stringify(state));
}
main().catch(e => console.error(e));
