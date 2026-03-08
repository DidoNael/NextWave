import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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
            `DELETE FROM "SmtpConfig" WHERE "id" = ?`,
            params.id
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SMTP_CONFIG_DELETE]", error);
        return NextResponse.json({ error: "Erro ao excluir configuração" }, { status: 500 });
    }
}

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

        // Se estiver definindo como padrão, resetar os outros
        if (body.isDefault) {
            await prisma.$executeRawUnsafe(`UPDATE "SmtpConfig" SET "isDefault" = 0`);
        }

        // Construir query dinâmica simples (evitar complexidade excessiva no raw SQL)
        const fields = Object.keys(body).filter(k => k !== 'id' && k !== 'updatedAt');
        if (fields.length === 0) return NextResponse.json({ success: true });

        for (const field of fields) {
            let val = body[field];
            if (field === 'secure' || field === 'isActive' || field === 'isDefault') {
                val = val ? 1 : 0;
            } else if (field === 'port') {
                val = parseInt(val);
            }

            await prisma.$executeRawUnsafe(
                `UPDATE "SmtpConfig" SET "${field}" = ?, "updatedAt" = ? WHERE "id" = ?`,
                val, now, params.id
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SMTP_CONFIG_PATCH]", error);
        return NextResponse.json({ error: "Erro ao atualizar configuração" }, { status: 500 });
    }
}
