import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';

/**
 * POST /api/nfse/sincronizar
 *
 * Re-consulta o provedor para cada NFS-e emitida (por RPS) e atualiza
 * numeroNfse e codigoVerificacao caso estejam divergentes ou ausentes.
 *
 * Útil para corrigir registros cujo xmlRetorno não foi salvo, ou cujo
 * codigoVerificacao ficou null após emissão.
 *
 * Limite de 50 registros por execução.
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // forceAll=true sincroniza todas as emitidas; padrão: apenas as sem codigoVerificacao
    const forceAll: boolean = body.forceAll === true;

    const nfseProvider = await getActiveNfseProvider();
    if (!nfseProvider) {
        return NextResponse.json({ error: 'Provedor NFS-e não configurado.' }, { status: 400 });
    }

    const config = await prisma.nfeConfig.findUnique({
        where: { id: 'default' },
        select: { serieRps: true, tipoRps: true },
    });

    const rpsSerie = config?.serieRps || '1';
    const rpsTipo  = config?.tipoRps  || '1';

    const where = forceAll
        ? { status: 'emitida' }
        : { status: 'emitida', codigoVerificacao: null };

    const records = await prisma.nfseRecord.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { id: true, rpsNumero: true, numeroNfse: true, codigoVerificacao: true },
    });

    if (records.length === 0) {
        return NextResponse.json({ sincronizadas: 0, erros: 0, message: 'Nenhum registro a sincronizar.' });
    }

    let sincronizadas = 0;
    let erros = 0;
    const detalhes: { id: string; rps: string; resultado: string }[] = [];

    for (const record of records) {
        try {
            const resultado = await nfseProvider.sincronizarPorRps(record.rpsNumero, rpsSerie, rpsTipo);

            if (resultado.erro) {
                erros++;
                detalhes.push({ id: record.id, rps: record.rpsNumero, resultado: `erro: ${resultado.erro}` });
                continue;
            }

            const mudou = resultado.numeroNfse && (
                resultado.numeroNfse !== record.numeroNfse ||
                (resultado.codigoVerificacao && resultado.codigoVerificacao !== record.codigoVerificacao)
            );

            if (mudou || forceAll) {
                await prisma.nfseRecord.update({
                    where: { id: record.id },
                    data: {
                        ...(resultado.numeroNfse       ? { numeroNfse:        resultado.numeroNfse }       : {}),
                        ...(resultado.codigoVerificacao ? { codigoVerificacao: resultado.codigoVerificacao } : {}),
                        ...(resultado.xmlRetorno        ? { xmlRetorno:        resultado.xmlRetorno }        : {}),
                    },
                });
                sincronizadas++;
                detalhes.push({ id: record.id, rps: record.rpsNumero, resultado: `ok: NFS-e ${resultado.numeroNfse}` });
            } else {
                detalhes.push({ id: record.id, rps: record.rpsNumero, resultado: 'sem alteração' });
            }
        } catch (err: any) {
            erros++;
            detalhes.push({ id: record.id, rps: record.rpsNumero, resultado: `exceção: ${err?.message}` });
            console.error(`[NFSE_SINCRONIZAR] record ${record.id}:`, err?.message);
        }
    }

    return NextResponse.json({
        total: records.length,
        sincronizadas,
        erros,
        summary: `${sincronizadas} atualizadas, ${erros} com erro, ${records.length - sincronizadas - erros} sem alteração.`,
        detalhes,
    });
}
