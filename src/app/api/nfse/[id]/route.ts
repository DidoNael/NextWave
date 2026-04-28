import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { sendNfseEmail } from '@/lib/financeiro/nfse/send-email';
import { sendNfseWhatsApp } from '@/lib/financeiro/nfse/send-whatsapp';
import { fetchNfsePdf } from '@/lib/financeiro/nfse/fetch-pdf';

// GET /api/nfse/[id] — consultar NFS-e (atualiza status via protocolo)
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const record = await prisma.nfseRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    // Se já emitida ou cancelada, retorna direto
    if (['emitida', 'cancelada', 'erro'].includes(record.status)) {
        let nfseUrl = undefined;
        if (record.status === 'emitida' && record.numeroNfse && record.codigoVerificacao) {
            const nfseProvider = await getActiveNfseProvider();
            const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
            if (config && nfseProvider?.getNfseUrl) {
                nfseUrl = nfseProvider.getNfseUrl(record.numeroNfse, record.codigoVerificacao, config.cnpj, config.codigoMunicipio);
            }
        }
        return NextResponse.json({ ...record, nfseUrl });
    }

    // Se aguardando processamento e tem protocolo, consultar situação
    if (record.protocolo) {
        const nfseProvider = await getActiveNfseProvider();
        if (!nfseProvider) return NextResponse.json(record);

        console.log('[NFSE_CONSULTAR] Consultando protocolo:', record.protocolo, '| Record ID:', record.id);
        const resultado = await nfseProvider.consultarLote(record.protocolo);
        console.log('[NFSE_CONSULTAR] Situação:', resultado.situacao, '| Erro:', resultado.erro, '| XML:', resultado.xmlRetorno?.substring(0, 500));

        if (resultado.erro) {
            return NextResponse.json({ ...record, consultaErro: resultado.erro });
        }

        // situacao 4 = Processado sem erro (NFS-e emitida)
        if (resultado.situacao === 4 && resultado.nfseNumeros?.length) {
            const numeroNfse = resultado.nfseNumeros[0];

            // codigoVerificacao é GINFES-specific — extraído do xmlRetorno quando disponível
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
                where: { id: params.id },
                data: {
                    status: 'emitida',
                    numeroNfse,
                    codigoVerificacao,
                    emitidaEm: new Date(),
                    xmlRetorno: resultado.xmlRetorno,
                },
            });

            // Buscar PDF do GINFES para enviar como anexo (fire-and-forget com await)
            let pdfBufferAuto: Buffer | null = null;
            if (codigoVerificacao) {
                const cfgPdf = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
                if (cfgPdf) {
                    const cleanCnpj = cfgPdf.cnpj.replace(/\D/g, '');
                    const maskedCnpj = cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
                    const pdfUrl = `https://visualizar.ginfes.com.br/report/consultarNota?__report=nfs_ver4RT&cnpjPrestador=${maskedCnpj}&numNota=${numeroNfse}&cdVerificacao=${codigoVerificacao}&__format=pdf`;
                    pdfBufferAuto = await fetchNfsePdf(pdfUrl).catch(e => {
                        console.warn('[PDF_FETCH_AUTO_ERROR]', e.message);
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
                pdfBuffer: pdfBufferAuto,
                nfseId: updated.id,
                overrideEmail: updated.tomadorEmail
            });
            sendNfseWhatsApp({
                clientId: updated.clientId,
                tomadorNome: updated.tomadorNome,
                valorServicos: updated.valorServicos,
                discriminacao: updated.discriminacao,
                numeroNfse,
                codigoVerificacao,
                provider: nfseProvider.provider,
                pdfBuffer: pdfBufferAuto,
                nfseId: updated.id
            });

            await prisma.fiscalLog.create({
                data: {
                    nfseId: updated.id,
                    type: 'emissao',
                    status: 'sucesso',
                    message: `NFS-e emitida com sucesso: nº ${numeroNfse}`,
                    details: `Protocolo consultado: ${record.protocolo}`
                }
            }).catch(() => null);
            
            // Gerar URL para o retorno imediato
            const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
            const nfseUrl = (config && nfseProvider.getNfseUrl) 
                ? nfseProvider.getNfseUrl(numeroNfse, codigoVerificacao || '', config.cnpj, config.codigoMunicipio)
                : undefined;

            return NextResponse.json({ ...updated, nfseUrl });
        }

        // situacao 3 = Processado com erro
        if (resultado.situacao === 3) {
            const updated = await prisma.nfseRecord.update({
                where: { id: params.id },
                data: {
                    status: 'erro',
                    errorMessage: resultado.erro || 'Erro de processamento no GINFES',
                    xmlRetorno: resultado.xmlRetorno,
                },
            });
            await prisma.fiscalLog.create({
                data: {
                    nfseId: params.id,
                    type: 'emissao',
                    status: 'erro',
                    message: `Erro no processamento da NFS-e`,
                    details: resultado.erro || 'Erro de processamento no GINFES'
                }
            }).catch(() => null);
            return NextResponse.json(updated);
        }

        // Ainda processando
        return NextResponse.json({ ...record, situacaoLote: resultado.situacao });
    }

    return NextResponse.json(record);
}

// DELETE /api/nfse/[id] — cancelar NFS-e
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const record = await prisma.nfseRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    if (record.status !== 'emitida') {
        return NextResponse.json({ error: 'Somente NFS-e emitidas podem ser canceladas' }, { status: 400 });
    }

    if (!record.numeroNfse) {
        return NextResponse.json({ error: 'Número da NFS-e não encontrado' }, { status: 400 });
    }

    const nfseProvider = await getActiveNfseProvider();
    if (!nfseProvider) {
        return NextResponse.json({ error: 'Provedor NFS-e não configurado' }, { status: 400 });
    }

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' }, select: { codigoMunicipio: true } });
    const resultado = await nfseProvider.cancelar(
        record.numeroNfse,
        config?.codigoMunicipio || '3518800'
    );

    if (resultado.erro) {
        await prisma.fiscalLog.create({
            data: {
                nfseId: params.id,
                type: 'cancelamento',
                status: 'erro',
                message: `Falha ao cancelar NFS-e`,
                details: resultado.erro
            }
        }).catch(() => null);
        return NextResponse.json({ error: resultado.erro }, { status: 422 });
    }

    const updated = await prisma.nfseRecord.update({
        where: { id: params.id },
        data: {
            status: 'cancelada',
            canceladaEm: new Date(),
            xmlRetorno: resultado.xmlRetorno,
        },
    });

    await prisma.fiscalLog.create({
        data: {
            nfseId: params.id,
            type: 'cancelamento',
            status: 'sucesso',
            message: `NFS-e nº ${record.numeroNfse} cancelada com sucesso`,
        }
    }).catch(() => null);

    return NextResponse.json(updated);
}
