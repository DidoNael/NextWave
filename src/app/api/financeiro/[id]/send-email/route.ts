import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generatePaymentLink } from '@/lib/infinitepay';
import { decrypt } from '@/lib/crypto';
import nodemailer from 'nodemailer';

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
        include: { client: { select: { name: true, email: true } } },
    });

    if (!tx) return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    if (tx.type !== 'receita') return NextResponse.json({ error: 'Apenas receitas podem gerar cobrança' }, { status: 400 });

    const recipientEmail = tx.client?.email;
    if (!recipientEmail) return NextResponse.json({ error: 'Cliente sem e-mail cadastrado' }, { status: 422 });

    // Garante que o link de pagamento existe (gera se necessário)
    let paymentUrl = tx.paymentUrl;
    if (!paymentUrl) {
        paymentUrl = await generatePaymentLink(params.id);
    }

    // Busca SMTP ativo
    const smtp = await prisma.smtpConfig.findFirst({ where: { isDefault: true, isActive: true } });
    if (!smtp) return NextResponse.json({ error: 'Nenhum SMTP configurado. Acesse Configurações → SMTP.' }, { status: 400 });

    const valor = tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const vencimento = tx.dueDate
        ? new Date(tx.dueDate).toLocaleDateString('pt-BR')
        : null;

    const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#334155;line-height:1.6">
      <h2 style="color:#0f172a;margin-bottom:16px">Cobrança — ${valor}</h2>
      <p>Olá, <strong>${tx.client?.name || 'Cliente'}</strong>.</p>
      <p>Segue o link para pagamento da cobrança:</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:20px 0">
        <p style="margin:0 0 4px;font-size:14px"><strong>Descrição:</strong> ${tx.description}</p>
        <p style="margin:0 0 4px;font-size:14px"><strong>Valor:</strong> ${valor}</p>
        ${vencimento ? `<p style="margin:0;font-size:14px"><strong>Vencimento:</strong> ${vencimento}</p>` : ''}
      </div>
      <a href="${paymentUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin-top:8px">
        Pagar Agora
      </a>
      <p style="margin-top:16px;font-size:13px;color:#64748b">Ou acesse o link: <a href="${paymentUrl}" style="color:#7c3aed">${paymentUrl}</a></p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:32px 0">
      <p style="font-size:12px;color:#64748b;text-align:center">Este é um e-mail automático. Por favor, não responda.</p>
    </div>`;

    const transporter = nodemailer.createTransport({
        host: smtp.host, port: smtp.port, secure: smtp.secure,
        auth: { user: smtp.user, pass: decrypt(smtp.pass) },
    });

    await transporter.sendMail({
        from: `"${smtp.fromName || 'Cobrança'}" <${smtp.fromEmail}>`,
        to: recipientEmail,
        subject: `Cobrança: ${tx.description} — ${valor}`,
        html,
    });

    console.log(`[COBRANCA_EMAIL] Enviado para ${recipientEmail} | TX: ${params.id}`);
    return NextResponse.json({ success: true, sentTo: recipientEmail });
}
