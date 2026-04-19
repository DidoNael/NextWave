import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const url = await getGoogleAuthUrl();
    return NextResponse.redirect(url);
}
