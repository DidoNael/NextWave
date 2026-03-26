async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    await db.$disconnect();

    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': configs[0].globalApiKey, 'Content-Type': 'application/json' };
    const remoteJid = '5511948337416@s.whatsapp.net';

    // Paginando e filtrando no lado do cliente
    const r = await fetch(`${apiUrl}/chat/findMessages/teste20`, {
        method: 'POST', headers,
        body: JSON.stringify({ where: {}, limit: 50, page: 1 })
    });
    const data = await r.json();
    const all = data.messages?.records || [];

    // Filtra por remoteJid no cliente
    const filtered = all.filter(m => m.key?.remoteJid === remoteJid);
    console.log(`De ${all.length} mensagens, ${filtered.length} são do número ${remoteJid}`);
    filtered.forEach(m => {
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '[mídia]';
        console.log(`  [${m.key?.fromMe ? 'EU' : 'DELE'}] "${body}"`);
    });

    // Testa endpoint alternativo
    console.log('\nTestando /message/findMessages:');
    const r2 = await fetch(`${apiUrl}/message/findMessages/teste20`, {
        method: 'GET', headers
    });
    console.log('GET /message/findMessages:', r2.status, (await r2.text()).substring(0, 200));
}
main().catch(e => console.error(e));
