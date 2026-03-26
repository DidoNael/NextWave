import { prisma } from "@/lib/db";
import { getActivePaymentGateway } from "./payments/factory";

export async function generatePaymentLink(transactionId: string) {
    const gateway = await getActivePaymentGateway();

    if (!gateway) {
        throw new Error("Nenhum gateway de pagamento configurado ou ativo.");
    }

    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { client: true }
    });

    if (!transaction) throw new Error("Transação não encontrada.");
    if (transaction.type !== "receita") throw new Error("Apenas receitas podem gerar cobrança.");

    try {
        const response = await gateway.createCheckout({
            transactionId: transaction.id,
            description: transaction.description,
            amount: Number(transaction.amount),
            redirectUrl: `${process.env.NEXTAUTH_URL}/financeiro?status=success&id=${transaction.id}`,
            webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/payments/${gateway.provider}`,
            client: {
                name: transaction.client?.name || undefined,
                email: transaction.client?.email || undefined,
                phone: transaction.client?.phone || undefined
            }
        });

        // Atualiza a transação com os campos genéricos
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                gatewayProvider: response.provider,
                gatewayId: response.externalId,
                paymentUrl: response.url
            }
        });

        return response.url;
    } catch (error) {
        console.error(`[PAYMENT_ERROR][${gateway.provider}]`, error);
        throw error;
    }
}
