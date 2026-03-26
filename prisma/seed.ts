import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@nextwave.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@nextwave.com",
      password: hashedPassword,
      role: "master",
    },
  });
  console.log("Usuário criado:", user.email);

  console.log("\nSeed concluido com sucesso!");
  console.log("Login: admin@nextwave.com");
  console.log("Senha: admin123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
