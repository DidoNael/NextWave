import { NextResponse } from 'next/server';
import { getActivePaymentGateway } from '@/lib/payments/factory';
import { prisma } from '@/lib/db';
import { emitirNfseAutomatico } from '@/lib/financeiro/nfse/auto-emit';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';

export async function POST(
    req: Request,
    { params }: { params: { provider: string } }
) {
    try {
        const body = await req.json();
        console.log(`[PAYMENT_WEBHOOK][${params.provider}] recebido:`, JSON.stringify(body).substring(0, 500));

        const gateway = await getActivePaymentGateway();

        if (!gateway || gateway.provider !== params.provider) {
            console.error(`[PAYMENT_WEBHOOK] Gateway ${params.provider} não está ativo.`);
            return NextResponse.json({ error: 'Gateway inativo' }, { status: 400 });
        }

        const result = await gateway.processWebhook(body);

        if (result.status === 'pago' && result.transactionId) {
            // 1. Marcar transação como paga
            const tx = await prisma.transaction.update({
                where: { id: result.transactionId },
                data: {
                    status: 'pago',
                    paidAt: new Date(),
                    paymentMethod: gateway.name,
                    notes: `Pago automaticamente via ${gateway.name}`,
                },
                include: { client: { select: { name: true, email: true, phone: true } } },
            });
            console.log(`[PAYMENT_WEBHOOK] TX ${result.transactionId} → PAGA via ${gateway.name}`);

            const valor = tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // 2. NFS-e automática (fire-and-forget)
            if (tx.serviceId) {
                emitirNfseAutomatico({
                    serviceId:      tx.serviceId,
                    clientId:       tx.clientId,
                    description:    tx.description,
                    amount:         tx.amount,
                    organizationId: tx.organizationId,
                }).catch(err => console.error('[WEBHOOK_NFSE_AUTO]', err?.message));
            }

            // 3. Confirmação por WhatsApp
            if (tx.client?.phone) {
                const msg =
                    `✅ *Pagamento Confirmado!*\n\n` +
                    `Olá, *${tx.client.name || 'Cliente'}*!\n` +
                    `Seu pagamento de *${valor}* referente a *${tx.description}* foi confirmado.\n\n` +
                    `Obrigado! 🙏`;
                sendWhatsAppMessage(tx.client.phone, msg)
                    .catch(err => console.error('[WEBHOOK_WPP_CONFIRM]', err?.message));
            }

            // 4. Confirmação por email
            if (tx.client?.email) {
                const smtp = await prisma.smtpConfig.findFirst({ where: { isDefault: true, isActive: true } });
                if (smtp) {
                    const html = `
                    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#334155;line-height:1.6">
                      <h2 style="color:#16a34a;margin-bottom:16px">✅ Pagamento Confirmado</h2>
                      <p>Olá, <strong>${tx.client.name || 'Cliente'}</strong>.</p>
                      <p>Seu pagamento foi recebido com sucesso!</p>
                      <div style="background:#f0fdf4;padding:16px;border-radius:8px;border:1px solid #bbf7d0;margin:20px 0">
                        <p style="margin:0 0 4px;font-size:14px"><strong>Descrição:</strong> ${tx.description}</p>
                        <p style="margin:0 0 4px;font-size:14px"><strong>Valor:</strong> ${valor}</p>
                        <p style="margin:0;font-size:14px"><strong>Forma:</strong> ${gateway.name}</p>
                      </div>
                      <p style="font-size:13px;color:#64748b">Em breve sua nota fiscal será emitida automaticamente.</p>
                      <hr style="border:0;border-top:1px solid #e2e8f0;margin:32px 0">
                      <p style="font-size:12px;color:#64748b;text-align:center">Este é um e-mail automático.</p>
                    </div>`;

                    nodemailer.createTransport({
                        host: smtp.host, port: smtp.port, secure: smtp.secure,
                        auth: { user: smtp.user, pass: decrypt(smtp.pass) },
                    }).sendMail({
                        from: `"${smtp.fromName || 'Pagamentos'}" <${smtp.fromEmail}>`,
                        to: tx.client.email,
                        subject: `✅ Pagamento confirmado — ${valor}`,
                        html,
                    }).catch(err => console.error('[WEBHOOK_EMAIL_CONFIRM]', err?.message));
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error(`[PAYMENT_WEBHOOK_ERROR][${params.provider}]`, error);
        return NextResponse.json({ error: 'Erro interno no webhook' }, { status: 500 });
    }
}
