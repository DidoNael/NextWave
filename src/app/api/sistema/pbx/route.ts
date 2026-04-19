import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const config = await prisma.pbxConfig.findFirst({
            where: { id: "default" }
        });
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const body = await req.json();

        // Remove ID e createdAt/updatedAt do body para não dar conflito no upsert
        const { id, updatedAt, ...configData } = body;

        const config = await prisma.pbxConfig.upsert({
            where: { id: "default" },
            update: configData,
            create: { ...configData, id: "default" }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error("[PBX_CONFIG_ERROR]", error);
        return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
    }
}
