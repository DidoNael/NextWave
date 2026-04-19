import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetFull() {
    console.log("Iniciando limpeza profunda do banco de dados NextWave...");

    try {
        // Tabelas confirmadas no schema.prisma
        const tables = [
            'task',
            'taskColumn',
            'event',
            'project',
            'service',
            'transaction',
            'subscription',
            'client',
            'user'
        ];

        for (const table of tables) {
            console.log(`- Limpando ${table}...`);
            try {
                if ((prisma as any)[table]) {
                    await (prisma as any)[table].deleteMany({});
                }
            } catch (e) {
                console.log(`  (Ignorado: ${table} pode não existir ou estar vazia)`);
            }
        }

        console.log("\n✅ SUCESSO! O sistema foi resetado.");
        console.log("Acesse http://localhost:3000/login para iniciar o Setup.");

    } catch (error) {
        console.error("\n❌ ERRO durante o reset:", error);
    } finally {
        await prisma.$disconnect();
    }
}

resetFull().catch(console.error);
