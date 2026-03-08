import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const now = new Date().toISOString();

        const fields = Object.keys(body).filter(k => k !== 'id' && k !== 'createdAt');

        for (const field of fields) {
            await prisma.$executeRawUnsafe(
                `UPDATE "ScheduledTask" SET "${field}" = ?, "updatedAt" = ? WHERE "id" = ?`,
                body[field], now, params.id
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SCHEDULER_PATCH]", error);
        return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        await prisma.$executeRawUnsafe(
            `DELETE FROM "ScheduledTask" WHERE "id" = ?`,
            params.id
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SCHEDULER_DELETE]", error);
        return NextResponse.json({ error: "Erro ao excluir agendamento" }, { status: 500 });
    }
}
