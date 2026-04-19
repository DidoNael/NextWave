import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("[INFINITEPAY_WEBHOOK_RECEIVED]", body);

        // A estrutura típica da InfinitePay no webhook inclui o order_nsu (que enviamos como ID da transação)
        const { order_nsu, state, slug, amount_captured, capture_method } = body;

        if (!order_nsu) {
            return NextResponse.json({ error: "order_nsu não encontrado" }, { status: 400 });
        }

        // Se o estado for 'paid' ou 'approved'
        if (state === "paid" || state === "approved" || state === "captured") {
            await prisma.transaction.update({
                where: { id: order_nsu },
                data: {
                    status: "pago",
                    paidAt: new Date(),
                    paymentMethod: capture_method || "InfinitePay",
                    notes: `Pago via InfinitePay (Slug: ${slug})`
                }
            });
            console.log(`[INFINITEPAY_WEBHOOK] Transação ${order_nsu} marcada como PAGA.`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[INFINITEPAY_WEBHOOK_ERROR]", error);
        return NextResponse.json({ error: "Erro interno no webhook" }, { status: 500 });
    }
}
