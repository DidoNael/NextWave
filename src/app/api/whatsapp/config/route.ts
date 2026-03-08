import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const configs: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WhatsAppConfig" WHERE "id" = 'default' LIMIT 1`
        );

        const config = configs[0];

        if (!config) {
            return NextResponse.json({
                apiUrl: "https://evolution.nextwave.com",
                waVersion: "2.3000.x"
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error("[WHATSAPP_CONFIG_GET]", error);
        return NextResponse.json({ error: "Erro ao obter configuração" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { apiUrl, apiKey, waVersion } = body;
        const now = new Date().toISOString();

        // Tentar atualizar
        const updated = await prisma.$executeRawUnsafe(
            `UPDATE "WhatsAppConfig" SET "apiUrl" = ?, "apiKey" = ?, "waVersion" = ?, "updatedAt" = ? WHERE "id" = 'default'`,
            apiUrl, apiKey, waVersion, now
        );

        // Se não existir, inserir
        if (updated === 0) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "WhatsAppConfig" ("id", "apiUrl", "apiKey", "waVersion", "updatedAt") VALUES ('default', ?, ?, ?, ?)`,
                apiUrl, apiKey, waVersion, now
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WHATSAPP_CONFIG_POST]", error);
        return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
    }
}
