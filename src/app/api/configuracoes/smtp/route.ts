import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const configs = await prisma.$queryRawUnsafe(
            `SELECT * FROM "SmtpConfig" ORDER BY "updatedAt" DESC`
        );
        return NextResponse.json(configs);
    } catch (error) {
        console.error("[SMTP_CONFIG_GET]", error);
        return NextResponse.json({ error: "Erro ao listar configurações SMTP" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, host, port, user, pass, fromEmail, fromName, secure, isDefault } = body;

        if (!name || !host || !port || !user || !pass || !fromEmail) {
            return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // Se for definir como padrão, remover o padrão dos outros
        if (isDefault) {
            await prisma.$executeRawUnsafe(`UPDATE "SmtpConfig" SET "isDefault" = 0`);
        }

        await prisma.$executeRawUnsafe(
            `INSERT INTO "SmtpConfig" ("id", "name", "host", "port", "user", "pass", "fromEmail", "fromName", "secure", "isActive", "isDefault", "updatedAt") 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id, name, host, parseInt(port), user, pass, fromEmail, fromName || "", secure ? 1 : 0, 1, isDefault ? 1 : 0, now
        );

        return NextResponse.json({ id, name, success: true });
    } catch (error) {
        console.error("[SMTP_CONFIG_POST]", error);
        return NextResponse.json({ error: "Erro ao criar configuração SMTP" }, { status: 500 });
    }
}
