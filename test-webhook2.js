// Testa se o webhook loga corretamente
async function main() {
    const payload = {
        event: "messages.upsert",
        instance: "teste20",
        data: { key: { remoteJid: "5511948337416@s.whatsapp.net", fromMe: false, id: "LOG_TEST_" + Date.now() },
            message: { conversation: "Teste de log" }, messageTimestamp: Math.floor(Date.now()/1000) }
    };
    const res = await fetch('http://localhost:3000/api/whatsapp/webhook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    console.log('Webhook response:', res.status, await res.json());
}
main();
