import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { sendNfseEmail } from '@/lib/financeiro/nfse/send-email';

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
        const nfseProvider = await getActiveNfseProvider();
        if (!nfseProvider) return NextResponse.json(record);

        const resultado = await nfseProvider.consultarLote(record.protocolo);

        if (resultado.erro) {
            return NextResponse.json({ ...record, consultaErro: resultado.erro });
        }

        // situacao 4 = Processado sem erro (NFS-e emitida)
        if (resultado.situacao === 4 && resultado.nfseNumeros?.length) {
            const numeroNfse = resultado.nfseNumeros[0];

            // codigoVerificacao é GINFES-specific — extraído do xmlRetorno quando disponível
            let codigoVerificacao: string | null = null;
            if (nfseProvider.provider === 'ginfes' && resultado.xmlRetorno) {
                const match = resultado.xmlRetorno.match(/<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/);
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

            sendNfseEmail({ clientId: updated.clientId, tomadorNome: updated.tomadorNome, valorServicos: updated.valorServicos, discriminacao: updated.discriminacao, numeroNfse, codigoVerificacao, provider: nfseProvider.provider });
            return NextResponse.json(updated);
        }

        // situacao 3 = Processado com erro
        if (resultado.situacao === 3) {
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

    return NextResponse.json(updated);
}
