import { PrismaClient } from "@prisma/client";
import speakeasy from "speakeasy";

const prisma = new PrismaClient();

async function enable2FA(email: string) {
    console.log(`Buscando usuário: ${email}...`);
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error("ERRO: Usuário não encontrado!");
        process.exit(1);
    }

    const secret = speakeasy.generateSecret({
        name: `NextWave CRM (${user.email})`,
    });

    console.log("-----------------------------------------");
    console.log("CONFIGURAÇÃO 2FA PARA ADMIN");
    console.log(`Email: ${user.email}`);
    console.log(`Segredo (Base32): ${secret.base32}`);
    console.log(`OTP Auth URL: ${secret.otpauth_url}`);
    console.log("-----------------------------------------");
    console.log("Instrução: Adicione a chave base32 no Google Authenticator.");

    await prisma.user.update({
        where: { id: user.id },
        data: {
            twoFactorSecret: secret.base32,
            twoFactorEnabled: true,
        },
    });

    console.log("✅ 2FA Habilitado com sucesso no banco de dados!");
}

const targetEmail = process.argv[2] || "nael@nextwave.com";
enable2FA(targetEmail)
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        prisma.$disconnect();
        process.exit(1);
    });
