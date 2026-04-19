import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { number, text } = await req.json();

        if (!number || !text) {
            return NextResponse.json({ error: "Número e texto são obrigatórios" }, { status: 400 });
        }

        const success = await sendWhatsAppMessage(number, text);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Falha ao enviar mensagem pela Evolution API" }, { status: 500 });
        }
    } catch (error) {
        console.error("[WHATSAPP_MESSAGES_SEND]", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
