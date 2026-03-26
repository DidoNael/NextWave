// Verifica mensagens recebidas via findMessages
async function main() {
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    await db.$disconnect();

    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': configs[0].globalApiKey, 'Content-Type': 'application/json' };

    const remoteJid = '5511948337416@s.whatsapp.net';

    const res = await fetch(`${apiUrl}/chat/findMessages/teste20`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            where: { key: { remoteJid } },
            limit: 10
        })
    });
    console.log('Status:', res.status);
    const data = await res.json();

    const msgs = data.messages?.records || (Array.isArray(data) ? data : []);
    console.log('Total encontrado:', data.messages?.total || msgs.length);
    console.log('Últimas msgs:');
    msgs.slice(0, 5).forEach(m => {
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '[mídia]';
        console.log(`  [${m.key?.fromMe ? 'ENVIADO' : 'RECEBIDO'}] id=${m.key?.id?.substring(0,12)}... body="${body}" ts=${m.messageTimestamp}`);
    });
}
main().catch(e => console.error('Erro:', e.message));
