import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesClient } from '@/lib/financeiro/ginfes/client';
import { RpsData } from '@/lib/financeiro/ginfes/templates';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';

// POST /api/nfse/[id]/retry — reenvia uma nota com erro
export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const record = await prisma.nfseRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    if (!['erro', 'pendente'].includes(record.status)) {
        return NextResponse.json({ error: 'Somente notas com erro ou pendentes podem ser reenviadas' }, { status: 400 });
    }

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config?.certificadoBase64 || !config.cnpj) {
        return NextResponse.json({ error: 'Configuração NFS-e incompleta' }, { status: 400 });
    }

    // Gerar novo número RPS para evitar duplicata no Ginfes
    const lastRecord = await prisma.nfseRecord.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { rpsNumero: true },
    });
    const nextRpsNumero = lastRecord ? String(parseInt(lastRecord.rpsNumero) + 1) : '1';
    const loteId = `${Date.now()}`;

    // Atualizar número RPS e limpar erro
    await prisma.nfseRecord.update({
        where: { id: params.id },
        data: {
            rpsNumero: nextRpsNumero,
            status: 'pendente',
            errorMessage: null,
            protocolo: null,
            xmlRetorno: null,
        },
    });

    const rpsData: RpsData = {
        numero: nextRpsNumero,
        serie: record.rpsSerie || config.serieRps || '1',
        tipo: config.tipoRps || '1',
        dataEmissao: new Date().toISOString().split('T')[0],
        valorServicos: record.valorServicos,
        aliquota: config.aliquotaIss || 0.0215,
        issRetido: '2',
        itemListaServico: config.itemListaServico || '1.07',
        codigoMunicipio: config.codigoMunicipio || '3514700',
        discriminacao: record.discriminacao,
        prestador: {
            cnpj: config.cnpj.replace(/\D/g, ''),
            inscricaoMunicipal: config.inscricaoMunicipal,
        },
        tomador: {
            cpfCnpj: (record.tomadorDoc || '').replace(/\D/g, '') || '00000000000',
            razaoSocial: record.tomadorNome || 'Consumidor Final',
            endereco: 'Não informado',
            numero: 'SN',
            bairro: 'Não informado',
            codigoMunicipio: config.codigoMunicipio || '3514700',
            uf: 'SP',
            cep: '07000000',
        },
    };

    const client = new GinfesClient({
        cnpj: config.cnpj.replace(/\D/g, ''),
        inscricaoMunicipal: config.inscricaoMunicipal,
        certificadoBase64: decryptCert(config.certificadoBase64),
        senhaCertificado: config.senhaCertificado ? decryptCert(config.senhaCertificado) : '',
        ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
    });

    const result = await client.emitirLote([rpsData], loteId);

    if (result.erro) {
        const updated = await prisma.nfseRecord.update({
            where: { id: params.id },
            data: { status: 'erro', errorMessage: result.erro, xmlRetorno: result.xmlRetorno },
        });
        return NextResponse.json({ error: result.erro, record: updated }, { status: 422 });
    }

    const updated = await prisma.nfseRecord.update({
        where: { id: params.id },
        data: {
            protocolo: result.protocolo || null,
            status: 'aguardando_processamento',
            xmlRetorno: result.xmlRetorno,
        },
    });

    return NextResponse.json(updated);
}
