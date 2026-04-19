import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const config = await prisma.whatsAppConfig.findUnique({
            where: { id: 'default' }
        });

        if (!config) {
            return NextResponse.json({
                apiUrl: "https://evolution.nextwave.com",
                waVersion: "2.3000.x"
            });
        }

        return NextResponse.json({
            ...config,
            apiKey: config.globalApiKey // Map globalApiKey to apiKey for frontend compatibility
        });
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
        await prisma.whatsAppConfig.upsert({
            where: { id: 'default' },
            create: {
                id: 'default',
                apiUrl: apiUrl || "",
                globalApiKey: apiKey || "",
                waVersion: waVersion || "2.3000.x",
                isActive: true
            },
            update: {
                apiUrl: apiUrl || "",
                globalApiKey: apiKey || "",
                waVersion: waVersion || "2.3000.x",
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WHATSAPP_CONFIG_POST]", error);
        return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
    }
}
