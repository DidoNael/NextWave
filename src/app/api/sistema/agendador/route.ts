import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const tasks = await prisma.$queryRawUnsafe(
            `SELECT * FROM "ScheduledTask" ORDER BY "createdAt" DESC`
        );
        return NextResponse.json(tasks);
    } catch (error) {
        console.error("[SCHEDULER_GET]", error);
        return NextResponse.json({ error: "Erro ao listar agendamentos" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, type, cron, config } = body;

        const id = uuidv4();
        const now = new Date().toISOString();

        await prisma.$executeRawUnsafe(
            `INSERT INTO "ScheduledTask" ("id", "name", "type", "cron", "status", "config", "createdAt", "updatedAt") 
             VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
            id, name, type, cron, config || "{}", now, now
        );

        return NextResponse.json({ id, name, success: true });
    } catch (error) {
        console.error("[SCHEDULER_POST]", error);
        return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
    }
}
