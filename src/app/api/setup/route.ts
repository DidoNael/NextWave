import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

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
        const { name, email, password, allowedIps, workDayStart, workDayEnd } = body;

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Todos os campos obrigatórios devem ser preenchidos." },
                { status: 400 }
            );
        }

        // 2. Criar o usuário administrador
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
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

        return NextResponse.json({
            success: true,
            message: "Administrador criado com sucesso!",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            }
        });
    } catch (error) {
        console.error("[SETUP_API_ERROR]", error);
        return NextResponse.json(
            { error: "Erro ao realizar configuração inicial." },
            { status: 500 }
        );
    }
}
