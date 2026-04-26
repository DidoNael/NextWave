import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { NfseEmitirOptions } from '@/lib/financeiro/nfse/provider';
import { nextRpsNumero } from '@/lib/financeiro/nfse/rps-counter';

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

    const nfseProvider = await getActiveNfseProvider();
    if (!nfseProvider) {
        return NextResponse.json(
            { error: 'Provedor NFS-e não configurado. Acesse Configurações → NFS-e.' },
            { status: 400 }
        );
    }

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
        return NextResponse.json({ error: 'Configuração NFS-e não encontrada' }, { status: 400 });
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

    // Gerar novo número RPS para evitar duplicata no provedor (atômico)
    const rpsNumero = await nextRpsNumero();
    const loteId = `${Date.now()}`;

    // Atualizar registro com dados corrigidos + limpar erro anterior
    await prisma.nfseRecord.update({
        where: { id: params.id },
        data: {
            rpsNumero,
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

    const now = new Date();
    const dataEmissaoFmt = now.toISOString().replace('Z', '').split('.')[0];
    const dataCompetenciaFmt = overrides.dataCompetencia && /^\d{4}-\d{2}$/.test(overrides.dataCompetencia)
        ? `${overrides.dataCompetencia}-01T00:00:00`
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;

    const emitirOptions: NfseEmitirOptions = {
        rpsNumero,
        rpsSerie:                  record.rpsSerie || config.serieRps || '1',
        rpsType:                   config.tipoRps || '1',
        dataEmissao:               dataEmissaoFmt,
        dataCompetencia:           dataCompetenciaFmt,
        valorServicos,
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
            cpfCnpj:         (tomadorDoc || '').replace(/\D/g, '') || '00000000000',
            razaoSocial:     tomadorNome || 'Consumidor Final',
            endereco:        tomadorEndereco,
            numero:          tomadorNumero,
            bairro:          tomadorBairro,
            codigoMunicipio: tomadorCodigoMunicipio,
            uf:              tomadorUf,
            cep:             tomadorCep,
            email:           tomadorEmail,
        },
    };

    let result;
    try {
        result = await nfseProvider.emitir(emitirOptions, loteId);
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
