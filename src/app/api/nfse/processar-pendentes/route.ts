import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { sendNfseEmail } from '@/lib/financeiro/nfse/send-email';
import { fetchNfsePdf } from '@/lib/financeiro/nfse/fetch-pdf';

/**
 * POST /api/nfse/processar-pendentes
 *
 * Consulta o status de todos os registros em aguardando_processamento
 * e atualiza o banco conforme a resposta do provedor.
 *
 * Pode ser chamada por um cron job (ScheduledTask) para polling automático.
 * Limite de 50 por execução para evitar timeout.
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const nfseProvider = await getActiveNfseProvider();
    if (!nfseProvider) {
        return NextResponse.json({ error: 'Provedor NFS-e não configurado.' }, { status: 400 });
    }

    const pending = await prisma.nfseRecord.findMany({
        where: {
            status: 'aguardando_processamento',
            protocolo: { not: null },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
    });

    if (pending.length === 0) {
        return NextResponse.json({ processed: 0, emitidas: 0, erros: 0, message: 'Nenhum registro pendente.' });
    }

    let emitidas = 0;
    let erros = 0;

    for (const record of pending) {
        try {
            const resultado = await nfseProvider.consultarLote(record.protocolo!);

            // situacao 4 = processado sem erro
            if (resultado.situacao === 4 && resultado.nfseNumeros?.length) {
                const numeroNfse = resultado.nfseNumeros[0];

                let codigoVerificacao: string | null = null;
                if (nfseProvider.provider === 'ginfes' && resultado.xmlRetorno) {
                    let xml = resultado.xmlRetorno;
                    if (xml.includes('&lt;')) {
                        xml = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
                    }
                    const match = xml.match(/<(?:\w+:)?CodigoVerificacao>(.*?)<\/(?:\w+:)?CodigoVerificacao>/i);
                    codigoVerificacao = match?.[1] ?? null;
                }

                const updated = await prisma.nfseRecord.update({
                    where: { id: record.id },
                    data: {
                        status: 'emitida',
                        numeroNfse,
                        codigoVerificacao,
                        emitidaEm: new Date(),
                        xmlRetorno: resultado.xmlRetorno,
                    },
                });

                // Buscar PDF do GINFES para enviar como anexo no email
                let pdfBufferCron: Buffer | null = null;
                if (codigoVerificacao) {
                    const cfgPdf = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
                    if (cfgPdf) {
                        const cleanCnpj = cfgPdf.cnpj.replace(/\D/g, '');
                        const maskedCnpj = cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
                        const pdfUrl = `https://visualizar.ginfes.com.br/report/consultarNota?__report=nfs_ver4RT&cnpjPrestador=${maskedCnpj}&numNota=${numeroNfse}&cdVerificacao=${codigoVerificacao}&__format=pdf`;
                        pdfBufferCron = await fetchNfsePdf(pdfUrl).catch(e => {
                            console.warn('[PDF_FETCH_CRON_ERROR]', e.message);
                            return null;
                        });
                    }
                }

                sendNfseEmail({
                    clientId: updated.clientId,
                    tomadorNome: updated.tomadorNome,
                    valorServicos: updated.valorServicos,
                    discriminacao: updated.discriminacao,
                    numeroNfse,
                    codigoVerificacao,
                    provider: nfseProvider.provider,
                    xmlContent: resultado.xmlRetorno,
                    pdfBuffer: pdfBufferCron,
                    nfseId: updated.id,
                    overrideEmail: updated.tomadorEmail ?? null,
                });
                emitidas++;

            } else if (resultado.situacao === 3) {
                await prisma.nfseRecord.update({
                    where: { id: record.id },
                    data: { status: 'erro', xmlRetorno: resultado.xmlRetorno },
                });
                erros++;
            }
            // situacao 1 ou 2: ainda processando, não atualiza
        } catch (err: any) {
            console.error(`[NFSE_PROCESSAR] erro no record ${record.id}:`, err?.message);
        }
    }

    return NextResponse.json({
        processed: pending.length,
        emitidas,
        erros,
        summary: `${emitidas} emitidas, ${erros} com erro, ${pending.length - emitidas - erros} ainda processando.`,
    });
}

