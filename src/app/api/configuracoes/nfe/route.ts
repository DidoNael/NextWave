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

    const { certificadoBase64, providerCredentials, ...rest } = config as any;
    return NextResponse.json({
        ...rest,
        hasCertificado:           !!certificadoBase64,
        senhaCertificado:         '',
        hasProviderCredentials:   !!providerCredentials,
        // Garantir defaults para campos que podem não existir ainda no banco
        regimeEspecialTributacao:  rest.regimeEspecialTributacao  ?? '6',
        incentivadorCultural:      rest.incentivadorCultural      ?? '2',
        exigibilidadeIss:          rest.exigibilidadeIss          ?? '1',
        codigoTributacaoMunicipio: rest.codigoTributacaoMunicipio ?? null,
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

        const data: any = {
            cnpj:                     cnpj.replace(/\D/g, ''),
            inscricaoMunicipal,
            razaoSocial,
            ambiente:                 ambiente              || 'homologacao',
            aliquotaIss:              parseFloat(aliquotaIss) || 0.02,
            itemListaServico:         itemListaServico      || '14.06',
            codigoMunicipio:          codigoMunicipio       || '3514700',
            serieRps:                 serieRps              || '1',
            tipoRps:                  tipoRps               || '1',
            naturezaOperacao:         naturezaOperacao      || '1',
            optanteSimplesNacional:   optanteSimplesNacional || '1',
            regimeEspecialTributacao: regimeEspecialTributacao || '6',
            incentivadorCultural:     incentivadorCultural  || '2',
            exigibilidadeIss:         exigibilidadeIss      || '1',
            codigoTributacaoMunicipio: codigoTributacaoMunicipio || null,
            provider:                 activeProvider,
        };

        // Certificado digital — apenas para GINFES e apenas se enviado
        if (activeProvider === 'ginfes') {
            if (certificadoBase64) data.certificadoBase64 = encryptCert(certificadoBase64);
            if (senhaCertificado)  data.senhaCertificado  = encryptCert(senhaCertificado);
        }

        // Credenciais SaaS
        if (providerCredentials !== undefined) {
            if (providerCredentials) {
                const credsObj = typeof providerCredentials === 'string'
                    ? JSON.parse(providerCredentials)
                    : providerCredentials;
                data.providerCredentials = JSON.stringify(credsObj);
            } else {
                data.providerCredentials = null;
            }
        }

        const config = await prisma.nfeConfig.upsert({
            where:  { id: 'default' },
            create: { id: 'default', ...data },
            update: { ...data },
        });

        const { certificadoBase64: _cert, providerCredentials: _creds, ...rest } = config as any;
        return NextResponse.json({
            ...rest,
            hasCertificado:         !!_cert,
            hasProviderCredentials: !!_creds,
        });
    } catch (error: any) {
        console.error('[NFE_CONFIG_PUT_ERROR]', error);
        return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
    }
}
