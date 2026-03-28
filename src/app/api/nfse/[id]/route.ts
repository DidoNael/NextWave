import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesClient } from '@/lib/financeiro/ginfes/client';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';

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
        return NextResponse.json(record);
    }

    // Se aguardando processamento e tem protocolo, consultar situação
    if (record.protocolo) {
        const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
        if (!config?.certificadoBase64) return NextResponse.json(record);

        const client = new GinfesClient({
            cnpj: config.cnpj.replace(/\D/g, ''),
            inscricaoMunicipal: config.inscricaoMunicipal,
            certificadoBase64: decryptCert(config.certificadoBase64),
            senhaCertificado: config.senhaCertificado ? decryptCert(config.senhaCertificado) : '',
            ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
        });

        const resultado = await client.consultarSituacaoLote(record.protocolo);

        if (resultado.erro) {
            return NextResponse.json({ ...record, consultaErro: resultado.erro });
        }

        // Situacao 4 = Processado sem erro
        if (resultado.situacao === '4' && resultado.nfseList?.length) {
            const nfse = resultado.nfseList[0];
            const updated = await prisma.nfseRecord.update({
                where: { id: params.id },
                data: {
                    status: 'emitida',
                    numeroNfse: nfse.numero,
                    codigoVerificacao: nfse.codigoVerificacao,
                    emitidaEm: new Date(),
                    xmlRetorno: resultado.xmlRetorno,
                },
            });
            return NextResponse.json(updated);
        }

        // Situacao 3 = Processado com erro
        if (resultado.situacao === '3') {
            const updated = await prisma.nfseRecord.update({
                where: { id: params.id },
                data: {
                    status: 'erro',
                    xmlRetorno: resultado.xmlRetorno,
                },
            });
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

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config?.certificadoBase64) {
        return NextResponse.json({ error: 'Certificado não configurado' }, { status: 400 });
    }

    const client = new GinfesClient({
        cnpj: config.cnpj.replace(/\D/g, ''),
        inscricaoMunicipal: config.inscricaoMunicipal,
        certificadoBase64: config.certificadoBase64,
        senhaCertificado: config.senhaCertificado || '',
        ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
    });

    const resultado = await client.cancelarNfse(record.numeroNfse, config.codigoMunicipio || '3514700');

    if (!resultado.sucesso) {
        return NextResponse.json({ error: resultado.erro || 'Erro ao cancelar' }, { status: 422 });
    }

    const updated = await prisma.nfseRecord.update({
        where: { id: params.id },
        data: {
            status: 'cancelada',
            canceladaEm: new Date(),
            xmlRetorno: resultado.xmlRetorno,
        },
    });

    return NextResponse.json(updated);
}
