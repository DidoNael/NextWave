import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();

    if (!session || session.user?.role !== "admin") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { id } = params;
        const body = await req.json();
        const { name, email, password, role, allowedIps, workDayStart, workDayEnd } = body;

        const data: any = {
            name,
            email,
            role,
            allowedIps,
            workDayStart,
            workDayEnd,
        };

        if (password) {
            data.password = await bcrypt.hash(password, 12);
        }

        const user = await prisma.user.update({
            where: { id },
            data,
        });

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
        });
    } catch (error) {
        console.error("[USER_PATCH_ERROR]", error);
        return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();

    if (!session || session.user?.role !== "admin") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { id } = params;

        // Não permitir que o usuário delete a si mesmo
        if (id === session.user?.id) {
            return NextResponse.json({ error: "Você não pode excluir sua própria conta" }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[USER_DELETE_ERROR]", error);
        return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 });
    }
}
