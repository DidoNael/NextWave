const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.whatsAppChannel.findMany()
  .then(channels => {
    console.log("CANAIS_FOUND:");
    console.log(JSON.stringify(channels, null, 2));
  })
  .catch(err => console.error("ERRO_PRISMA:", err.message))
  .finally(() => prisma.$disconnect());
