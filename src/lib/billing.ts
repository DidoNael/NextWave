import { prisma } from "@/lib/db";
import { generatePaymentLink } from "@/lib/infinitepay";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function processRecurringBilling() {
    console.log("[BILLING_SERVICE] Iniciando processamento de recorrência...");
    const today = new Date();

    try {
        // Buscar todas as assinaturas ativas cujo faturamento é hoje ou antes
        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: "active",
                nextBillingDate: { lte: today }
            },
            include: { client: true }
        });

        console.log(`[BILLING_SERVICE] Encontradas ${subscriptions.length} assinaturas para processar.`);

        for (const sub of subscriptions) {
            try {
                // 1. Criar a Transação (Fatura)
                const transaction = await prisma.transaction.create({
                    data: {
                        description: `Fatura: ${sub.description}`,
                        amount: sub.amount,
                        type: "receita",
                        category: "Manutenção",
                        status: "pendente",
                        dueDate: today,
                        client: sub.clientId ? { connect: { id: sub.clientId } } : undefined,
                        user: { connect: { id: sub.userId } }
                    }
                });

                // 2. Gerar Link de Pagamento (Genérico)
                let paymentLink = "";
                try {
                    paymentLink = await generatePaymentLink(transaction.id);
                } catch (err) {
                    console.error(`[BILLING_SERVICE] Erro ao gerar link de pagamento p/ Sub ${sub.id}:`, err);
                }

                // 3. Enviar via WhatsApp (se cliente tiver telefone)
                if (sub.client?.phone && paymentLink) {
                    const message = `Olá ${sub.client.name}! Sua fatura de ${transaction.description} no valor de R$ ${sub.amount.toFixed(2)} já está disponível para pagamento.\n\nPague com Pix ou Cartão aqui: ${paymentLink}\n\nObrigado!`;
                    await sendWhatsAppMessage(sub.client.phone, message);
                }

                // 4. Atualizar a data do próximo faturamento da Assinatura
                const nextDate = new Date(sub.nextBillingDate);
                const interval = sub.interval.toLowerCase();

                if (interval === "weekly") {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (interval === "biweekly") {
                    nextDate.setDate(nextDate.getDate() + 14);
                } else if (interval === "monthly") {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                } else if (interval === "quarterly") {
                    nextDate.setMonth(nextDate.getMonth() + 3);
                } else if (interval === "semiannual") {
                    nextDate.setMonth(nextDate.getMonth() + 6);
                } else if (interval === "yearly") {
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                } else {
                    // Default para mensal se o intervalo for desconhecido
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: { nextBillingDate: nextDate }
                });

                console.log(`[BILLING_SERVICE] Assinatura ${sub.id} processada com sucesso.`);
            } catch (err) {
                console.error(`[BILLING_SERVICE] Erro ao processar assinatura ${sub.id}:`, err);
            }
        }

        return subscriptions.length;
    } catch (error) {
        console.error("[BILLING_SERVICE_FATAL_ERROR]", error);
        throw error;
    }
}
