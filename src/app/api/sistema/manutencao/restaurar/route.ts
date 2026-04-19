import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL; // Usar URL do PostgreSQL do ambiente

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { name } = await req.json();
        const backupPath = path.join(BACKUP_DIR, name);

        if (!fs.existsSync(backupPath)) {
            return NextResponse.json({ error: "Arquivo de backup não encontrado" }, { status: 404 });
        }

        const dbUrl = process.env.DATABASE_URL || '';

        if (dbUrl.startsWith('file:')) {
            let dbRelativePath = dbUrl.replace('file:', '');
            let dbPath = path.join(process.cwd(), dbRelativePath);

            // Tentar resolver relativo ao diretório prisma se não existir na raiz
            if (!fs.existsSync(dbPath)) {
                const prismaDbPath = path.join(process.cwd(), 'prisma', dbRelativePath.replace('./', ''));
                if (fs.existsSync(prismaDbPath)) {
                    dbPath = prismaDbPath;
                }
            }

            // 1. Desconectar o Prisma para liberar o bloqueio de arquivo no Windows
            const { prisma } = await import("@/lib/db");
            await prisma.$disconnect();

            // 2. Criar um backup temporário do banco atual por segurança
            const safetyBackup = `${dbPath}.safety`;
            fs.copyFileSync(dbPath, safetyBackup);

            try {
                // 2. Substituir o banco pelo backup (Pode requerer fechar conexões do Prisma)
                // No Next.js dev server, o Prisma costuma lidar com isso, mas em prod pode ser necessário parar o container
                fs.copyFileSync(backupPath, dbPath);

                // 3. Remover safety backup
                fs.unlinkSync(safetyBackup);

                return NextResponse.json({ success: true, message: "Banco restaurado com sucesso. O sistema pode precisar ser reiniciado." });
            } catch (err) {
                // Rollback se falhar
                fs.copyFileSync(safetyBackup, dbPath);
                throw err;
            }
        } else {
            // Restore para Postgres/MySQL via shell command
            // execSync(`psql "${dbUrl}" < "${backupPath}"`) or similar
            return NextResponse.json({ error: "Restauração automática para bancos externos ainda não implementada via API. Faça via CLI." }, { status: 501 });
        }

    } catch (error) {
        console.error("[RESTORE_ERROR]", error);
        return NextResponse.json({ error: "Erro ao restaurar banco" }, { status: 500 });
    }
}
