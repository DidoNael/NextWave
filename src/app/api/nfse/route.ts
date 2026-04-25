import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { NfseEmitirOptions } from '@/lib/financeiro/nfse/provider';

// GET /api/nfse — listar notas emitidas
export async function GET(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const serviceId = searchParams.get('serviceId');
    const status = searchParams.get('status');

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;

    const records = await prisma.nfseRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return NextResponse.json(records);
}

// POST /api/nfse — emitir NFS-e
export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { serviceId, clientId, discriminacao, valorServicos, tomadorNome, tomadorDoc,
            tomadorEmail, tomadorEndereco, tomadorNumero, tomadorBairro,
            tomadorCodigoMunicipio, tomadorUf, tomadorCep } = body;

        if (!discriminacao || !valorServicos) {
            return NextResponse.json({ error: 'discriminacao e valorServicos são obrigatórios' }, { status: 400 });
        }

        // Obter provedor ativo via factory
        const nfseProvider = await getActiveNfseProvider();
        if (!nfseProvider) {
            return NextResponse.json(
                { error: 'Provedor NFS-e não configurado. Acesse Configurações → NFS-e para configurar.' },
                { status: 400 }
            );
        }

        // Config fiscal ainda vem do banco (aliquota, itemListaServico, etc.)
        const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
        if (!config) {
            return NextResponse.json({ error: 'Configuração NFS-e não encontrada.' }, { status: 400 });
        }

        // Gerar número RPS sequencial
        const lastRecord = await prisma.nfseRecord.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { rpsNumero: true },
        });
        const nextRpsNumero = lastRecord ? String(parseInt(lastRecord.rpsNumero) + 1) : '1';
        const loteId = `${Date.now()}`;

        // Criar registro com status pendente
        const record = await prisma.nfseRecord.create({
            data: {
                rpsNumero: nextRpsNumero,
                rpsSerie: config.serieRps || '1',
                status: 'pendente',
                valorServicos,
                discriminacao,
                tomadorNome: tomadorNome || null,
                tomadorDoc: tomadorDoc || null,
                serviceId: serviceId || null,
                clientId: clientId || null,
            },
        });

        // Montar opções provider-agnostic
        const emitirOptions: NfseEmitirOptions = {
            rpsNumero:        nextRpsNumero,
            rpsSerie:         config.serieRps || '1',
            rpsType:          config.tipoRps || '1',
            dataEmissao:      new Date().toISOString().split('T')[0],
            valorServicos,
            aliquota:         config.aliquotaIss || 0.0215,
            issRetido:        '2', // 2 = Não retido
            itemListaServico: config.itemListaServico || '1.07',
            codigoMunicipio:  config.codigoMunicipio || '3514700',
            discriminacao,
            prestador: {
                cnpj:               config.cnpj.replace(/\D/g, ''),
                inscricaoMunicipal: config.inscricaoMunicipal,
            },
            tomador: {
                cpfCnpj:         (tomadorDoc || '').replace(/\D/g, '') || '00000000000',
                razaoSocial:     tomadorNome || 'Consumidor Final',
                endereco:        tomadorEndereco || 'Não informado',
                numero:          tomadorNumero || 'SN',
                bairro:          tomadorBairro || 'Não informado',
                codigoMunicipio: tomadorCodigoMunicipio || config.codigoMunicipio || '3514700',
                uf:              tomadorUf || 'SP',
                cep:             (tomadorCep || '').replace(/\D/g, '') || '07000000',
                email:           tomadorEmail || undefined,
            },
        };

        const result = await nfseProvider.emitir(emitirOptions, loteId);

        if (result.erro) {
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: {
                    status: 'erro',
                    errorMessage: result.erro,
                    xmlRetorno: result.xmlRetorno,
                },
            });
            return NextResponse.json({ error: result.erro, recordId: record.id }, { status: 422 });
        }

        // Atualizar com protocolo/ID do provedor
        const updated = await prisma.nfseRecord.update({
            where: { id: record.id },
            data: {
                protocolo: result.protocolo || null,
                status: 'aguardando_processamento',
                xmlRetorno: result.xmlRetorno,
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[NFSE_EMITIR_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Erro ao emitir NFS-e' }, { status: 500 });
    }
}
