import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWhatsAppChats } from "@/lib/whatsapp";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const chats = await getWhatsAppChats();
        return NextResponse.json({ chats });
    } catch (error) {
        console.error("[WHATSAPP_CHATS_GET]", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
