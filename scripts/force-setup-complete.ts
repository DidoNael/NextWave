import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("======================================================");
    console.log("    NextWave CRM -- Verificador de Integridade");
    console.log("======================================================");

    try {
        console.log("[1/3] Verificando conexão com o Banco de Dados...");
        await prisma.$connect();
        console.log("      OK: Conectado com sucesso.");

        console.log("[2/3] Contando usuários no banco...");
        const userCount = await prisma.user.count();
        console.log(`      Resultado: ${userCount} usuário(s) encontrado(s).`);

        if (userCount === 0) {
            console.log("\n[!] AVISO: Nenhum usuário encontrado. Forçando criação de Admin...");
            const hashedPassword = await bcrypt.hash("admin123", 12);
            const user = await prisma.user.create({
                data: {
                    name: "Administrador",
                    email: "admin@admin.com",
                    password: hashedPassword,
                    role: "master",
                    allowedIps: "*",
                },
            });
            console.log(`      SUCESSO: Usuário '${user.email}' criado com senha 'admin123'`);
            console.log("      O Wizard não deve mais aparecer.");
        } else {
            console.log("\n[!] O banco já possui dados. O Wizard deveria estar desativado.");
            console.log("    Se você continua vendo o Wizard, limpe o cache do seu navegador.");
        }

    } catch (error: any) {
        console.error("\n[ERRO] Falha crítica:");
        console.error(error.message);
        if (error.message.includes("does not exist")) {
            console.error("\n[!] DICA: Parece que as tabelas não foram criadas no schema público.");
            console.error("    Tente rodar: npx prisma db push");
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
