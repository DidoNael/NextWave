import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateTwoFactorSecret, generateQRCodeDataURL } from "@/lib/auth/2fa";
import { prisma } from "@/lib/db";

export async function POST() {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const secret = generateTwoFactorSecret(session.user.email);
    const qrCode = await generateQRCodeDataURL(secret.otpauth_url!);

    return NextResponse.json({
        qrCode,
        secret: secret.base32
    });
}
