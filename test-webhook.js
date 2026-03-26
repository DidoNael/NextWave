// Simula uma mensagem recebida da Evolution API
async function main() {
    const payload = {
        event: "messages.upsert",
        instance: "teste20",
        data: {
            key: {
                remoteJid: "5511948337416@s.whatsapp.net",
                fromMe: false,
                id: "TEST_RECV_" + Date.now()
            },
            message: {
                conversation: "Oi, recebi sua mensagem!"
            },
            messageTimestamp: Math.floor(Date.now() / 1000),
            pushName: "Contato Teste"
        }
    };

    const res = await fetch('http://localhost:3000/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    console.log('Status:', res.status);
    const body = await res.json();
    console.log('Resposta:', JSON.stringify(body));

    // Verifica se foi salvo no banco
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    await new Promise(r => setTimeout(r, 500));
    const msgs = await db.waMessage.findMany({ orderBy: { timestamp: 'desc' }, take: 3 });
    console.log('Últimas mensagens no banco:', JSON.stringify(msgs.map(m => ({ body: m.body, fromMe: m.fromMe }))));
    await db.$disconnect();
}

main();
