/**
 * EnotasAdapter — integração REST com eNotas (app.enotas.com.br).
 *
 * eNotas é um SaaS de NFS-e que suporta 60+ municípios brasileiros.
 * Não requer certificado digital local — autenticação via API Key.
 *
 * Docs: https://enotas.com.br/blog/api-nfe/
 * Base URL: https://api.enotas.com.br
 * Auth: Basic base64(`${apiKey}:`)
 */

import {
    NfseProvider,
    NfseEmitirOptions,
    NfseEmitirResult,
    NfseCancelarResult,
    NfseConsultarResult,
} from '../provider';

export interface EnotasConfig {
    apiKey:    string;
    empresaId: string;
    ambiente:  'homologacao' | 'producao';
}

// Mapeamento de status eNotas → código ABRASF (situacao numérica)
// eNotas statuses: "Aguardando", "Autorizada", "Cancelada", "Erro", "Negada"
const ENOTAS_STATUS_MAP: Record<string, number> = {
    Aguardando: 2, // Não Processado
    Autorizada: 4, // Processado sem erro
    Cancelada:  4, // Terminal (já processado)
    Erro:       3, // Processado com erro
    Negada:     3, // Processado com erro / recusado
};

export class EnotasAdapter extends NfseProvider {
    readonly name = 'eNotas';
    readonly provider = 'enotas';

    private readonly baseUrl = 'https://api.enotas.com.br';
    private readonly headers: Record<string, string>;
    private readonly empresaId: string;
    private readonly ambiente: string;

    constructor(config: EnotasConfig) {
        super(config);
        this.empresaId = config.empresaId;
        this.ambiente  = config.ambiente;
        // eNotas usa Basic Auth onde a senha é a própria API Key e o usuário fica vazio
        const basicToken = Buffer.from(`${config.apiKey}:`).toString('base64');
        this.headers = {
            'Content-Type':  'application/json',
            'Authorization': `Basic ${basicToken}`,
        };
    }

    async emitir(options: NfseEmitirOptions, _loteId: string): Promise<NfseEmitirResult> {
        const payload = {
            ambienteEmissao: this.ambiente === 'producao' ? 'Producao' : 'Homologacao',
            externalId:      options.rpsNumero,
            dataCompetencia: options.dataEmissao,
            servico: {
                discriminacao:    options.discriminacao,
                valorServicos:    options.valorServicos,
                aliquotaIss:      options.aliquota,
                issRetido:        options.issRetido === '1',
                itemListaServico: options.itemListaServico,
                codigoMunicipio:  options.codigoMunicipio,
            },
            prestador: {
                cnpj:               options.prestador.cnpj,
                inscricaoMunicipal: options.prestador.inscricaoMunicipal,
            },
            tomador: {
                cpfCnpj:     options.tomador.cpfCnpj,
                razaoSocial: options.tomador.razaoSocial,
                email:       options.tomador.email,
                endereco: {
                    logradouro:      options.tomador.endereco,
                    numero:          options.tomador.numero,
                    bairro:          options.tomador.bairro,
                    codigoMunicipio: options.tomador.codigoMunicipio,
                    uf:              options.tomador.uf,
                    cep:             options.tomador.cep,
                },
            },
        };

        try {
            const response = await fetch(
                `${this.baseUrl}/v1/empresas/${this.empresaId}/nfse`,
                { method: 'POST', headers: this.headers, body: JSON.stringify(payload) }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errMsg = data?.mensagem || data?.message || `eNotas HTTP ${response.status}`;
                return { erro: errMsg, xmlRetorno: JSON.stringify(data) };
            }

            // eNotas retorna { id, status, numero, ... }
            // Guardamos o `id` interno no campo `protocolo` — serve como handle de polling
            return {
                protocolo:  data.id,
                xmlRetorno: JSON.stringify(data),
            };
        } catch (err: any) {
            throw new Error(`Erro ao comunicar com eNotas: ${err?.message ?? 'desconhecido'}`);
        }
    }

    async cancelar(numeroNfse: string, _codigoMunicipio: string): Promise<NfseCancelarResult> {
        try {
            const response = await fetch(
                `${this.baseUrl}/v1/empresas/${this.empresaId}/nfse/${numeroNfse}`,
                { method: 'DELETE', headers: this.headers }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errMsg = data?.mensagem || data?.message || `eNotas HTTP ${response.status}`;
                return { erro: errMsg, xmlRetorno: JSON.stringify(data) };
            }

            return { xmlRetorno: JSON.stringify(data) };
        } catch (err: any) {
            throw new Error(`Erro ao cancelar no eNotas: ${err?.message ?? 'desconhecido'}`);
        }
    }

    async consultarLote(protocolo: string): Promise<NfseConsultarResult> {
        // `protocolo` contém o `id` interno retornado pelo eNotas na emissão
        try {
            const response = await fetch(
                `${this.baseUrl}/v1/empresas/${this.empresaId}/nfse/${protocolo}`,
                { method: 'GET', headers: this.headers }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errMsg = data?.mensagem || data?.message || `eNotas HTTP ${response.status}`;
                return { situacao: 1, erro: errMsg };
            }

            const situacao    = ENOTAS_STATUS_MAP[data.status] ?? 2;
            const nfseNumeros = data.numero ? [String(data.numero)] : undefined;

            return {
                situacao,
                nfseNumeros,
                xmlRetorno: JSON.stringify(data),
            };
        } catch (err: any) {
            return {
                situacao: 1,
                erro:     `Erro ao consultar eNotas: ${err?.message ?? 'desconhecido'}`,
            };
        }
    }
}
