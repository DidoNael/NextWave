import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateTwoFactorSecret, generateQRCodeDataURL } from "@/lib/auth/2fa";
import { prisma } from "@/lib/db";
import { storePending2FA } from "@/lib/server-cache";

export async function POST() {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const secret = generateTwoFactorSecret(session.user.email);
    const qrCode = await generateQRCodeDataURL(secret.otpauth_url!);

    // Armazena server-side por 10 min — verify vai consumir daqui, não do body
    storePending2FA(session.user.id, secret.base32);

    return NextResponse.json({
        qrCode,
        secret: secret.base32, // retornado apenas para exibir "chave manual" na UI
    });
}
