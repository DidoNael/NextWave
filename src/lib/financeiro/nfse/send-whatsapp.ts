import { prisma } from '@/lib/db';
import { sendWhatsAppMessage, sendWhatsAppMedia } from '@/lib/whatsapp';

interface NfseWhatsAppPayload {
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
}

export async function sendNfseWhatsApp(payload: NfseWhatsAppPayload): Promise<boolean> {
    const { 
        clientId, tomadorNome, valorServicos, discriminacao, 
        numeroNfse, codigoVerificacao, provider, xmlContent, pdfBuffer, nfseId 
    } = payload;

    if (!clientId) return false;

    const cliente = await prisma.client.findUnique({
        where: { id: clientId },
        select: { phone: true, name: true },
    });
    if (!cliente?.phone) return false;

    const valor = valorServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const config = await prisma.nfeConfig.findUnique({ 
        where: { id: 'default' }, 
        select: { razaoSocial: true, codigoMunicipio: true, cnpj: true, emailTemplateId: true } 
    });

    let linkNfse = '';
    if (provider === 'ginfes' && codigoVerificacao && config) {
        const sub = 'visualizar';
        const maskedCnpj = config.cnpj.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
        linkNfse = `\n📄 Link: https://${sub}.ginfes.com.br/report/consultarNota?__report=nfs_ver4RT&cnpjPrestador=${maskedCnpj}&numNota=${numeroNfse}&cdVerificacao=${codigoVerificacao}`;
    }

    const message = `*Nota Fiscal de Serviço Emitida* 📄\n\n` +
        `Olá, *${tomadorNome || cliente.name || 'Cliente'}*.\n` +
        `Estamos enviando os dados da sua NFS-e nº *${numeroNfse}*.\n\n` +
        `💰 *Valor:* ${valor}\n` +
        `📝 *Discriminação:* ${discriminacao}\n` +
        `${linkNfse}\n\n` +
        `_Enviado via ${config?.razaoSocial || 'Sistema'}_`;

    const textSent = await sendWhatsAppMessage(cliente.phone, message);
    const logStatus = textSent ? 'sucesso' : 'erro';
    const logMessage = textSent ? `Mensagem de WhatsApp enviada para ${cliente.phone}` : `Falha ao enviar WhatsApp para ${cliente.phone}`;

    if (nfseId) {
        await prisma.fiscalLog.create({
            data: {
                nfseId,
                type: 'whatsapp',
                status: logStatus,
                message: logMessage,
                details: `Vía Evolution API`
            }
        }).catch(() => null);
    }

    if (textSent) {
        // Envia XML como anexo
        if (xmlContent) {
            const xmlBase64 = Buffer.from(xmlContent).toString('base64');
            await sendWhatsAppMedia(
                cliente.phone, 
                `NFSe-${numeroNfse}.xml`, 
                xmlBase64, 
                'application/xml'
            );
        }

        // Envia PDF como anexo
        if (pdfBuffer) {
            const pdfBase64 = pdfBuffer.toString('base64');
            await sendWhatsAppMedia(
                cliente.phone, 
                `NFSe-${numeroNfse}.pdf`, 
                pdfBase64, 
                'application/pdf'
            );
        }
    }

    return textSent;
}
