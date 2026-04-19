import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getTokensFromCode } from "@/lib/google-calendar";

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "Código não fornecido" }, { status: 400 });
    }

    try {
        const tokens = await getTokensFromCode(code);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
                googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
            },
        });

        // Redireciona de volta para a agenda ou configurações
        return NextResponse.redirect(new URL("/agenda", request.url));
    } catch (error) {
        console.error("[GOOGLE_CALLBACK]", error);
        return NextResponse.json({ error: "Erro ao autenticar com Google" }, { status: 500 });
    }
}
