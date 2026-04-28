import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generatePaymentLink } from '@/lib/infinitepay';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tx = await prisma.transaction.findUnique({
        where: { id: params.id },
        include: { client: { select: { name: true, phone: true } } },
    });

    if (!tx) return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    if (tx.type !== 'receita') return NextResponse.json({ error: 'Apenas receitas podem gerar cobrança' }, { status: 400 });

    const phone = tx.client?.phone;
    if (!phone) return NextResponse.json({ error: 'Cliente sem telefone cadastrado' }, { status: 422 });

    // Garante que o link de pagamento existe (gera se necessário)
    let paymentUrl = tx.paymentUrl;
    if (!paymentUrl) {
        paymentUrl = await generatePaymentLink(params.id);
    }

    const valor = tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const vencimento = tx.dueDate
        ? new Date(tx.dueDate).toLocaleDateString('pt-BR')
        : null;

    const message =
        `💰 *Cobrança — ${valor}*\n\n` +
        `Olá, *${tx.client?.name || 'Cliente'}*!\n\n` +
        `Segue o link para pagamento:\n` +
        `📝 *Descrição:* ${tx.description}\n` +
        `💵 *Valor:* ${valor}\n` +
        (vencimento ? `📅 *Vencimento:* ${vencimento}\n` : '') +
        `\n🔗 *Link de Pagamento:*\n${paymentUrl}\n\n` +
        `_Pague com Pix ou Cartão de forma rápida e segura._`;

    const sent = await sendWhatsAppMessage(phone, message);

    if (!sent) {
        return NextResponse.json({ error: 'Falha ao enviar WhatsApp. Verifique se o canal está conectado.' }, { status: 422 });
    }

    console.log(`[COBRANCA_WHATSAPP] Enviado para ${phone} | TX: ${params.id}`);
    return NextResponse.json({ success: true, sentTo: phone });
}
