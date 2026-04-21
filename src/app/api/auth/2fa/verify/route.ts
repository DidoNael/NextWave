import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyTwoFactorToken } from "@/lib/auth/2fa";
import { prisma } from "@/lib/db";
import { consumePending2FA } from "@/lib/server-cache";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { token } = await req.json();

    // Usa o secret armazenado server-side — ignora qualquer secret enviado no body
    const secret = consumePending2FA(session.user.id);
    if (!secret) {
        return NextResponse.json({ error: "Sessão de configuração expirada. Reinicie o processo de ativação do 2FA." }, { status: 400 });
    }

    const isValid = verifyTwoFactorToken(secret, token);

    if (isValid) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorSecret: secret,
                twoFactorEnabled: true,
            },
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
}
