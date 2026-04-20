import { PrismaClient } from "@prisma/client";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lógica de Conexão Soberana (v3.0.6-GOLD)
function getSovereignPrisma() {
  const sharedPath = "/var/shared/db_init_password.txt";
  let dbUrl = process.env.DATABASE_URL;

  // Se o gatilho soberano existir, ele manda no sistema
  if (fs.existsSync(sharedPath)) {
    try {
      const password = fs.readFileSync(sharedPath, "utf-8").trim();
      if (password) {
        // Reconstrói a URL mantendo os outros parâmetros (Assumimos root por padrão no Docker)
        dbUrl = `postgresql://root:${password}@nextwave-db:5432/nextwave_crm?schema=public`;
        console.log("[PRISMA] Soberania Ativada: Usando senha do gatilho dinâmico.");
      }
    } catch (e) {
      console.warn("[PRISMA] Falha ao ler gatilho soberano, usando env padrão.");
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  });
}

export const prisma = globalForPrisma.prisma ?? getSovereignPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
