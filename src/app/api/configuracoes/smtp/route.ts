import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const configs = await prisma.smtpConfig.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        
        // NUNCA retorne a senha real ou criptografada para o frontend
        const sanitized = configs.map(c => ({
            ...c,
            pass: "********" 
        }));
        
        return NextResponse.json(sanitized);
    } catch (error) {
        console.error("[SMTP_CONFIG_GET]", error);
        return NextResponse.json({ error: "Erro ao listar configurações SMTP" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    const userRole = (session?.user as any)?.role?.toUpperCase();
    if (!session || (userRole !== "ADMIN" && userRole !== "MASTER")) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, host, port, user, pass, fromEmail, fromName, secure, isDefault } = body;

        if (!name || !host || !port || !user || !pass || !fromEmail) {
            return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
        }

        // Se for definir como padrão, remover o padrão dos outros
        if (isDefault) {
            await prisma.smtpConfig.updateMany({
                data: { isDefault: false }
            });
        }

        const config = await prisma.smtpConfig.create({
            data: {
                name,
                host,
                port: parseInt(port),
                user,
                pass: encrypt(pass), // CRIPTOGRAFAR ANTES DE SALVAR
                fromEmail,
                fromName: fromName || "",
                secure: !!secure,
                isActive: true,
                isDefault: !!isDefault,
            }
        });

        return NextResponse.json({ ...config, pass: "********" });
    } catch (error: any) {
        console.error("[SMTP_CONFIG_POST]", error);
        return NextResponse.json({ error: "Erro ao criar configuração SMTP: " + error.message }, { status: 500 });
    }
}
