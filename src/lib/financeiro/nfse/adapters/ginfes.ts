/**
 * GinfesAdapter — wraps GinfesClient para o contrato NfseProvider.
 *
 * O GinfesClient original é mantido inalterado em src/lib/financeiro/ginfes/client.ts.
 * Este adapter apenas mapeia os tipos provider-agnostic ↔ tipos GINFES-específicos.
 */

import { GinfesClient, GinfesClientConfig } from '@/lib/financeiro/ginfes/client';
import { RpsData } from '@/lib/financeiro/ginfes/templates';
import {
    NfseProvider,
    NfseEmitirOptions,
    NfseEmitirResult,
    NfseCancelarResult,
    NfseConsultarResult,
    NfseSincronizarResult,
} from '../provider';

export class GinfesAdapter extends NfseProvider {
    readonly name = 'GINFES';
    readonly provider = 'ginfes';

    private client: GinfesClient;

    constructor(config: GinfesClientConfig) {
        super(config);
        this.client = new GinfesClient(config);
    }

    async emitir(options: NfseEmitirOptions, loteId: string): Promise<NfseEmitirResult> {
        const rpsData: RpsData = {
            numero:                   options.rpsNumero,
            serie:                    options.rpsSerie,
            tipo:                     options.rpsType,
            dataEmissao:              options.dataEmissao,
            dataCompetencia:          options.dataCompetencia,
            valorServicos:            options.valorServicos,
            aliquota:                 options.aliquota,
            issRetido:                options.issRetido,
            itemListaServico:         options.itemListaServico,
            codigoMunicipio:          options.codigoMunicipio,
            discriminacao:            options.discriminacao,
            naturezaOperacao:         options.naturezaOperacao,
            optanteSimplesNacional:   options.optanteSimplesNacional,
            regimeEspecialTributacao: options.regimeEspecialTributacao,
            incentivadorCultural:     options.incentivadorCultural,
            exigibilidadeIss:         options.exigibilidadeIss,
            codigoTributacaoMunicipio: options.codigoTributacaoMunicipio,
            prestador: {
                cnpj:               options.prestador.cnpj,
                inscricaoMunicipal: options.prestador.inscricaoMunicipal ?? '',
            },
            tomador: options.tomador,
        };

        const result = await this.client.emitirLote([rpsData], loteId);

        return {
            erro:       result.erro,
            protocolo:  result.protocolo,
            xmlRetorno: result.xmlRetorno,
            xmlEnviado: result.xmlEnviado,
        };
    }

    async cancelar(numeroNfse: string, codigoMunicipio: string): Promise<NfseCancelarResult> {
        const result = await this.client.cancelarNfse(numeroNfse, codigoMunicipio);

        if (!result.sucesso) {
            return { erro: result.erro ?? 'Erro ao cancelar NFS-e', xmlRetorno: result.xmlRetorno };
        }

        return { xmlRetorno: result.xmlRetorno };
    }

    async sincronizarPorRps(rpsNumero: string, rpsSerie: string, rpsTipo: string): Promise<NfseSincronizarResult> {
        const result = await this.client.consultarNfsePorRps(rpsNumero, rpsSerie, rpsTipo);

        if (result.erro) {
            return { erro: result.erro, xmlRetorno: result.xmlRetorno };
        }

        return {
            numeroNfse:         result.nfse?.numero,
            codigoVerificacao:  result.nfse?.codigoVerificacao || undefined,
            xmlRetorno:         result.xmlRetorno,
        };
    }

    async consultarLote(protocolo: string): Promise<NfseConsultarResult> {
        const result = await this.client.consultarSituacaoLote(protocolo);

        if (result.erro) {
            return { situacao: 1, erro: result.erro, xmlRetorno: result.xmlRetorno };
        }

        // GinfesClient retorna situacao como string ("1","2","3","4") — converte para number
        const situacaoNum = result.situacao ? parseInt(result.situacao, 10) : 1;

        // Se Processado com Erro (3) ou Sucesso (4), buscamos os detalhes (erros ou lista de notas)
        if (situacaoNum === 3 || situacaoNum === 4) {
            console.log(`[GINFES_ADAPTER] Lote processado (Situação ${situacaoNum}). Consultando detalhes...`);
            const detalhe = await this.client.consultarLote(protocolo);
            
            const nfseNumeros = detalhe.nfseList?.map(n => n.numero);
            
            return {
                situacao: situacaoNum,
                erro: detalhe.erro,
                nfseNumeros: nfseNumeros?.length ? nfseNumeros : undefined,
                xmlRetorno: detalhe.xmlRetorno
            };
        }

        return {
            situacao:    situacaoNum,
            xmlRetorno:  result.xmlRetorno,
        };
    }



    async importarPorPeriodo(dataInicial: string, dataFinal: string): Promise<any> {
        return {
            situacao: 1,
            erro: "O Ginfes não possui suporte nativo REST para importar NFS-e por período de forma consolidada no painel Ginfes. Utilize o portal do município.",
        };
    }

    getNfseUrl(
        numero: string,
        codigoVerificacao: string,
        cnpjPrestador: string,
        codigoMunicipio: string
    ): string {
        const subdominios: Record<string, string> = {
            '3518800': 'guarulhos',
            '3514700': 'eliasfausto',
            // Adicionar mais se necessário
        };

        const sub = 'visualizar';
        const maskedCnpj = cnpjPrestador.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

        // Padrão GINFES que redireciona para o report correto (usando parâmetros observados pelo usuário)
        // Adicionamos __format=pdf para que o GINFES retorne os bytes do PDF diretamente
        return `https://${sub}.ginfes.com.br/report/consultarNota?__report=nfs_ver4RT&cnpjPrestador=${maskedCnpj}&numNota=${numero}&cdVerificacao=${codigoVerificacao}&__format=pdf`;
    }
}
