import { PaymentGateway, CheckoutOptions, CheckoutResponse } from "../gateway";

export class InfinitePayAdapter extends PaymentGateway {
    name = "InfinitePay";
    provider = "infinitepay";

    async createCheckout(options: CheckoutOptions): Promise<CheckoutResponse> {
        const payload = {
            handle: this.config.infiniteTag,
            order_nsu: options.transactionId,
            amount: Math.round(options.amount * 100),
            items: options.items?.map(i => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price
            })) || [
                    {
                        name: options.description,
                        quantity: 1,
                        price: Math.round(options.amount * 100)
                    }
                ],
            redirect_url: options.redirectUrl,
            webhook_url: options.webhookUrl
        };

        const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Erro na InfinitePay");
        }

        const data = await response.json();
        return {
            url: data.url,
            externalId: data.slug,
            provider: this.provider
        };
    }

    async processWebhook(body: any) {
        const { order_nsu, state } = body;
        let status = "pendente";

        if (state === "paid" || state === "approved" || state === "captured") {
            status = "pago";
        }

        return {
            transactionId: order_nsu,
            status
        };
    }
}
