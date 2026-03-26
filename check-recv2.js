async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    await db.$disconnect();

    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': configs[0].globalApiKey, 'Content-Type': 'application/json' };

    // Teste 1: sem where
    const r1 = await fetch(`${apiUrl}/chat/findMessages/teste20`, {
        method: 'POST', headers, body: JSON.stringify({ limit: 5 })
    });
    console.log('Sem where:', r1.status, (await r1.text()).substring(0, 300));

    // Teste 2: com where vazio
    const r2 = await fetch(`${apiUrl}/chat/findMessages/teste20`, {
        method: 'POST', headers, body: JSON.stringify({ where: {}, limit: 5 })
    });
    console.log('Where vazio:', r2.status, (await r2.text()).substring(0, 300));

    // Teste 3: apenas remoteJid no where (formato diferente)
    const r3 = await fetch(`${apiUrl}/chat/findMessages/teste20`, {
        method: 'POST', headers,
        body: JSON.stringify({ where: { remoteJid: '5511948337416@s.whatsapp.net' }, limit: 5 })
    });
    console.log('remoteJid direto:', r3.status, (await r3.text()).substring(0, 300));
}
main().catch(e => console.error(e));
