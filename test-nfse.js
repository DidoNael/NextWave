const { PrismaClient } = require('@prisma/client');
const { GinfesClient } = require('./.next/server/chunks/4296.js'); // Caminho compilado do GinfesClient

async function run() {
    const prisma = new PrismaClient();
    try {
        const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
        const client = await prisma.client.findUnique({ where: { id: 'cmofxb8le00023ratj83p1va6' } });
        
        console.log('Testando emissao para:', client.name);
        // ... (resto da logica de teste)
    } catch (e) { console.error(e); }
    finally { await prisma.$disconnect(); }
}
run();
