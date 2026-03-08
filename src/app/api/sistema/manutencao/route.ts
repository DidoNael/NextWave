import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

export async function GET() {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
    }

    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return NextResponse.json([]);
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup-'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    createdAt: stats.mtime
                };
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return NextResponse.json(files);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao listar backups" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        // Executa o script de backup via tsx
        execSync('npx tsx scripts/backup.ts', { stdio: 'inherit' });
        return NextResponse.json({ success: true, message: "Backup gerado com sucesso" });
    } catch (error) {
        console.error("[BACKUP_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao disparar backup" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { name } = await req.json();
        const filePath = path.join(BACKUP_DIR, name);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao excluir backup" }, { status: 500 });
    }
}
