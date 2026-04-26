import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { sendNfseEmail } from '@/lib/financeiro/nfse/send-email';

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
                    const match = resultado.xmlRetorno.match(/<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/);
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

                sendNfseEmail({ clientId: updated.clientId, tomadorNome: updated.tomadorNome, valorServicos: updated.valorServicos, discriminacao: updated.discriminacao, numeroNfse, codigoVerificacao, provider: nfseProvider.provider });
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

