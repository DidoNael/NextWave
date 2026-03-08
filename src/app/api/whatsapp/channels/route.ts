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
        // Usando Raw SQL para contornar o Prisma Client desatualizado no Windows
        const channels = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WhatsAppChannel" ORDER BY "updatedAt" DESC`
        );
        return NextResponse.json(channels);
    } catch (error) {
        console.error("[WHATSAPP_CHANNELS_GET]", error);
        return NextResponse.json({ error: "Erro ao listar canais" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, instanceName } = body;

        if (!name || !instanceName) {
            return NextResponse.json({ error: "Nome e Instância são obrigatórios" }, { status: 400 });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // Usando Raw SQL para inserção direta
        await prisma.$executeRawUnsafe(
            `INSERT INTO "WhatsAppChannel" ("id", "name", "instanceName", "status", "isActive", "updatedAt") 
             VALUES (?, ?, ?, ?, ?, ?)`,
            id, name, instanceName, "disconnected", 1, now
        );

        return NextResponse.json({ id, name, instanceName, status: "disconnected", isActive: true });
    } catch (error) {
        console.error("[WHATSAPP_CHANNELS_POST]", error);
        return NextResponse.json({ error: "Erro ao criar canal" }, { status: 500 });
    }
}
