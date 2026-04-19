export interface PaymentItem {
    name: string;
    quantity: number;
    price: number; // Em centavos
}

export interface CheckoutOptions {
    transactionId: string;
    description: string;
    amount: number; // Em reais
    items?: PaymentItem[];
    redirectUrl?: string;
    webhookUrl?: string;
    client?: {
        name?: string;
        email?: string;
        phone?: string;
    };
}

export interface CheckoutResponse {
    url: string;
    externalId: string;
    provider: string;
}

export abstract class PaymentGateway {
    abstract name: string;
    abstract provider: string;

    constructor(protected config: any) { }

    abstract createCheckout(options: CheckoutOptions): Promise<CheckoutResponse>;
    abstract processWebhook(body: any): Promise<{ transactionId: string; status: string }>;
}
