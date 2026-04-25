import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesClient } from '@/lib/financeiro/ginfes/client';
import { RpsData } from '@/lib/financeiro/ginfes/templates';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';

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

    // Carregar configuração NFS-e
    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config?.certificadoBase64 || !config?.cnpj) {
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

    const ginfes = new GinfesClient({
        cnpj: config.cnpj.replace(/\D/g, ''),
        inscricaoMunicipal: config.inscricaoMunicipal,
        certificadoBase64: decryptCert(config.certificadoBase64),
        senhaCertificado: config.senhaCertificado ? decryptCert(config.senhaCertificado) : '',
        ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
    });

    const emitted: string[] = [];
    const failed: { serviceId: string; title: string; error: string }[] = [];
    const skipped: string[] = [];

    // Obter o último número RPS uma única vez e incrementar localmente
    const lastRecord = await prisma.nfseRecord.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { rpsNumero: true },
    });
    let nextRps = lastRecord ? parseInt(lastRecord.rpsNumero) + 1 : 1;

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

        const rpsData: RpsData = {
            numero: rpsNumero,
            serie: config.serieRps || '1',
            tipo: config.tipoRps || '1',
            dataEmissao: new Date().toISOString().split('T')[0],
            valorServicos: svc.amount,
            aliquota: config.aliquotaIss || 0.0215,
            issRetido: '2',
            itemListaServico: config.itemListaServico || '1.07',
            codigoMunicipio: config.codigoMunicipio || '3514700',
            discriminacao,
            prestador: {
                cnpj: config.cnpj.replace(/\D/g, ''),
                inscricaoMunicipal: config.inscricaoMunicipal,
            },
            tomador: {
                cpfCnpj: (tomador?.document ?? '').replace(/\D/g, '') || '00000000000',
                razaoSocial: tomador?.name ?? 'Consumidor Final',
                endereco: tomador?.address ?? 'Não informado',
                numero: tomador?.number ?? 'SN',
                bairro: tomador?.neighborhood ?? 'Não informado',
                codigoMunicipio: config.codigoMunicipio || '3514700',
                uf: tomador?.state ?? 'SP',
                cep: (tomador?.zipCode ?? '').replace(/\D/g, '') || '07000000',
                email: tomador?.email ?? undefined,
            },
        };

        try {
            const result = await ginfes.emitirLote([rpsData], loteId);

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
