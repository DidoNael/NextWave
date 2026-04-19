import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesSigner } from '@/lib/financeiro/ginfes/signer';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';
import forge from 'node-forge';
import https from 'https';
import crypto from 'crypto';

const XML_TESTE = (cnpj: string, im: string) => `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.ginfes.com.br/servico_enviar_lote_rps_envio_v03.xsd">
  <LoteRps Id="lote999">
    <NumeroLote>999</NumeroLote>
    <Cnpj>${cnpj}</Cnpj>
    <InscricaoMunicipal>${im}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfRps Id="rps999">
          <IdentificacaoRps><Numero>999</Numero><Serie>1</Serie><Tipo>1</Tipo></IdentificacaoRps>
          <DataEmissao>${new Date().toISOString().split('T')[0]}</DataEmissao>
          <NaturezaOperacao>1</NaturezaOperacao>
          <OptanteSimplesNacional>1</OptanteSimplesNacional>
          <IncentivadorCultural>2</IncentivadorCultural>
          <Status>1</Status>
          <Servico>
            <Valores>
              <ValorServicos>1.00</ValorServicos>
              <IssRetido>2</IssRetido>
              <BaseCalculo>1.00</BaseCalculo>
              <Aliquota>0.0215</Aliquota>
            </Valores>
            <ItemListaServico>1.07</ItemListaServico>
            <CodigoMunicipio>3514700</CodigoMunicipio>
            <Discriminacao>TESTE DE DIAGNOSTICO - NAO PROCESSAR</Discriminacao>
          </Servico>
          <Prestador>
            <Cnpj>${cnpj}</Cnpj>
            <InscricaoMunicipal>${im}</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador><CpfCnpj><Cpf>00000000000</Cpf></CpfCnpj></IdentificacaoTomador>
            <RazaoSocial>CONSUMIDOR FINAL TESTE</RazaoSocial>
            <Endereco>
              <Endereco>Rua Teste</Endereco><Numero>1</Numero><Bairro>Centro</Bairro>
              <CodigoMunicipio>3514700</CodigoMunicipio><Uf>SP</Uf><Cep>07000000</Cep>
            </Endereco>
          </Tomador>
        </InfRps>
      </Rps>
    </ListaRps>
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
        xmlAssinado1 = signer.signXml(xmlTeste, 'InfRps', 'rps999');
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
                ? 'https://guarulhos.ginfes.com.br/ServiceGinfesImpl'
                : 'https://homologacao.ginfes.com.br/ServiceGinfesImpl';
            const pfxBuffer = Buffer.from(certBase64, 'base64');
            const senha = config.senhaCertificado ? decryptCert(config.senhaCertificado) : '';

            const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://server.ws.nfe.isscuritiba.com.br">
  <soap:Body><ser:RecepcionarLoteRpsV3><xml><![CDATA[${xmlFinal}]]></xml></ser:RecepcionarLoteRpsV3></soap:Body>
</soap:Envelope>`;

            const resposta = await new Promise<string>((resolve, reject) => {
                const urlObj = new URL(baseUrl);
                const req2 = https.request({
                    hostname: urlObj.hostname, path: urlObj.pathname,
                    method: 'POST',
                    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '"RecepcionarLoteRpsV3"', 'Content-Length': Buffer.byteLength(soapBody, 'utf8') },
                    pfx: pfxBuffer, passphrase: senha, rejectUnauthorized: false,
                    secureOptions: crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
                }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
                req2.on('error', reject);
                req2.write(soapBody, 'utf8');
                req2.end();
            });

            const hasProtocolo = resposta.includes('Protocolo') || resposta.includes('protocolo');
            const hasFault = resposta.includes('faultstring') || resposta.includes('mensagem');
            steps.push({
                step: `Enviar ao Ginfes (${config.ambiente})`,
                ok: hasProtocolo,
                detail: hasFault
                    ? (resposta.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || resposta.match(/<mensagem>(.*?)<\/mensagem>/)?.[1] || 'Fault sem mensagem')
                    : hasProtocolo
                        ? `Protocolo recebido: ${resposta.match(/<Protocolo>(.*?)<\/Protocolo>/)?.[1] || '?'}`
                        : `Resposta inesperada (${resposta.length} bytes): ${resposta.substring(0, 300)}`,
            });
        } catch (e: any) {
            steps.push({ step: `Enviar ao Ginfes (${config.ambiente})`, ok: false, detail: e.message });
        }
    }

    return NextResponse.json({ steps, xmlFinal: xmlFinal!.substring(0, 2000) + (xmlFinal!.length > 2000 ? '\n...(truncado)' : '') });
}
