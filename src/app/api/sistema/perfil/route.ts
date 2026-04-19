import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { name, email } = await req.json();

        if (!name || !email) {
            return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
        }

        // Verificar se o e-mail já está em uso por outro usuário
        const existingUser = await prisma.user.findFirst({
            where: {
                email,
                NOT: { id: session.user.id }
            }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Este e-mail já está em uso" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { name, email }
        });

        return NextResponse.json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email
        });
    } catch (error) {
        console.error("[PROFILE_UPDATE_ERROR]", error);
        return NextResponse.json({ error: "Erro interno ao atualizar perfil" }, { status: 500 });
    }
}
