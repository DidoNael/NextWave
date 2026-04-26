import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db';

interface NfseEmailPayload {
    clientId?: string | null;
    tomadorNome?: string | null;
    valorServicos: number;
    discriminacao: string;
    numeroNfse: string;
    codigoVerificacao?: string | null;
    provider: string;
}

function applyPlaceholders(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export async function sendNfseEmail(payload: NfseEmailPayload): Promise<void> {
    const { clientId, tomadorNome, valorServicos, discriminacao, numeroNfse, codigoVerificacao, provider } = payload;

    if (!clientId) return;

    const cliente = await prisma.client.findUnique({
        where: { id: clientId },
        select: { email: true, emailTemplateId: true, name: true },
    });
    if (!cliente?.email) return;

    const smtp = await prisma.smtpConfig.findFirst({ where: { isDefault: true, isActive: true } });
    if (!smtp) return;

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' }, select: { razaoSocial: true } });

    // Busca template do cliente ou o padrão
    const emailTemplate = cliente.emailTemplateId
        ? await prisma.emailTemplate.findUnique({ where: { id: cliente.emailTemplateId } })
        : await prisma.emailTemplate.findFirst({ where: { isDefault: true } });

    const valor = valorServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let linkNfseHtml = '';
    if (provider === 'ginfes' && codigoVerificacao) {
        const link = `https://guarulhos.ginfes.com.br/report/consultarNota?chave=${codigoVerificacao}`;
        linkNfseHtml = `<a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">Visualizar NFS-e</a>`;
    }

    const vars: Record<string, string> = {
        numero: numeroNfse,
        valor,
        discriminacao,
        nomeCliente: tomadorNome || cliente.name || 'Cliente',
        linkNfse: linkNfseHtml,
        codigoVerificacao: codigoVerificacao || '',
    };

    const subject = emailTemplate
        ? applyPlaceholders(emailTemplate.subject, vars)
        : `NFS-e nº ${numeroNfse} emitida — ${valor}`;

    const html = emailTemplate
        ? applyPlaceholders(emailTemplate.body, vars)
        : `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2>Nota Fiscal de Serviço Emitida</h2>
            <p>Olá, <strong>${vars.nomeCliente}</strong>.</p>
            <p>NFS-e nº <strong>${numeroNfse}</strong> — ${valor}</p>
            <p>${discriminacao}</p>
            ${linkNfseHtml}
           </div>`;

    const transporter = nodemailer.createTransport({
        host: smtp.host, port: smtp.port, secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.sendMail({
        from: `"${smtp.fromName || config?.razaoSocial || 'Empresa'}" <${smtp.fromEmail}>`,
        to: cliente.email,
        subject,
        html,
    }).catch((e: Error) => console.error('[NFSE_EMAIL_ERROR]', e.message));
}
