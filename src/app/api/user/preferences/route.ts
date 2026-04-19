import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { accentColor: true, layoutTheme: true }
        });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar preferências" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { accentColor, layoutTheme } = await req.json();

        // Validação básica
        const VALID_COLORS = ["blue", "orange", "green", "purple", "rose", "pink"];
        const VALID_LAYOUTS = ["default", "professional"];

        if (accentColor && !VALID_COLORS.includes(accentColor)) {
            return NextResponse.json({ error: "Cor inválida" }, { status: 400 });
        }
        if (layoutTheme && !VALID_LAYOUTS.includes(layoutTheme)) {
            return NextResponse.json({ error: "Layout inválido" }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(accentColor && { accentColor }),
                ...(layoutTheme && { layoutTheme }),
            }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PREFERENCES_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao atualizar preferências" }, { status: 500 });
    }
}
