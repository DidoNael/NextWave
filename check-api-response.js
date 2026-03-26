// Simula exatamente o que getWhatsAppMessages retorna para o número do usuário
const { PrismaClient } = require('@prisma/client');

async function getWaMessages(db, instanceName, remoteJid, limit = 50) {
    const rows = await db.waMessage.findMany({
        where: { instanceName, remoteJid },
        orderBy: { timestamp: 'asc' },
        take: limit,
    });
    return rows.map(r => ({
        id: r.id, body: r.body, fromMe: r.fromMe,
        status: r.status, timestamp: r.timestamp,
        time: new Date(r.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }));
}

async function main() {
    const db = new PrismaClient();
    const configs = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppConfig" WHERE "id" = \'default\' LIMIT 1');
    const config = configs[0];

    // Canal ativo
    const channels = await db.$queryRawUnsafe('SELECT * FROM "WhatsAppChannel" WHERE "isActive" = 1 AND "status" = \'open\' ORDER BY "updatedAt" DESC LIMIT 1');
    const instance = channels[0]?.instanceName;
    console.log('Instância ativa:', instance);

    // Busca mensagens locais
    const remoteJid = '5511948337416@s.whatsapp.net';
    const localMessages = await getWaMessages(db, instance, remoteJid);
    console.log('\nMensagens locais (wa_messages):', localMessages.length);
    localMessages.forEach(m => console.log(`  [${m.fromMe ? 'EU' : 'DELE'}] "${m.body.substring(0, 40)}" ts=${m.timestamp}`));

    // Busca da Evolution API (nova lógica)
    const apiUrl = 'http://evolution-api:8081';
    const headers = { 'apikey': config.globalApiKey, 'Content-Type': 'application/json' };
    const res = await fetch(`${apiUrl}/chat/findMessages/${instance}`, {
        method: 'POST', headers,
        body: JSON.stringify({ where: {}, limit: 100 })
    });
    const data = await res.json();
    const records = data.messages?.records ?? [];
    const filtered = records.filter(m => m.key?.remoteJid === remoteJid);
    console.log('\nDa Evolution API (100 msgs, filtrado):', filtered.length);
    filtered.forEach(m => {
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '[mídia]';
        console.log(`  [${m.key?.fromMe ? 'EU' : 'DELE'}] "${body.substring(0, 40)}" ts=${m.messageTimestamp}`);
    });

    // Total que seria retornado pelo endpoint
    const apiIds = new Set(filtered.map(m => m.key?.id));
    const onlyLocal = localMessages.filter(m => !apiIds.has(m.id));
    const merged = [...filtered.map(m => ({ id: m.key?.id, body: m.message?.conversation || '[mídia]', fromMe: m.key?.fromMe, timestamp: m.messageTimestamp })), ...onlyLocal];
    merged.sort((a, b) => a.timestamp - b.timestamp);
    console.log('\nRESULTADO FINAL para a UI:', merged.length, 'mensagens');
    merged.forEach(m => console.log(`  [${m.fromMe ? 'EU' : 'DELE'}] "${String(m.body).substring(0, 40)}" ts=${m.timestamp}`));

    await db.$disconnect();
}
main().catch(e => console.error('Erro:', e));
