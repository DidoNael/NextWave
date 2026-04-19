const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
    const msgs = await db.$queryRawUnsafe('SELECT id, instance_name, remote_jid, body, from_me FROM wa_messages');
    console.log('wa_messages:', JSON.stringify(msgs));
    const channels = await db.$queryRawUnsafe('SELECT instanceName, status, isActive FROM WhatsAppChannel');
    console.log('channels:', JSON.stringify(channels));
}
main().finally(() => db.$disconnect());
