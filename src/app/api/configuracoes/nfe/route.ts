import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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
        });
    }

    // Não retornar o certificado base64 completo — apenas indicar se existe
    const { certificadoBase64, ...rest } = config;
    return NextResponse.json({
        ...rest,
        hasCertificado: !!certificadoBase64,
        senhaCertificado: '', // não expor senha
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
        } = body;

        if (!cnpj || !inscricaoMunicipal || !razaoSocial) {
            return NextResponse.json({ error: 'CNPJ, inscrição municipal e razão social são obrigatórios' }, { status: 400 });
        }

        const data: any = {
            cnpj: cnpj.replace(/\D/g, ''),
            inscricaoMunicipal,
            razaoSocial,
            ambiente: ambiente || 'homologacao',
            aliquotaIss: parseFloat(aliquotaIss) || 0.02,
            itemListaServico: itemListaServico || '14.06',
            codigoMunicipio: codigoMunicipio || '3514700',
            serieRps: serieRps || '1',
            tipoRps: tipoRps || '1',
            naturezaOperacao: naturezaOperacao || '1',
            optanteSimplesNacional: optanteSimplesNacional || '1',
        };

        // Só atualiza certificado se foi enviado
        if (certificadoBase64) {
            data.certificadoBase64 = certificadoBase64;
        }
        if (senhaCertificado) {
            data.senhaCertificado = senhaCertificado;
        }

        const config = await prisma.nfeConfig.upsert({
            where: { id: 'default' },
            create: { id: 'default', ...data, updatedAt: new Date() },
            update: { ...data, updatedAt: new Date() },
        });

        const { certificadoBase64: _cert, ...rest } = config;
        return NextResponse.json({ ...rest, hasCertificado: !!_cert });
    } catch (error: any) {
        console.error('[NFE_CONFIG_PUT_ERROR]', error);
        return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
    }
}
