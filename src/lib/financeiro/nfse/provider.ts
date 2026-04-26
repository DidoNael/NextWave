/**
 * NfseProvider — Classe abstrata para provedores de NFS-e.
 *
 * Padrão adapter, idêntico ao PaymentGateway em src/lib/payments/gateway.ts.
 * Provedores suportados: "ginfes" (SOAP + certificado A1) e "enotas" (REST SaaS).
 */

export interface NfseEmitirOptions {
    rpsNumero: string;
    rpsSerie: string;
    rpsType: string;
    dataEmissao: string;         // "YYYY-MM-DD"
    valorServicos: number;
    aliquota: number;
    issRetido: string;           // "1"=retido, "2"=não retido
    itemListaServico: string;
    codigoMunicipio: string;
    discriminacao: string;
    prestador: {
        cnpj: string;
        inscricaoMunicipal?: string;
    };
    tomador: {
        cpfCnpj: string;
        razaoSocial: string;
        endereco: string;
        numero: string;
        bairro: string;
        codigoMunicipio: string;
        uf: string;
        cep: string;
        email?: string;
    };
}

export interface NfseEmitirResult {
    erro?: string;
    protocolo?: string;    // protocolo GINFES ou ID interno do provedor SaaS (usado para polling)
    xmlRetorno?: string;   // resposta raw (XML para GINFES, JSON para SaaS)
}

export interface NfseCancelarResult {
    erro?: string;
    xmlRetorno?: string;
}

export interface NfseConsultarResult {
    /** Mapeamento ABRASF:
     *  1 = Não Recebido
     *  2 = Não Processado
     *  3 = Processado com Erro
     *  4 = Processado sem Erro (NFS-e emitida)
     */
    situacao: number;
    nfseNumeros?: string[];
    erro?: string;
    /** Resposta bruta do provedor — usado para extrair campos provider-specific como CodigoVerificacao */
    xmlRetorno?: string;
}

export interface NfseSincronizarResult {
    numeroNfse?: string;
    codigoVerificacao?: string;
    erro?: string;
    xmlRetorno?: string;
}

export abstract class NfseProvider {
    abstract readonly name: string;
    abstract readonly provider: string;

    constructor(protected config: unknown) {}

    /**
     * Emite um único RPS / NFS-e.
     * @param options dados fiscais provider-agnostic
     * @param loteId identificador do lote (usado por GINFES; ignorado por SaaS)
     */
    abstract emitir(
        options: NfseEmitirOptions,
        loteId: string
    ): Promise<NfseEmitirResult>;

    /**
     * Cancela uma NFS-e já emitida.
     */
    abstract cancelar(
        numeroNfse: string,
        codigoMunicipio: string
    ): Promise<NfseCancelarResult>;

    /**
     * Consulta o status de processamento de um lote / NFS-e.
     * @param protocolo protocolo GINFES ou ID interno do provedor SaaS
     */
    abstract consultarLote(
        protocolo: string
    ): Promise<NfseConsultarResult>;

    /**
     * Consulta NFS-e por número de RPS — usado para sincronizar registros já emitidos.
     * Retorna número da nota e código de verificação atualizados do provedor.
     */
    abstract sincronizarPorRps(
        rpsNumero: string,
        rpsSerie: string,
        rpsTipo: string,
    ): Promise<NfseSincronizarResult>;
}
