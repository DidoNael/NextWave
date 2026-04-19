import { PrismaClient } from "@prisma/client";

// Singleton do Prisma Client para o MCP Server
// Reutiliza o mesmo schema do NextWave CRM
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.MCP_LOG_LEVEL === "debug" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
