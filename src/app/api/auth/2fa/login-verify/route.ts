import { NextResponse } from "next/server";
import { verifyTwoFactorToken } from "@/lib/auth/2fa";
import { prisma } from "@/lib/db";

// API que roda em Node.js runtime para validar 2FA
export async function POST(req: Request) {
    try {
        const { email, token } = await req.json();

        const user = await prisma.user.findUnique({
            where: { email: email as string },
        });

        if (!user || !user.twoFactorSecret) {
            return NextResponse.json({ error: "Configuração de 2FA não encontrada" }, { status: 400 });
        }

        const isValid = verifyTwoFactorToken(user.twoFactorSecret, token);

        if (isValid) {
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    } catch (error) {
        console.error("2FA verify error:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
