import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyTwoFactorToken } from "@/lib/auth/2fa";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { token, secret } = await req.json();

    const isValid = verifyTwoFactorToken(secret, token);

    if (isValid) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorSecret: secret,
                twoFactorEnabled: true
            }
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
}
