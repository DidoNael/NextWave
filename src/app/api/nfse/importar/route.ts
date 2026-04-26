import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';

/**
 * POST /api/nfse/importar
 *
 * Consulta o GINFES via ConsultarNfse por período e importa as notas
 * que ainda não existem no banco (identifica pelo numeroNfse).
 *
 * Body: { dataInicial: "YYYY-MM-DD", dataFinal: "YYYY-MM-DD" }
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { dataInicial, dataFinal } = body as { dataInicial?: string; dataFinal?: string };

    if (!dataInicial || !dataFinal) {
        return NextResponse.json({ error: 'Informe dataInicial e dataFinal (YYYY-MM-DD).' }, { status: 400 });
    }

    const nfseProvider = await getActiveNfseProvider();
    if (!nfseProvider) {
        return NextResponse.json({ error: 'Provedor NFS-e não configurado.' }, { status: 400 });
    }

    const config = await prisma.nfeConfig.findUnique({
        where: { id: 'default' },
        select: { serieRps: true, tipoRps: true },
    });
    const rpsSerie = config?.serieRps || '1';

    // Busca do provedor
    const resultado = await nfseProvider.importarPorPeriodo(dataInicial, dataFinal);

    if (resultado.erro) {
        return NextResponse.json({ error: resultado.erro }, { status: 422 });
    }

    if (resultado.notas.length === 0) {
        return NextResponse.json({ importadas: 0, atualizadas: 0, ignoradas: 0, message: 'Nenhuma NFS-e encontrada no período informado.' });
    }

    // Verifica quais já existem pelo numeroNfse
    const numerosEncontrados = resultado.notas.map(n => n.numeroNfse);
    const existentes = await prisma.nfseRecord.findMany({
        where: { numeroNfse: { in: numerosEncontrados } },
        select: { id: true, numeroNfse: true },
    });
    const existentesSet = new Set(existentes.map(e => e.numeroNfse));

    let importadas  = 0;
    let atualizadas = 0;
    let ignoradas   = 0;
    const detalhes: { numeroNfse: string; rps: string; resultado: string }[] = [];

    for (const nota of resultado.notas) {
        try {
            if (existentesSet.has(nota.numeroNfse)) {
                // Já existe — atualiza codigoVerificacao se estava vazio
                const reg = existentes.find(e => e.numeroNfse === nota.numeroNfse);
                if (reg && nota.codigoVerificacao) {
                    await prisma.nfseRecord.update({
                        where: { id: reg.id },
                        data: {
                            codigoVerificacao: nota.codigoVerificacao,
                            status: 'emitida',
                        },
                    });
                    atualizadas++;
                    detalhes.push({ numeroNfse: nota.numeroNfse, rps: nota.rpsNumero, resultado: 'atualizado' });
                } else {
                    ignoradas++;
                    detalhes.push({ numeroNfse: nota.numeroNfse, rps: nota.rpsNumero, resultado: 'já existe' });
                }
                continue;
            }

            // Não existe — cria registro
            const emitidaEm = nota.dataEmissao ? new Date(nota.dataEmissao) : new Date();

            await prisma.nfseRecord.create({
                data: {
                    rpsNumero:         nota.rpsNumero || nota.numeroNfse,
                    rpsSerie,
                    protocolo:         null,
                    numeroNfse:        nota.numeroNfse,
                    codigoVerificacao: nota.codigoVerificacao || null,
                    status:            'emitida',
                    valorServicos:     nota.valorServicos,
                    discriminacao:     nota.discriminacao || '(importado do GINFES)',
                    tomadorNome:       nota.tomadorNome   || null,
                    tomadorDoc:        nota.tomadorDoc    || null,
                    emitidaEm,
                },
            });

            importadas++;
            detalhes.push({ numeroNfse: nota.numeroNfse, rps: nota.rpsNumero, resultado: 'importado' });
        } catch (err: any) {
            detalhes.push({ numeroNfse: nota.numeroNfse, rps: nota.rpsNumero, resultado: `erro: ${err?.message}` });
            console.error('[NFSE_IMPORTAR]', nota.numeroNfse, err?.message);
        }
    }

    return NextResponse.json({
        total: resultado.notas.length,
        importadas,
        atualizadas,
        ignoradas,
        summary: `${importadas} importadas, ${atualizadas} atualizadas, ${ignoradas} já existiam.`,
        detalhes,
    });
}
