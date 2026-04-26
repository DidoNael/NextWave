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
            numero:           options.rpsNumero,
            serie:            options.rpsSerie,
            tipo:             options.rpsType,
            dataEmissao:      options.dataEmissao,
            valorServicos:    options.valorServicos,
            aliquota:         options.aliquota,
            issRetido:        options.issRetido,
            itemListaServico: options.itemListaServico,
            codigoMunicipio:  options.codigoMunicipio,
            discriminacao:    options.discriminacao,
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
        const nfseNumeros = result.nfseList?.map(n => n.numero);

        return {
            situacao:    situacaoNum,
            nfseNumeros: nfseNumeros?.length ? nfseNumeros : undefined,
            // xmlRetorno contém <CodigoVerificacao> — extraído pela rota de consulta
            xmlRetorno:  result.xmlRetorno,
        };
    }
}
