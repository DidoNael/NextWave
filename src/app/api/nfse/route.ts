import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { NfseEmitirOptions } from '@/lib/financeiro/nfse/provider';
import { nextRpsNumero } from '@/lib/financeiro/nfse/rps-counter';

// GET /api/nfse — listar notas emitidas (com paginação)
export async function GET(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId  = searchParams.get('clientId');
    const serviceId = searchParams.get('serviceId');
    const status    = searchParams.get('status');
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip      = (page - 1) * limit;

    const where: any = {};
    if (clientId)  where.clientId  = clientId;
    if (serviceId) where.serviceId = serviceId;
    if (status)    where.status    = status;

    const [records, total] = await Promise.all([
        prisma.nfseRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.nfseRecord.count({ where }),
    ]);

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    const nfseProvider = await getActiveNfseProvider();

    const recordsWithUrl = records.map(rec => {
        let nfseUrl = undefined;
        if (rec.status === 'emitida' && rec.numeroNfse && rec.codigoVerificacao && config && nfseProvider?.getNfseUrl) {
            nfseUrl = nfseProvider.getNfseUrl(rec.numeroNfse, rec.codigoVerificacao, config.cnpj, config.codigoMunicipio);
        }
        return { ...rec, nfseUrl };
    });

    return NextResponse.json({
        records: recordsWithUrl,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
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
            tomadorCodigoMunicipio, tomadorUf, tomadorCep, dataCompetencia } = body;

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

        // Gerar número RPS sequencial (atômico — sem race condition)
        const rpsNumero = await nextRpsNumero();
        const loteId = `${Date.now()}`;

        // Criar registro com status pendente
        const record = await prisma.nfseRecord.create({
            data: {
                rpsNumero,
                rpsSerie: config.serieRps || '1',
                status: 'pendente',
                valorServicos,
                discriminacao,
                tomadorNome: tomadorNome || null,
                tomadorDoc: tomadorDoc || null,
                serviceId: serviceId || null,
                clientId: clientId || null,
                ambiente: config.ambiente,
            },
        });

        // Montar data de emissão (now) e competência (1º do mês informado ou mês atual)
        const now = new Date();
        const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const dataEmissaoFmt = spTime.getFullYear() + '-' +
            String(spTime.getMonth() + 1).padStart(2, '0') + '-' +
            String(spTime.getDate()).padStart(2, '0') + 'T' +
            String(spTime.getHours()).padStart(2, '0') + ':' +
            String(spTime.getMinutes()).padStart(2, '0') + ':' +
            String(spTime.getSeconds()).padStart(2, '0');

        // dataCompetencia vem do body como "YYYY-MM" (ex: "2026-04"), convertido para 1º dia do mês
        let dataCompetenciaFmt: string;
        if (dataCompetencia && /^\d{4}-\d{2}$/.test(dataCompetencia)) {
            dataCompetenciaFmt = `${dataCompetencia}-01T00:00:00`;
        } else {
            // fallback: 1º do mês atual
            dataCompetenciaFmt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
        }

        // Montar opções provider-agnostic
        const emitirOptions: NfseEmitirOptions = {
            rpsNumero,
            rpsSerie:                  config.serieRps || '1',
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
                endereco:        tomadorEndereco || 'Não informado',
                numero:          tomadorNumero || 'SN',
                bairro:          tomadorBairro || 'Não informado',
                codigoMunicipio: tomadorCodigoMunicipio || config.codigoMunicipio || '3514700',
                uf:              tomadorUf || 'SP',
                cep:             (tomadorCep || '').replace(/\D/g, '') || '07000000',
                email:           tomadorEmail || undefined,
            },
        };

        console.log('[NFSE_EMITIR] Enviando para GINFES. RPS:', rpsNumero, '| Prestador CNPJ:', emitirOptions.prestador.cnpj, '| IM:', emitirOptions.prestador.inscricaoMunicipal, '| Município:', emitirOptions.codigoMunicipio, '| Item:', emitirOptions.itemListaServico, '| Cód.Trib:', emitirOptions.codigoTributacaoMunicipio);
        const result = await nfseProvider.emitir(emitirOptions, loteId);
        console.log('[NFSE_EMITIR] Retorno GINFES:', { protocolo: result.protocolo, erro: result.erro, xmlFull: result.xmlRetorno });

        if (result.erro) {
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: {
                    status: 'erro',
                    errorMessage: result.erro,
                    xmlRetorno: result.xmlRetorno,
                    xmlEnviado: result.xmlEnviado,
                },
            });
            return NextResponse.json({ error: result.erro, recordId: record.id }, { status: 422 });
        }

        // Se GINFES não retornou protocolo nem erro, trata como erro
        if (!result.protocolo) {
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: {
                    status: 'erro',
                    errorMessage: 'GINFES não retornou protocolo. Verifique o XML de retorno.',
                    xmlRetorno: result.xmlRetorno,
                    xmlEnviado: result.xmlEnviado,
                },
            });
            return NextResponse.json({ error: 'GINFES não retornou protocolo', recordId: record.id }, { status: 422 });
        }

        // Atualizar com protocolo/ID do provedor
        const updated = await prisma.nfseRecord.update({
            where: { id: record.id },
            data: {
                protocolo: result.protocolo,
                status: 'aguardando_processamento',
                xmlRetorno: result.xmlRetorno,
                xmlEnviado: result.xmlEnviado,
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[NFSE_EMITIR_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Erro ao emitir NFS-e' }, { status: 500 });
    }
}
