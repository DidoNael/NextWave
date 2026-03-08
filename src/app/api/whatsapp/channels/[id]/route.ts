import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        await prisma.$executeRawUnsafe(
            `DELETE FROM "WhatsAppChannel" WHERE "id" = ?`,
            params.id
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WHATSAPP_CHANNEL_DELETE]", error);
        return NextResponse.json({ error: "Erro ao excluir canal" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { isActive, name } = body;
        const now = new Date().toISOString();

        if (isActive !== undefined) {
            await prisma.$executeRawUnsafe(
                `UPDATE "WhatsAppChannel" SET "isActive" = ?, "updatedAt" = ? WHERE "id" = ?`,
                isActive ? 1 : 0, now, params.id
            );
        }

        if (name !== undefined) {
            await prisma.$executeRawUnsafe(
                `UPDATE "WhatsAppChannel" SET "name" = ?, "updatedAt" = ? WHERE "id" = ?`,
                name, now, params.id
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WHATSAPP_CHANNEL_UPDATE]", error);
        return NextResponse.json({ error: "Erro ao atualizar canal" }, { status: 500 });
    }
}
