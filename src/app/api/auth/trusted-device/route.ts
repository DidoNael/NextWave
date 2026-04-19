import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateTrustedDeviceToken, trustedDeviceCookieName, TRUSTED_DEVICE_DAYS } from "@/lib/auth/trusted-device";

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const token = generateTrustedDeviceToken(userId);
    const cookieName = trustedDeviceCookieName(userId);
    const maxAge = TRUSTED_DEVICE_DAYS * 24 * 60 * 60;

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge,
        path: "/",
    });

    return response;
}

export async function DELETE() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const cookieName = trustedDeviceCookieName(session.user.id);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(cookieName);
    return response;
}
