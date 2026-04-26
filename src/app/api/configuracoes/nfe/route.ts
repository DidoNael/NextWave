import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { encryptCert } from '@/lib/financeiro/ginfes/cert-crypto';

export async function GET() {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });

    if (!config) {
        return NextResponse.json({
            id: 'default',
            cnpj: '',
            inscricaoMunicipal: '',
            razaoSocial: '',
            senhaCertificado: '',
            hasCertificado: false,
            ambiente: 'homologacao',
            aliquotaIss: 0.02,
            itemListaServico: '14.06',
            codigoMunicipio: '3514700',
            serieRps: '1',
            tipoRps: '1',
            naturezaOperacao: '1',
            optanteSimplesNacional: '1',
            regimeEspecialTributacao: '6',
            incentivadorCultural: '2',
            exigibilidadeIss: '1',
            codigoTributacaoMunicipio: null,
            provider: 'ginfes',
            hasProviderCredentials: false,
        });
    }

    // Ler campos ABRASF novos via raw SQL (resiliente a Prisma client desatualizado)
    let abrasfFields: Record<string, string | null> = {
        regimeEspecialTributacao:  '6',
        incentivadorCultural:      '2',
        exigibilidadeIss:          '1',
        codigoTributacaoMunicipio: null,
    };
    try {
        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT "regimeEspecialTributacao", "incentivadorCultural",
                   "exigibilidadeIss", "codigoTributacaoMunicipio"
            FROM "NfeConfig" WHERE id = 'default' LIMIT 1
        `);
        if (rows[0]) abrasfFields = rows[0];
    } catch { /* colunas ainda não existem — usa defaults */ }

    // Não retornar certificado ou credenciais em texto claro — apenas indicadores booleanos
    const { certificadoBase64, ...rest } = config as any;
    return NextResponse.json({
        ...rest,
        ...abrasfFields,
        hasCertificado:         !!certificadoBase64,
        senhaCertificado:       '',
        provider:               (config as any).provider ?? 'ginfes',
        hasProviderCredentials: !!(config as any).providerCredentials,
        providerCredentials:    undefined,
    });
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            cnpj, inscricaoMunicipal, razaoSocial,
            senhaCertificado, certificadoBase64,
            ambiente, aliquotaIss, itemListaServico,
            codigoMunicipio, serieRps, tipoRps,
            naturezaOperacao, optanteSimplesNacional,
            regimeEspecialTributacao, incentivadorCultural,
            exigibilidadeIss, codigoTributacaoMunicipio,
            provider,
            providerCredentials,
        } = body;

        if (!cnpj || !inscricaoMunicipal || !razaoSocial) {
            return NextResponse.json({ error: 'CNPJ, inscrição municipal e razão social são obrigatórios' }, { status: 400 });
        }

        const activeProvider = provider || 'ginfes';

        // Campos core — sempre conhecidos pelo Prisma client
        const coreData: any = {
            cnpj:                  cnpj.replace(/\D/g, ''),
            inscricaoMunicipal,
            razaoSocial,
            ambiente:              ambiente || 'homologacao',
            aliquotaIss:           parseFloat(aliquotaIss) || 0.02,
            itemListaServico:      itemListaServico || '14.06',
            codigoMunicipio:       codigoMunicipio || '3514700',
            serieRps:              serieRps || '1',
            tipoRps:               tipoRps || '1',
            naturezaOperacao:      naturezaOperacao || '1',
            optanteSimplesNacional: optanteSimplesNacional || '1',
            provider:              activeProvider,
        };

        // Certificado digital — apenas para GINFES e apenas se enviado
        if (activeProvider === 'ginfes') {
            if (certificadoBase64) coreData.certificadoBase64 = encryptCert(certificadoBase64);
            if (senhaCertificado)  coreData.senhaCertificado  = encryptCert(senhaCertificado);
        }

        // Credenciais SaaS
        if (providerCredentials !== undefined) {
            if (providerCredentials) {
                const credsObj = typeof providerCredentials === 'string'
                    ? JSON.parse(providerCredentials)
                    : providerCredentials;
                coreData.providerCredentials = JSON.stringify(credsObj);
            } else {
                coreData.providerCredentials = null;
            }
        }

        // Upsert com campos core (sempre funciona, independente do Prisma client gerado)
        const config = await prisma.nfeConfig.upsert({
            where:  { id: 'default' },
            create: { id: 'default', ...coreData, updatedAt: new Date() },
            update: { ...coreData, updatedAt: new Date() },
        });

        // Campos ABRASF v3 novos — salva via raw SQL para não depender da versão do Prisma client
        try {
            await prisma.$executeRawUnsafe(`
                UPDATE "NfeConfig" SET
                    "regimeEspecialTributacao"  = $1,
                    "incentivadorCultural"      = $2,
                    "exigibilidadeIss"          = $3,
                    "codigoTributacaoMunicipio" = $4
                WHERE id = 'default'
            `,
                regimeEspecialTributacao  || '6',
                incentivadorCultural      || '2',
                exigibilidadeIss          || '1',
                codigoTributacaoMunicipio || null,
            );
        } catch {
            // Colunas ainda não existem no banco (migration pendente) — ignora silenciosamente
        }

        const { certificadoBase64: _cert, providerCredentials: _creds, ...rest } = config as any;
        return NextResponse.json({
            ...rest,
            hasCertificado:         !!_cert,
            hasProviderCredentials: !!_creds,
            // Retorna os novos campos com fallback para os valores enviados
            regimeEspecialTributacao:  regimeEspecialTributacao  || '6',
            incentivadorCultural:      incentivadorCultural      || '2',
            exigibilidadeIss:          exigibilidadeIss          || '1',
            codigoTributacaoMunicipio: codigoTributacaoMunicipio || null,
        });
    } catch (error: any) {
        console.error('[NFE_CONFIG_PUT_ERROR]', error);
        return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
    }
}
