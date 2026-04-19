import { prisma } from "../src/lib/db";

async function elevateToMaster() {
    const email = process.argv[2];
    if (!email) {
        console.error("Uso: npx tsx scripts/set-master.ts <email>");
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: "master" }
        });
        console.log(`✅ Usuário ${user.name} (${user.email}) elevado a MASTER com sucesso!`);
    } catch (error) {
        console.error("❌ Erro ao elevar usuário:", error);
    } finally {
        await prisma.$disconnect();
    }
}

elevateToMaster();
