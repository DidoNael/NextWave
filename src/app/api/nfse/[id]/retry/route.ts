import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesClient } from '@/lib/financeiro/ginfes/client';
import { RpsData } from '@/lib/financeiro/ginfes/templates';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';

// POST /api/nfse/[id]/retry — reenvia uma nota com erro (aceita dados corrigidos no body)
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

    // Dados corrigidos vindos do body (opcionais — usa os do registro se não informados)
    let overrides: Record<string, any> = {};
    try {
        const text = await req.text();
        if (text) overrides = JSON.parse(text);
    } catch { /* body vazio ou inválido — sem overrides */ }

    const discriminacao = overrides.discriminacao || record.discriminacao;
    const valorServicos = overrides.valorServicos != null ? Number(overrides.valorServicos) : record.valorServicos;
    const tomadorNome = overrides.tomadorNome ?? record.tomadorNome;
    const tomadorDoc = overrides.tomadorDoc ?? record.tomadorDoc;
    const tomadorEndereco = overrides.tomadorEndereco || 'Não informado';
    const tomadorNumero = overrides.tomadorNumero || 'SN';
    const tomadorBairro = overrides.tomadorBairro || 'Não informado';
    const tomadorCodigoMunicipio = overrides.tomadorCodigoMunicipio || config.codigoMunicipio || '3514700';
    const tomadorUf = overrides.tomadorUf || 'SP';
    const tomadorCep = (overrides.tomadorCep || '').replace(/\D/g, '') || '07000000';
    const tomadorEmail = overrides.tomadorEmail || undefined;

    // Gerar novo número RPS para evitar duplicata no Ginfes
    const lastRecord = await prisma.nfseRecord.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { rpsNumero: true },
    });
    const nextRpsNumero = lastRecord ? String(parseInt(lastRecord.rpsNumero) + 1) : '1';
    const loteId = `${Date.now()}`;

    // Atualizar registro com dados corrigidos + limpar erro
    await prisma.nfseRecord.update({
        where: { id: params.id },
        data: {
            rpsNumero: nextRpsNumero,
            status: 'pendente',
            errorMessage: null,
            protocolo: null,
            xmlRetorno: null,
            discriminacao,
            valorServicos,
            tomadorNome: tomadorNome || null,
            tomadorDoc: tomadorDoc || null,
        },
    });

    const rpsData: RpsData = {
        numero: nextRpsNumero,
        serie: record.rpsSerie || config.serieRps || '1',
        tipo: config.tipoRps || '1',
        dataEmissao: new Date().toISOString().split('T')[0],
        valorServicos,
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
            cpfCnpj: (tomadorDoc || '').replace(/\D/g, '') || '00000000000',
            razaoSocial: tomadorNome || 'Consumidor Final',
            endereco: tomadorEndereco,
            numero: tomadorNumero,
            bairro: tomadorBairro,
            codigoMunicipio: tomadorCodigoMunicipio,
            uf: tomadorUf,
            cep: tomadorCep,
            email: tomadorEmail,
        },
    };

    const ginfesClient = new GinfesClient({
        cnpj: config.cnpj.replace(/\D/g, ''),
        inscricaoMunicipal: config.inscricaoMunicipal,
        certificadoBase64: decryptCert(config.certificadoBase64),
        senhaCertificado: config.senhaCertificado ? decryptCert(config.senhaCertificado) : '',
        ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
    });

    let result;
    try {
        result = await ginfesClient.emitirLote([rpsData], loteId);
    } catch (err: any) {
        const msg = err?.message || 'Erro desconhecido na emissão';
        await prisma.nfseRecord.update({
            where: { id: params.id },
            data: { status: 'erro', errorMessage: msg },
        });
        return NextResponse.json({ error: msg }, { status: 500 });
    }

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
