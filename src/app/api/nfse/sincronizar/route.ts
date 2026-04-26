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
    const forceAll: boolean = body.forceAll === true;
    // de / ate filtram por createdAt (YYYY-MM-DD) — opcional
    const de: string | undefined  = body.de;
    const ate: string | undefined = body.ate;

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

    const hasPeriodo = !!(de || ate);

    // Filtro de data: quando há período usa createdAt (emitidaEm pode ser null em aguardando)
    const dateFilter = hasPeriodo ? {
        createdAt: {
            ...(de  ? { gte: new Date(`${de}T00:00:00`) }  : {}),
            ...(ate ? { lte: new Date(`${ate}T23:59:59`) } : {}),
        },
    } : {};

    // Inclui emitida + aguardando_processamento — protocolo GINFES expira,
    // mas consultarNfsePorRps funciona independente do protocolo
    const statusFiltro = { in: ['emitida', 'aguardando_processamento'] };

    const where: any = {
        status: statusFiltro,
        ...(!forceAll && !hasPeriodo ? { codigoVerificacao: null } : {}),
        ...dateFilter,
    };

    const records = await prisma.nfseRecord.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { id: true, rpsNumero: true, numeroNfse: true, codigoVerificacao: true, status: true },
    });

    if (records.length === 0) {
        const [totalEmitidas, totalAguardando] = await Promise.all([
            prisma.nfseRecord.count({ where: { status: 'emitida' } }),
            prisma.nfseRecord.count({ where: { status: 'aguardando_processamento' } }),
        ]);
        return NextResponse.json({
            sincronizadas: 0,
            erros: 0,
            message: hasPeriodo
                ? `Nenhum registro encontrado no período (createdAt). Sistema: ${totalEmitidas} emitidas + ${totalAguardando} aguardando.`
                : `Nenhum registro a sincronizar. Sistema: ${totalEmitidas} emitidas + ${totalAguardando} aguardando.`,
        });
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

            if (resultado.numeroNfse) {
                await prisma.nfseRecord.update({
                    where: { id: record.id },
                    data: {
                        status:            'emitida',
                        numeroNfse:        resultado.numeroNfse,
                        emitidaEm:         record.status !== 'emitida' ? new Date() : undefined,
                        ...(resultado.codigoVerificacao ? { codigoVerificacao: resultado.codigoVerificacao } : {}),
                        ...(resultado.xmlRetorno        ? { xmlRetorno:        resultado.xmlRetorno }        : {}),
                    },
                });
                sincronizadas++;
                detalhes.push({ id: record.id, rps: record.rpsNumero, resultado: `ok: NFS-e ${resultado.numeroNfse}` });
            } else {
                detalhes.push({ id: record.id, rps: record.rpsNumero, resultado: 'GINFES não retornou número de NFS-e' });
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
