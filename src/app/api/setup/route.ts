import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const userCount = await prisma.user.count();
        return NextResponse.json({
            isConfigured: userCount > 0
        });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao verificar status do sistema" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // 1. Verificar se já existe algum usuário
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return NextResponse.json(
                { error: "O sistema já está configurado." },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { name, email, password, allowedIps, workDayStart, workDayEnd, backupData, backupName, modules } = body;

        // Se houver backup, tentar restaurar primeiro
        if (backupData) {
            console.log(`[SETUP] Importação de backup detectada: ${backupName}`);
            const dbUrl = process.env.DATABASE_URL || '';

            if (dbUrl.startsWith('file:')) {
                const dbPath = path.join(process.cwd(), dbUrl.replace('file:', ''));
                const buffer = Buffer.from(backupData, 'base64');
                fs.writeFileSync(dbPath, buffer);
                console.log(`[SETUP] Banco SQLite restaurado via importação.`);
            }
            // Para SQL puro (via scripts .sql), poderíamos executar o dump aqui.
        }

        if (!backupData && (!name || !email || !password)) {
            return NextResponse.json(
                { error: "Todos os campos obrigatórios devem ser preenchidos." },
                { status: 400 }
            );
        }

        // 2. Criar o usuário administrador (Somente se não houver backup ou se quiser garantir um novo admin)
        let user;
        if (name && email && password) {
            const hashedPassword = await bcrypt.hash(password, 12);
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "admin",
                    allowedIps: allowedIps || "*",
                    workDayStart: workDayStart || null,
                    workDayEnd: workDayEnd || null,
                },
            });
        }

        // 3. Configurar Módulos
        if (modules && Array.isArray(modules)) {
            await (prisma as any).systemModule.updateMany({
                data: { enabled: false }
            });
            await (prisma as any).systemModule.updateMany({
                where: { key: { in: modules } },
                data: { enabled: true }
            });
        }

        return NextResponse.json({
            success: true,
            message: backupData ? "Sistema restaurado com sucesso!" : "Administrador criado com sucesso!",
            user: user ? {
                id: user.id,
                name: user.name,
                email: user.email,
            } : null
        });
    } catch (error) {
        console.error("[SETUP_API_ERROR]", error);
        return NextResponse.json(
            { error: "Erro ao realizar configuração inicial." },
            { status: 500 }
        );
    }
}
