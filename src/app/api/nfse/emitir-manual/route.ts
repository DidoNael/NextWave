import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { nextRpsNumero } from '@/lib/financeiro/nfse/rps-counter';
import { format } from 'date-fns';

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { clientId, valor, discriminacao } = body;

        if (!clientId || !valor || !discriminacao) {
            return NextResponse.json({ error: 'Dados incompletos para emissão.' }, { status: 400 });
        }

        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
        }

        // Validação básica de endereço (exigida pela maioria das prefeituras)
        if (!client.address || !client.neighborhood || !client.zipCode) {
            return NextResponse.json({ 
                error: `Cadastro do cliente incompleto. Verifique: ${!client.address ? 'Endereço, ' : ''}${!client.neighborhood ? 'Bairro, ' : ''}${!client.zipCode ? 'CEP' : ''}` 
            }, { status: 400 });
        }

        const nfseProvider = await getActiveNfseProvider();
        if (!nfseProvider) {
            return NextResponse.json({ error: 'Provedor NFS-e não configurado.' }, { status: 400 });
        }

        const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
        if (!config) {
            return NextResponse.json({ error: 'Configuração fiscal padrão não encontrada.' }, { status: 400 });
        }

        const rpsNumero = await nextRpsNumero();
        const rpsSerie = config.serieRps || '1';
        // LoteId mais curto para evitar rejeição de esquema (máx 11-12 dígitos em alguns provedores)
        const loteId = Math.floor(Date.now() / 1000).toString();
        const now = new Date();

        const record = await prisma.nfseRecord.create({
            data: {
                rpsNumero,
                rpsSerie,
                clientId: client.id,
                status: 'pendente',
                valorServicos: valor,
                discriminacao,
                tomadorNome: client.company || client.name,
                tomadorDoc: client.document || '',
                tomadorEmail: client.email || '',
            }
        });

        (async () => {
            try {
                const result = await nfseProvider.emitir({
                    rpsNumero,
                    rpsSerie,
                    rpsType: config.tipoRps || '1',
                    dataEmissao: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
                    dataCompetencia: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
                    valorServicos: valor,
                    aliquota: config.aliquotaIss || 0.02,
                    issRetido: config.exigibilidadeIss === '2' ? '1' : '2',
                    itemListaServico: config.itemListaServico || '01.07',
                    codigoMunicipio: config.codigoMunicipio,
                    discriminacao,
                    naturezaOperacao: config.naturezaOperacao || '1',
                    optanteSimplesNacional: config.optanteSimplesNacional || '1',
                    regimeEspecialTributacao: config.regimeEspecialTributacao || '6',
                    incentivadorCultural: config.incentivadorCultural || '2',
                    exigibilidadeIss: config.exigibilidadeIss || '1',
                    prestador: {
                        cnpj: config.cnpj,
                        inscricaoMunicipal: config.inscricaoMunicipal
                    },
                    tomador: {
                        razaoSocial: client.company || client.name,
                        cpfCnpj: (client.document || '').replace(/\D/g, ''),
                        email: client.email || '',
                        endereco: client.address || 'Endereço não informado',
                        numero: client.number || 'SN',
                        bairro: client.neighborhood || 'Bairro não informado',
                        codigoMunicipio: client.cityCode || config.codigoMunicipio,
                        uf: client.state || 'SP',
                        cep: (client.zipCode || '').replace(/\D/g, '') || '07000000',
                    }
                }, loteId);

                if (result.erro) {
                    await prisma.nfseRecord.update({
                        where: { id: record.id },
                        data: {
                            status: 'erro',
                            errorMessage: result.erro,
                            xmlEnviado: result.xmlEnviado,
                            xmlRetorno: result.xmlRetorno,
                        }
                    });
                } else {
                    await prisma.nfseRecord.update({
                        where: { id: record.id },
                        data: {
                            status: result.protocolo ? 'aguardando_processamento' : 'emitida',
                            protocolo: result.protocolo,
                            xmlEnviado: result.xmlEnviado,
                            xmlRetorno: result.xmlRetorno,
                        }
                    });
                }
            } catch (error: any) {
                await prisma.nfseRecord.update({
                    where: { id: record.id },
                    data: {
                        status: 'erro',
                        errorMessage: error.message,
                    }
                });
            }
        })();

        return NextResponse.json({ success: true, recordId: record.id });

    } catch (error: any) {
        console.error("[MANUAL_EMIT_ERROR]", error);
        return NextResponse.json({ error: 'Erro interno ao processar emissão manual.' }, { status: 500 });
    }
}
