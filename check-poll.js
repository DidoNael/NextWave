// Simula o que getWhatsAppMessages faz com a nova lógica
async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    await db.$disconnect();

    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': configs[0].globalApiKey, 'Content-Type': 'application/json' };
    const remoteJid = '5511948337416@s.whatsapp.net';

    const res = await fetch(`${apiUrl}/chat/findMessages/teste20`, {
        method: 'POST', headers,
        body: JSON.stringify({ where: {}, limit: 100 })
    });

    const data = await res.json();
    const records = data.messages?.records ?? (Array.isArray(data) ? data : []);

    const filtered = records.filter(m => m.key?.remoteJid === remoteJid);
    const mapped = filtered.map(msg => ({
        id: msg.key?.id,
        body: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[mídia]',
        fromMe: msg.key?.fromMe,
        timestamp: msg.messageTimestamp
    }));
    mapped.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`Total filtrado: ${mapped.length} mensagens`);
    mapped.forEach(m => console.log(`  [${m.fromMe ? 'EU' : 'DELE'}] "${m.body}" ts=${m.timestamp}`));
}
main().catch(e => console.error(e));
