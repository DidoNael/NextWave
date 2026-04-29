import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { nextRpsNumero } from '@/lib/financeiro/nfse/rps-counter';
import { format } from 'date-fns';

export async function GET(req: Request) {
    // Bypass de segurança para testes do desenvolvedor
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== 'antigravity_debug_123') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const clientId = 'cmofxb8le00023ratj83p1va6'; // Real Fibra
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return NextResponse.json({ error: 'Cliente não encontrado' });

        const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
        if (!config) return NextResponse.json({ error: 'Configuração não encontrada' });

        const nfseProvider = await getActiveNfseProvider();
        if (!nfseProvider) return NextResponse.json({ error: 'Provider não encontrado' });

        const rpsNumero = await nextRpsNumero();
        const rpsSerie = config.serieRps || '1';
        const loteId = Math.floor(Date.now() / 1000).toString();
        const now = new Date();

        const result = await nfseProvider.emitir({
            rpsNumero,
            rpsSerie,
            rpsType: config.tipoRps || '1',
            dataEmissao: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
            dataCompetencia: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
            valorServicos: 1.00,
            aliquota: config.aliquotaIss || 0.02,
            issRetido: config.exigibilidadeIss === '2' ? '1' : '2',
            itemListaServico: config.itemListaServico || '0107',
            codigoMunicipio: config.codigoMunicipio,
            discriminacao: 'TESTE AUTOMATICO - FAVOR IGNORAR',
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
                email: 'teste@teste.com',
                endereco: client.address || 'Rua Teste',
                numero: client.number || '9',
                bairro: client.neighborhood || 'Bairro',
                codigoMunicipio: client.cityCode || '3518800',
                uf: client.state || 'SP',
                cep: (client.zipCode || '').replace(/\D/g, '') || '07000000',
            }
        }, loteId);

        return NextResponse.json({ 
            success: !result.erro, 
            protocolo: result.protocolo, 
            erro: result.erro,
            xmlEnviado: result.xmlEnviado 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
