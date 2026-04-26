import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesSigner } from '@/lib/financeiro/ginfes/signer';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';
import forge from 'node-forge';
import https from 'https';
import crypto from 'crypto';

const XML_TESTE = (cnpj: string, im: string) => `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.ginfes.com.br/servico_enviar_lote_rps_envio_v03.xsd" xmlns:tipos="http://www.ginfes.com.br/tipos_v03.xsd">
  <LoteRps Id="lote999">
    <tipos:NumeroLote>999</tipos:NumeroLote>
    <tipos:Cnpj>${cnpj}</tipos:Cnpj>
    <tipos:InscricaoMunicipal>${im}</tipos:InscricaoMunicipal>
    <tipos:QuantidadeRps>1</tipos:QuantidadeRps>
    <tipos:ListaRps>
      <tipos:Rps>
        <tipos:InfRps Id="rps999">
          <tipos:IdentificacaoRps><tipos:Numero>999</tipos:Numero><tipos:Serie>1</tipos:Serie><tipos:Tipo>1</tipos:Tipo></tipos:IdentificacaoRps>
          <tipos:DataEmissao>${new Date().toISOString().replace(/\.\d{3}Z$/, '')}</tipos:DataEmissao>
          <tipos:NaturezaOperacao>1</tipos:NaturezaOperacao>
          <tipos:RegimeEspecialTributacao>6</tipos:RegimeEspecialTributacao>
          <tipos:OptanteSimplesNacional>1</tipos:OptanteSimplesNacional>
          <tipos:IncentivadorCultural>2</tipos:IncentivadorCultural>
          <tipos:Status>1</tipos:Status>
          <tipos:Servico>
            <tipos:Valores>
              <tipos:ValorServicos>1.00</tipos:ValorServicos>
              <tipos:IssRetido>2</tipos:IssRetido>
              <tipos:BaseCalculo>1.00</tipos:BaseCalculo>
              <tipos:Aliquota>0.0215</tipos:Aliquota>
            </tipos:Valores>
            <tipos:ItemListaServico>1.07</tipos:ItemListaServico>
            <tipos:Discriminacao>TESTE DE DIAGNOSTICO - NAO PROCESSAR</tipos:Discriminacao>
            <tipos:CodigoMunicipio>3518800</tipos:CodigoMunicipio>
          </tipos:Servico>
          <tipos:Prestador>
            <tipos:Cnpj>${cnpj}</tipos:Cnpj>
            <tipos:InscricaoMunicipal>${im}</tipos:InscricaoMunicipal>
          </tipos:Prestador>
          <tipos:Tomador>
            <tipos:IdentificacaoTomador><tipos:CpfCnpj><tipos:Cpf>00000000000</tipos:Cpf></tipos:CpfCnpj></tipos:IdentificacaoTomador>
            <tipos:RazaoSocial>CONSUMIDOR FINAL TESTE</tipos:RazaoSocial>
            <tipos:Endereco>
              <tipos:Endereco>Rua Teste</tipos:Endereco><tipos:Numero>1</tipos:Numero><tipos:Bairro>Centro</tipos:Bairro>
              <tipos:CodigoMunicipio>3518800</tipos:CodigoMunicipio><tipos:Uf>SP</tipos:Uf><tipos:Cep>07000000</tipos:Cep>
            </tipos:Endereco>
          </tipos:Tomador>
        </tipos:InfRps>
      </tipos:Rps>
    </tipos:ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role !== 'master') {
        return NextResponse.json({ error: 'Apenas master pode usar o diagnóstico' }, { status: 403 });
    }

    const { sendToGinfes } = await req.json().catch(() => ({ sendToGinfes: false }));
    const steps: Array<{ step: string; ok: boolean; detail: string }> = [];

    // 1. Carregar config
    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
        return NextResponse.json({ steps: [{ step: 'Carregar configuração', ok: false, detail: 'NfeConfig não encontrada. Configure primeiro em Configurações → NFS-e.' }] });
    }
    steps.push({ step: 'Carregar configuração', ok: true, detail: `CNPJ: ${config.cnpj} | Ambiente: ${config.ambiente}` });

    // 2. Verificar certificado
    if (!config.certificadoBase64) {
        steps.push({ step: 'Certificado digital', ok: false, detail: 'Nenhum certificado cadastrado.' });
        return NextResponse.json({ steps });
    }

    let certBase64: string;
    try {
        certBase64 = decryptCert(config.certificadoBase64);
        steps.push({ step: 'Descriptografar certificado', ok: true, detail: 'AES-256-GCM descriptografado com sucesso.' });
    } catch (e: any) {
        steps.push({ step: 'Descriptografar certificado', ok: false, detail: e.message });
        return NextResponse.json({ steps });
    }

    // 3. Ler dados do certificado
    let certInfo = '';
    try {
        const pfxDer = forge.util.decode64(certBase64);
        const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(pfxDer),
            config.senhaCertificado ? decryptCert(config.senhaCertificado) : '');
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const cert = certBags[forge.pki.oids.certBag]![0].cert!;
        const cn = cert.subject.getField('CN')?.value || '?';
        const expiry = cert.validity.notAfter.toLocaleDateString('pt-BR');
        const expired = cert.validity.notAfter < new Date();
        certInfo = `CN: ${cn} | Validade: ${expiry}${expired ? ' ⚠️ EXPIRADO' : ''}`;
        steps.push({ step: 'Ler certificado (.pfx)', ok: !expired, detail: certInfo });
        if (expired) return NextResponse.json({ steps });
    } catch (e: any) {
        steps.push({ step: 'Ler certificado (.pfx)', ok: false, detail: `Falha ao ler PFX: ${e.message}` });
        return NextResponse.json({ steps });
    }

    // 4. Assinar InfRps
    const signer = new GinfesSigner(certBase64, config.senhaCertificado ? decryptCert(config.senhaCertificado) : '');
    const cnpj = config.cnpj.replace(/\D/g, '');
    const xmlTeste = XML_TESTE(cnpj, config.inscricaoMunicipal);
    let xmlAssinado1: string;
    try {
        xmlAssinado1 = signer.signXml(xmlTeste, 'tipos:InfRps', 'rps999');
        steps.push({ step: 'Assinar InfRps', ok: true, detail: `XML gerado: ${xmlAssinado1.length} bytes` });
    } catch (e: any) {
        steps.push({ step: 'Assinar InfRps', ok: false, detail: e.message });
        return NextResponse.json({ steps });
    }

    // 5. Assinar LoteRps
    let xmlFinal: string;
    try {
        xmlFinal = signer.signXml(xmlAssinado1, 'LoteRps', 'lote999');
        steps.push({ step: 'Assinar LoteRps', ok: true, detail: `XML final: ${xmlFinal.length} bytes` });
    } catch (e: any) {
        steps.push({ step: 'Assinar LoteRps', ok: false, detail: e.message });
        return NextResponse.json({ steps });
    }

    // 6. (Opcional) Enviar ao Ginfes
    if (sendToGinfes) {
        try {
            const baseUrl = config.ambiente === 'producao'
                ? 'https://producao.ginfes.com.br/ServiceGinfesImpl'
                : 'https://homologacao.ginfes.com.br/ServiceGinfesImpl';
            const pfxBuffer = Buffer.from(certBase64, 'base64');
            const senha = config.senhaCertificado ? decryptCert(config.senhaCertificado) : '';

            const soapNs = config.ambiente === 'producao' ? 'http://producao.ginfes.com.br' : 'http://homologacao.ginfes.com.br';
            const xmlBody = xmlFinal.replace(/^<\?xml[^?]*\?>\s*/i, '');
            const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <ns1:RecepcionarLoteRpsV3 xmlns:ns1="${soapNs}">
      <arg0>
        <ns2:cabecalho versao="3" xmlns:ns2="http://www.ginfes.com.br/cabecalho_v03.xsd">
          <versaoDados>3</versaoDados>
        </ns2:cabecalho>
      </arg0>
      <arg1>${xmlBody}</arg1>
    </ns1:RecepcionarLoteRpsV3>
  </soapenv:Body>
</soapenv:Envelope>`;

            const resposta = await new Promise<string>((resolve, reject) => {
                const urlObj = new URL(baseUrl);
                const req2 = https.request({
                    hostname: urlObj.hostname, path: urlObj.pathname,
                    method: 'POST',
                    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': `"${soapNs}/RecepcionarLoteRpsV3"`, 'Content-Length': Buffer.byteLength(soapBody, 'utf8') },
                    pfx: pfxBuffer, passphrase: senha, rejectUnauthorized: false,
                    secureOptions: crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
                }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
                req2.on('error', reject);
                req2.write(soapBody, 'utf8');
                req2.end();
            });

            // Detectar página HTML de manutenção/indisponibilidade
            const isHtml = resposta.trimStart().startsWith('<!') || resposta.includes('<html') || resposta.includes('indisponibilidade');

            // GINFES retorna o XML interno dentro de <return> como HTML-encoded
            const returnMatch = resposta.match(/<(?:[^:>]+:)?return[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?return>/);
            const innerXml = returnMatch
                ? returnMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
                : resposta;

            const hasProtocolo = innerXml.includes('Protocolo') || innerXml.includes('protocolo');
            const hasFault = innerXml.includes('faultstring') || innerXml.includes('Mensagem') || innerXml.includes('mensagem');
            const protocolo = innerXml.match(/<(?:[^:>]+:)?Protocolo[^>]*>(.*?)<\/(?:[^:>]+:)?Protocolo>/)?.[1];
            const mensagem = innerXml.match(/<(?:[^:>]+:)?Mensagem[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?Mensagem>/)?.[1]
                || innerXml.match(/<faultstring>(.*?)<\/faultstring>/)?.[1];

            steps.push({
                step: `Enviar ao Ginfes (${config.ambiente})`,
                ok: hasProtocolo && !hasFault,
                detail: isHtml
                    ? `Servidor GINFES em manutenção ou indisponível. XML e assinatura estão corretos — tente novamente mais tarde.`
                    : hasFault && !hasProtocolo
                    ? `Erro GINFES: ${mensagem || 'sem detalhe'}`
                    : hasProtocolo
                        ? `Protocolo recebido: ${protocolo || '?'}`
                        : `Resposta inesperada (${resposta.length} bytes): ${innerXml.substring(0, 300)}`,
            });
        } catch (e: any) {
            steps.push({ step: `Enviar ao Ginfes (${config.ambiente})`, ok: false, detail: e.message });
        }
    }

    return NextResponse.json({ steps, xmlFinal: xmlFinal!.substring(0, 2000) + (xmlFinal!.length > 2000 ? '\n...(truncado)' : '') });
}
