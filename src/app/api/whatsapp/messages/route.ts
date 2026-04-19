import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWhatsAppMessages } from "@/lib/whatsapp";

export async function GET(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
        return NextResponse.json({ error: "Parâmetro 'phone' obrigatório" }, { status: 400 });
    }

    try {
        const messages = await getWhatsAppMessages(phone);
        return NextResponse.json({ messages });
    } catch (error) {
        console.error("[WHATSAPP_MESSAGES_GET]", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
