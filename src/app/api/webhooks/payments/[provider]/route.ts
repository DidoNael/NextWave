import { NextResponse } from "next/server";
import { getActivePaymentGateway } from "@/lib/payments/factory";
import { prisma } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: { provider: string } }
) {
    try {
        const body = await req.json();
        console.log(`[PAYMENT_WEBHOOK][${params.provider}] recebido:`, body);

        const gateway = await getActivePaymentGateway();

        if (!gateway || gateway.provider !== params.provider) {
            console.error(`[PAYMENT_WEBHOOK] Gateway ${params.provider} não está ativo ou não existe.`);
            return NextResponse.json({ error: "Gateway inativo" }, { status: 400 });
        }

        const result = await gateway.processWebhook(body);

        if (result.status === "pago" && result.transactionId) {
            await prisma.transaction.update({
                where: { id: result.transactionId },
                data: {
                    status: "pago",
                    paidAt: new Date(),
                    paymentMethod: gateway.name,
                    notes: `Pago via ${gateway.name}`
                }
            });
            console.log(`[PAYMENT_WEBHOOK] Transação ${result.transactionId} marcada como PAGA via ${gateway.name}.`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error(`[PAYMENT_WEBHOOK_ERROR][${params.provider}]`, error);
        return NextResponse.json({ error: "Erro interno no webhook" }, { status: 500 });
    }
}
