import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

interface NfseEmailPayload {
    clientId?: string | null;
    tomadorNome?: string | null;
    valorServicos: number;
    discriminacao: string;
    numeroNfse: string;
    codigoVerificacao?: string | null;
    provider: string;
    xmlContent?: string | null;
    pdfBuffer?: Buffer | null;
    nfseId?: string;
    overrideEmail?: string | null;
}

function applyPlaceholders(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export async function sendNfseEmail(payload: NfseEmailPayload): Promise<void> {
    const { 
        clientId, tomadorNome, valorServicos, discriminacao, 
        numeroNfse, codigoVerificacao, provider, xmlContent, pdfBuffer, nfseId, overrideEmail
    } = payload;

    if (!clientId) return;

    const cliente = await prisma.client.findUnique({
        where: { id: clientId },
        select: { email: true, emailTemplateId: true, name: true },
    });
    const recipientEmail = overrideEmail || cliente?.email;
    if (!recipientEmail) return;

    const config = await prisma.nfeConfig.findUnique({
        where: { id: 'default' },
        select: { razaoSocial: true, smtpId: true, emailTemplateId: true, codigoMunicipio: true, cnpj: true }
    });

    // 1. Prioridade do SMTP: Config NFS-e -> SMTP Padrão
    const smtp = config?.smtpId
        ? await prisma.smtpConfig.findUnique({ where: { id: config.smtpId, isActive: true } })
        : await prisma.smtpConfig.findFirst({ where: { isDefault: true, isActive: true } });

    if (!smtp) return;

    // 2. Prioridade do Template: Cliente -> Config NFS-e -> Template Padrão
    let emailTemplateId = cliente?.emailTemplateId;
    if (!emailTemplateId && config?.emailTemplateId) {
        emailTemplateId = config.emailTemplateId;
    }

    const emailTemplate = emailTemplateId
        ? await prisma.emailTemplate.findUnique({ where: { id: emailTemplateId } })
        : await prisma.emailTemplate.findFirst({ where: { isDefault: true } });

    const valor = valorServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let linkNfseHtml = '';
    if (provider === 'ginfes' && codigoVerificacao && config) {
        const sub = 'visualizar';
        const maskedCnpj = config.cnpj.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
        const link = `https://${sub}.ginfes.com.br/report/consultarNota?__report=nfs_ver4RT&cnpjPrestador=${maskedCnpj}&numNota=${numeroNfse}&cdVerificacao=${codigoVerificacao}`;
        linkNfseHtml = `<a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">Visualizar NFS-e Online</a>`;
    }

    const vars: Record<string, string> = {
        numero: numeroNfse,
        valor,
        discriminacao,
        nomeCliente: tomadorNome || cliente?.name || 'Cliente',
        linkNfse: linkNfseHtml,
        codigoVerificacao: codigoVerificacao || '',
    };

    const subject = emailTemplate
        ? applyPlaceholders(emailTemplate.subject, vars)
        : `NFS-e nº ${numeroNfse} emitida — ${valor}`;

    const html = emailTemplate
        ? applyPlaceholders(emailTemplate.body, vars)
        : `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#334155;line-height:1.6">
            <h2 style="color:#0f172a;margin-bottom:16px">Sua nota fiscal está disponível</h2>
            <p>Olá, <strong>${vars.nomeCliente}</strong>.</p>
            <p>Informamos que a nota fiscal de serviços eletrônica nº <strong>${numeroNfse}</strong> no valor de <strong>${valor}</strong> foi emitida com sucesso em nosso sistema.</p>
            <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:20px 0">
                <p style="margin:0;font-size:14px"><strong>Serviço:</strong> ${discriminacao}</p>
            </div>
            <p>Seguem em anexo a este e-mail o arquivo <strong>XML</strong> e a guia da nota fiscal (quando disponível).</p>
            ${linkNfseHtml}
            <hr style="border:0;border-top:1px solid #e2e8f0;margin:32px 0">
            <p style="font-size:12px;color:#64748b;text-align:center">Este é um e-mail automático. Por favor, não responda.</p>
           </div>`;

    const transporter = nodemailer.createTransport({
        host: smtp.host, port: smtp.port, secure: smtp.secure,
        auth: { user: smtp.user, pass: decrypt(smtp.pass) },
    });

    const attachments: any[] = [];
    
    // Anexa XML se disponível
    if (xmlContent) {
        attachments.push({
            filename: `NFSe-${numeroNfse}.xml`,
            content: xmlContent,
            contentType: 'application/xml'
        });
    }

    // Anexa PDF se disponível
    if (pdfBuffer) {
        attachments.push({
            filename: `NFSe-${numeroNfse}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        });
    }

    await transporter.sendMail({
        from: `"${smtp.fromName || config?.razaoSocial || 'Empresa'}" <${smtp.fromEmail}>`,
        to: recipientEmail,
        subject,
        html,
        attachments
    }).then(async () => {
        console.log(`[NFSE_EMAIL_SUCCESS] Email enviado para ${recipientEmail}`);
        if (nfseId) {
            await prisma.fiscalLog.create({
                data: {
                    nfseId,
                    type: 'email',
                    status: 'sucesso',
                    message: `E-mail enviado com sucesso para ${recipientEmail}`,
                    details: `Assunto: ${subject}`
                }
            }).catch(() => null);
        }
    })
    .catch(async (e: Error) => {
        console.error('[NFSE_EMAIL_ERROR]', e.message);
        if (nfseId) {
            await prisma.fiscalLog.create({
                data: {
                    nfseId,
                    type: 'email',
                    status: 'erro',
                    message: `Erro ao enviar e-mail: ${e.message}`,
                    details: `Destinatário: ${recipientEmail}`
                }
            }).catch(() => null);
        }
    });
}
