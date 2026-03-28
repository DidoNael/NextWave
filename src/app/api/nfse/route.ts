import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesClient } from '@/lib/financeiro/ginfes/client';
import { RpsData } from '@/lib/financeiro/ginfes/templates';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';

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

        // Carregar configuração
        const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
        if (!config || !config.certificadoBase64 || !config.cnpj) {
            return NextResponse.json({ error: 'Configuração NFS-e incompleta. Configure certificado e dados fiscais.' }, { status: 400 });
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

        // Montar dados RPS
        const rpsData: RpsData = {
            numero: nextRpsNumero,
            serie: config.serieRps || '1',
            tipo: config.tipoRps || '1',
            dataEmissao: new Date().toISOString().split('T')[0],
            valorServicos,
            issRetido: '2', // 2 = Não retido
            itemListaServico: config.itemListaServico || '14.06',
            codigoMunicipio: config.codigoMunicipio || '3514700',
            discriminacao,
            prestador: {
                cnpj: config.cnpj.replace(/\D/g, ''),
                inscricaoMunicipal: config.inscricaoMunicipal,
            },
            tomador: {
                cpfCnpj: (tomadorDoc || '').replace(/\D/g, '') || '00000000000',
                razaoSocial: tomadorNome || 'Consumidor Final',
                endereco: tomadorEndereco || 'Não informado',
                numero: tomadorNumero || 'SN',
                bairro: tomadorBairro || 'Não informado',
                codigoMunicipio: tomadorCodigoMunicipio || config.codigoMunicipio || '3514700',
                uf: tomadorUf || 'SP',
                cep: (tomadorCep || '').replace(/\D/g, '') || '07000000',
                email: tomadorEmail || undefined,
            },
        };

        // Chamar Ginfes
        const client = new GinfesClient({
            cnpj: config.cnpj.replace(/\D/g, ''),
            inscricaoMunicipal: config.inscricaoMunicipal,
            certificadoBase64: decryptCert(config.certificadoBase64),
            senhaCertificado: config.senhaCertificado ? decryptCert(config.senhaCertificado) : '',
            ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
        });

        const result = await client.emitirLote([rpsData], loteId);

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

        // Atualizar com protocolo
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
