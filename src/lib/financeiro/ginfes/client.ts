import https from 'https';
import { GinfesSigner } from './signer';
import { generateLoteRpsXml, RpsData } from './templates';

const URL_PROD = 'https://guarulhos.ginfes.com.br/ServiceGinfesImpl';
const URL_HOMOLOG = 'https://guarulhos.ginfesh.com.br/ServiceGinfesImpl';

export interface GinfesClientConfig {
    cnpj: string;
    inscricaoMunicipal: string;
    certificadoBase64: string;
    senhaCertificado?: string;
    ambiente: 'homologacao' | 'producao';
}

function buildSoapEnvelope(operation: string, xmlContent: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://server.ws.nfe.isscuritiba.com.br">
  <soap:Body>
    <ser:${operation}>
      <xml><![CDATA[${xmlContent}]]></xml>
    </ser:${operation}>
  </soap:Body>
</soap:Envelope>`;
}

async function soapCall(
    url: string,
    operation: string,
    xmlContent: string,
    pfxBuffer: Buffer,
    pfxPassword: string
): Promise<string> {
    const body = buildSoapEnvelope(operation, xmlContent);
    const soapAction = `"${operation}"`;

    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options: https.RequestOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': soapAction,
                'Content-Length': Buffer.byteLength(body, 'utf8'),
            },
            pfx: pfxBuffer,
            passphrase: pfxPassword,
            rejectUnauthorized: false, // Ginfes usa cert interno
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.write(body, 'utf8');
        req.end();
    });
}

function extractTagContent(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`));
    return match ? match[1].trim() : null;
}

/** Remove dados sensíveis de objetos de erro antes de logar */
function safeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Erro desconhecido';
}

function parseSoapFault(xml: string): string | null {
    const fault = extractTagContent(xml, 'faultstring') || extractTagContent(xml, 'mensagem');
    return fault;
}

export interface EmitirLoteResult {
    protocolo?: string;
    erro?: string;
    xmlRetorno: string;
}

export interface ConsultarLoteResult {
    situacao?: string; // 1=Não Recebido, 2=Não Processado, 3=Processado c/Erro, 4=Processado s/Erro
    nfseList?: Array<{ numero: string; codigoVerificacao: string }>;
    erro?: string;
    xmlRetorno: string;
}

export interface ConsultarNfseResult {
    nfse?: { numero: string; codigoVerificacao: string; linkDownload?: string };
    erro?: string;
    xmlRetorno: string;
}

export interface CancelarNfseResult {
    sucesso: boolean;
    erro?: string;
    xmlRetorno: string;
}

export class GinfesClient {
    private config: GinfesClientConfig;
    private baseUrl: string;
    private signer: GinfesSigner;
    private pfxBuffer: Buffer;

    constructor(config: GinfesClientConfig) {
        // Não armazenar o certificado em texto — apenas o buffer já convertido
        this.config = { ...config, certificadoBase64: '[REDACTED]', senhaCertificado: '[REDACTED]' };
        this.baseUrl = config.ambiente === 'producao' ? URL_PROD : URL_HOMOLOG;
        this.pfxBuffer = Buffer.from(config.certificadoBase64, 'base64');
        this.signer = new GinfesSigner(config.certificadoBase64, config.senhaCertificado);
    }

    async emitirLote(rpsList: RpsData[], loteId: string): Promise<EmitirLoteResult> {
        const xmlLote = generateLoteRpsXml(loteId, rpsList);
        const xmlAssinado = this.signer.signXml(xmlLote, 'InfRps');
        const xmlLoteAssinado = this.signer.signXml(
            xmlAssinado.replace('<LoteRps', `<LoteRps Id="lote${loteId}"`),
            'LoteRps'
        );

        try {
            const xmlRetorno = await soapCall(
                this.baseUrl,
                'RecepcionarLoteRpsV3',
                xmlLoteAssinado,
                this.pfxBuffer,
                '' // senha já usada no signer; pfx não precisa da senha aqui
            );

            const fault = parseSoapFault(xmlRetorno);
            if (fault) return { erro: fault, xmlRetorno };

            const protocolo = extractTagContent(xmlRetorno, 'Protocolo') ||
                extractTagContent(xmlRetorno, 'protocolo');

            return { protocolo: protocolo || undefined, xmlRetorno };
        } catch (err) {
            console.error('[GINFES_EMITIR_ERROR]', safeError(err));
            throw new Error(`Erro ao comunicar com Ginfes: ${safeError(err)}`);
        }
    }

    async consultarSituacaoLote(protocolo: string): Promise<ConsultarLoteResult> {
        const xmlConsulta = `<?xml version="1.0" encoding="UTF-8"?>
<ConsultarSituacaoLoteRpsEnvio xmlns="http://www.ginfes.com.br/servico_consultar_situacao_lote_rps_envio_v03.xsd">
  <Prestador>
    <Cnpj>${this.config.cnpj}</Cnpj>
    <InscricaoMunicipal>${this.config.inscricaoMunicipal}</InscricaoMunicipal>
  </Prestador>
  <Protocolo>${protocolo}</Protocolo>
</ConsultarSituacaoLoteRpsEnvio>`;

        const xmlAssinado = this.signer.signXml(xmlConsulta, 'ConsultarSituacaoLoteRpsEnvio');
        const xmlRetorno = await soapCall(
            this.baseUrl,
            'ConsultarSituacaoLoteRpsV3',
            xmlAssinado,
            this.pfxBuffer,
            this.config.senhaCertificado || ''
        );

        const fault = parseSoapFault(xmlRetorno);
        if (fault) return { erro: fault, xmlRetorno };

        const situacao = extractTagContent(xmlRetorno, 'Situacao');

        // Extrair lista de NFS-e se processado com sucesso
        const nfseList: Array<{ numero: string; codigoVerificacao: string }> = [];
        const nfseRegex = /<Nfse>([\s\S]*?)<\/Nfse>/g;
        let nfseMatch: RegExpExecArray | null;
        while ((nfseMatch = nfseRegex.exec(xmlRetorno)) !== null) {
            const inner = nfseMatch[1];
            const numero = extractTagContent(inner, 'Numero') || '';
            const codigo = extractTagContent(inner, 'CodigoVerificacao') || '';
            if (numero) nfseList.push({ numero, codigoVerificacao: codigo });
        }

        return { situacao: situacao || undefined, nfseList, xmlRetorno };
    }

    async consultarNfsePorRps(rpsNumero: string, rpsSerie: string, rpsTipo: string = '1'): Promise<ConsultarNfseResult> {
        const xmlConsulta = `<?xml version="1.0" encoding="UTF-8"?>
<ConsultarNfsePorRpsEnvio xmlns="http://www.ginfes.com.br/servico_consultar_nfse_rps_envio_v03.xsd">
  <IdentificacaoRps>
    <Numero>${rpsNumero}</Numero>
    <Serie>${rpsSerie}</Serie>
    <Tipo>${rpsTipo}</Tipo>
  </IdentificacaoRps>
  <Prestador>
    <Cnpj>${this.config.cnpj}</Cnpj>
    <InscricaoMunicipal>${this.config.inscricaoMunicipal}</InscricaoMunicipal>
  </Prestador>
</ConsultarNfsePorRpsEnvio>`;

        const xmlAssinado = this.signer.signXml(xmlConsulta, 'ConsultarNfsePorRpsEnvio');
        const xmlRetorno = await soapCall(
            this.baseUrl,
            'ConsultarNfsePorRpsV3',
            xmlAssinado,
            this.pfxBuffer,
            this.config.senhaCertificado || ''
        );

        const fault = parseSoapFault(xmlRetorno);
        if (fault) return { erro: fault, xmlRetorno };

        const numero = extractTagContent(xmlRetorno, 'Numero');
        const codigoVerificacao = extractTagContent(xmlRetorno, 'CodigoVerificacao');
        const linkDownload = extractTagContent(xmlRetorno, 'OutrasInformacoes') || undefined;

        if (!numero) return { erro: 'NFS-e não encontrada', xmlRetorno };

        return { nfse: { numero, codigoVerificacao: codigoVerificacao || '', linkDownload }, xmlRetorno };
    }

    async cancelarNfse(numeroNfse: string, codigoMunicipio: string): Promise<CancelarNfseResult> {
        const xmlCancelamento = `<?xml version="1.0" encoding="UTF-8"?>
<CancelarNfseEnvio xmlns="http://www.ginfes.com.br/servico_cancelar_nfse_envio_v03.xsd">
  <Pedido>
    <InfPedidoCancelamento Id="canc${numeroNfse}">
      <IdentificacaoNfse>
        <Numero>${numeroNfse}</Numero>
        <Cnpj>${this.config.cnpj}</Cnpj>
        <InscricaoMunicipal>${this.config.inscricaoMunicipal}</InscricaoMunicipal>
        <CodigoMunicipio>${codigoMunicipio}</CodigoMunicipio>
      </IdentificacaoNfse>
      <CodigoCancelamento>1</CodigoCancelamento>
    </InfPedidoCancelamento>
  </Pedido>
</CancelarNfseEnvio>`;

        const xmlAssinado = this.signer.signXml(xmlCancelamento, 'InfPedidoCancelamento');
        const xmlRetorno = await soapCall(
            this.baseUrl,
            'CancelarNfseV3',
            xmlAssinado,
            this.pfxBuffer,
            this.config.senhaCertificado || ''
        );

        const fault = parseSoapFault(xmlRetorno);
        if (fault) return { sucesso: false, erro: fault, xmlRetorno };

        const sucesso = xmlRetorno.includes('NfseCancelamento') || xmlRetorno.includes('Sucesso');
        return { sucesso, xmlRetorno };
    }
}
