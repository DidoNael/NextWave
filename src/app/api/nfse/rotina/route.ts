import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { NfseEmitirOptions } from '@/lib/financeiro/nfse/provider';
import { nextRpsNumero } from '@/lib/financeiro/nfse/rps-counter';

/**
 * POST /api/nfse/rotina
 *
 * Rotina em lote: emite NFS-e para todos os serviços da organização
 * que ainda não possuem nota fiscal emitida (status emitida ou aguardando).
 *
 * Body (opcional):
 *   { serviceIds?: string[] }  — restringir a IDs específicos
 *
 * Retorna:
 *   { emitted: [...], failed: [...], skipped: [...] }
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId as string | undefined;
    if (!organizationId) {
        return NextResponse.json({ error: 'Organização não encontrada' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const filterIds: string[] | undefined = body?.serviceIds;

    // Obter provedor ativo uma única vez (antes do loop)
    const nfseProvider = await getActiveNfseProvider();
    if (!nfseProvider) {
        return NextResponse.json(
            { error: 'Provedor NFS-e não configurado. Acesse Configurações → NFS-e para configurar.' },
            { status: 400 }
        );
    }

    // Carregar configuração fiscal
    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config?.cnpj) {
        return NextResponse.json(
            { error: 'Configuração NFS-e incompleta. Acesse Configurações → NFS-e para configurar.' },
            { status: 400 }
        );
    }

    // IDs de serviços que já têm NFS-e emitida ou aguardando
    const existingRecords = await prisma.nfseRecord.findMany({
        where: {
            status: { in: ['emitida', 'aguardando_processamento', 'pendente'] },
            serviceId: { not: null },
        },
        select: { serviceId: true },
    });
    const alreadyEmittedServiceIds = new Set(existingRecords.map(r => r.serviceId!));

    // Serviços elegíveis: não cancelados, da organização, sem NFS-e
    const serviceWhere: any = {
        organizationId,
        status: { not: 'cancelado' },
    };
    if (filterIds?.length) serviceWhere.id = { in: filterIds };

    const services = await prisma.service.findMany({
        where: serviceWhere,
        include: { client: { select: { name: true, document: true, email: true, address: true, number: true, neighborhood: true, city: true, state: true, zipCode: true } } },
        orderBy: { createdAt: 'asc' },
    });

    const eligible = services.filter(s => !alreadyEmittedServiceIds.has(s.id));

    if (eligible.length === 0) {
        return NextResponse.json({ emitted: [], failed: [], skipped: [], message: 'Nenhum serviço elegível encontrado.' });
    }

    const emitted: string[] = [];
    const failed: { serviceId: string; title: string; error: string }[] = [];
    const skipped: string[] = [];

    const dataCompetenciaBody: string | undefined = body?.dataCompetencia; // "YYYY-MM"

    const now = new Date();
    const dataEmissaoFmt = now.toISOString().replace('Z', '').split('.')[0];
    let dataCompetenciaFmt: string;
    if (dataCompetenciaBody && /^\d{4}-\d{2}$/.test(dataCompetenciaBody)) {
        dataCompetenciaFmt = `${dataCompetenciaBody}-01T00:00:00`;
    } else {
        dataCompetenciaFmt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
    }

    // Reservar bloco de números RPS de forma atômica para toda a rotina
    const firstRps = parseInt(await nextRpsNumero());
    let nextRps = firstRps;

    for (const svc of eligible) {
        if (!svc.amount || svc.amount <= 0) {
            skipped.push(svc.id);
            continue;
        }

        const rpsNumero = String(nextRps++);
        const loteId = `rot-${Date.now()}-${rpsNumero}`;
        const discriminacao = `${svc.title}${svc.description ? ' — ' + svc.description : ''}`;
        const tomador = svc.client;

        // Criar registro pendente
        const record = await prisma.nfseRecord.create({
            data: {
                rpsNumero,
                rpsSerie: config.serieRps || '1',
                status: 'pendente',
                valorServicos: svc.amount,
                discriminacao,
                tomadorNome: tomador?.name ?? null,
                tomadorDoc: tomador?.document ?? null,
                serviceId: svc.id,
                clientId: svc.clientId ?? null,
            },
        });

        const emitirOptions: NfseEmitirOptions = {
            rpsNumero,
            rpsSerie:                  config.serieRps || '1',
            rpsType:                   config.tipoRps || '1',
            dataEmissao:               dataEmissaoFmt,
            dataCompetencia:           dataCompetenciaFmt,
            valorServicos:             svc.amount,
            aliquota:                  config.aliquotaIss || 0.0215,
            issRetido:                 '2',
            itemListaServico:          config.itemListaServico || '1.07',
            codigoMunicipio:           config.codigoMunicipio || '3514700',
            discriminacao,
            naturezaOperacao:          (config as any).naturezaOperacao || '1',
            optanteSimplesNacional:    (config as any).optanteSimplesNacional || '1',
            regimeEspecialTributacao:  (config as any).regimeEspecialTributacao || '6',
            incentivadorCultural:      (config as any).incentivadorCultural || '2',
            exigibilidadeIss:          (config as any).exigibilidadeIss || '1',
            codigoTributacaoMunicipio: (config as any).codigoTributacaoMunicipio || undefined,
            prestador: {
                cnpj:               config.cnpj.replace(/\D/g, ''),
                inscricaoMunicipal: config.inscricaoMunicipal,
            },
            tomador: {
                cpfCnpj:         (tomador?.document ?? '').replace(/\D/g, '') || '00000000000',
                razaoSocial:     tomador?.name ?? 'Consumidor Final',
                endereco:        tomador?.address ?? 'Não informado',
                numero:          tomador?.number ?? 'SN',
                bairro:          tomador?.neighborhood ?? 'Não informado',
                codigoMunicipio: config.codigoMunicipio || '3514700',
                uf:              tomador?.state ?? 'SP',
                cep:             (tomador?.zipCode ?? '').replace(/\D/g, '') || '07000000',
                email:           tomador?.email ?? undefined,
            },
        };

        try {
            const result = await nfseProvider.emitir(emitirOptions, loteId);

            if (result.erro) {
                await prisma.nfseRecord.update({
                    where: { id: record.id },
                    data: { status: 'erro', errorMessage: result.erro, xmlRetorno: result.xmlRetorno },
                });
                failed.push({ serviceId: svc.id, title: svc.title, error: result.erro });
            } else {
                await prisma.nfseRecord.update({
                    where: { id: record.id },
                    data: { protocolo: result.protocolo ?? null, status: 'aguardando_processamento', xmlRetorno: result.xmlRetorno },
                });
                emitted.push(svc.id);
            }
        } catch (err: any) {
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: { status: 'erro', errorMessage: err?.message ?? 'Erro desconhecido' },
            });
            failed.push({ serviceId: svc.id, title: svc.title, error: err?.message ?? 'Erro desconhecido' });
        }
    }

    return NextResponse.json({
        emitted,
        failed,
        skipped,
        summary: `${emitted.length} emitidas, ${failed.length} com erro, ${skipped.length} ignoradas.`,
    });
}
