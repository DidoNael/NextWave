/**
 * Script de teste rápido da assinatura XML Ginfes
 * Uso: node scripts/test-nfse-sign.mjs <caminho-do-pfx> <senha>
 *
 * Exemplo:
 *   node scripts/test-nfse-sign.mjs /tmp/cert.pfx minha-senha
 */
import { readFileSync } from 'fs';
import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';

const [, , pfxPath, password = ''] = process.argv;

if (!pfxPath) {
    console.error('Uso: node scripts/test-nfse-sign.mjs <caminho.pfx> [senha]');
    process.exit(1);
}

const pfxBuffer = readFileSync(pfxPath);
const pfxBase64 = pfxBuffer.toString('base64');

// --- Carregar certificado ---
const pfxDer = forge.util.decode64(pfxBase64);
const p12Asn1 = forge.asn1.fromDer(pfxDer);
const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
const cert = certBags[forge.pki.oids.certBag][0].cert;

console.log('✓ Certificado carregado');
console.log('  CN:', cert.subject.getField('CN')?.value);
console.log('  Válido até:', cert.validity.notAfter.toLocaleDateString('pt-BR'));

// --- Testar assinatura ---
const privateKeyPem = forge.pki.privateKeyToPem(key);
const certPem = forge.pki.certificateToPem(cert);

const xmlTeste = `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.ginfes.com.br/servico_enviar_lote_rps_envio_v03.xsd">
  <LoteRps Id="lote123">
    <NumeroLote>123</NumeroLote>
    <Cnpj>64957669000159</Cnpj>
    <InscricaoMunicipal>771945</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfRps Id="rps1">
          <IdentificacaoRps><Numero>1</Numero><Serie>1</Serie><Tipo>1</Tipo></IdentificacaoRps>
          <DataEmissao>2026-03-28</DataEmissao>
          <NaturezaOperacao>1</NaturezaOperacao>
          <OptanteSimplesNacional>1</OptanteSimplesNacional>
          <IncentivadorCultural>2</IncentivadorCultural>
          <Status>1</Status>
          <Servico>
            <Valores>
              <ValorServicos>800.00</ValorServicos>
              <IssRetido>2</IssRetido>
              <BaseCalculo>800.00</BaseCalculo>
              <Aliquota>0.0215</Aliquota>
            </Valores>
            <ItemListaServico>1.07</ItemListaServico>
            <CodigoMunicipio>3514700</CodigoMunicipio>
            <Discriminacao>Consultoria em TI</Discriminacao>
          </Servico>
          <Prestador>
            <Cnpj>64957669000159</Cnpj>
            <InscricaoMunicipal>771945</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador><CpfCnpj><Cpf>12345678901</Cpf></CpfCnpj></IdentificacaoTomador>
            <RazaoSocial>Cliente Teste</RazaoSocial>
            <Endereco>
              <Endereco>Rua Teste</Endereco><Numero>123</Numero><Bairro>Centro</Bairro>
              <CodigoMunicipio>3514700</CodigoMunicipio><Uf>SP</Uf><Cep>07000000</Cep>
            </Endereco>
          </Tomador>
        </InfRps>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;

function signXml(xml, tagToSign, elementId) {
    const idPattern = new RegExp(`<${tagToSign}(\\s[^>]*)?>`);
    let xmlToSign = xml;
    if (!xml.includes(`Id="${elementId}"`)) {
        xmlToSign = xml.replace(idPattern, `<${tagToSign} Id="${elementId}"$1>`);
    }

    const sig = new SignedXml({
        canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
        signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
        privateKey: Buffer.from(privateKeyPem),
        publicCert: Buffer.from(certPem),
        idAttribute: 'Id',
    });

    sig.addReference({
        uri: `#${elementId}`,
        transforms: [
            'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
            'http://www.w3.org/2001/10/xml-exc-c14n#',
        ],
        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    });

    sig.getKeyInfoContent = () =>
        `<X509Data><X509Certificate>${certPem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '')}</X509Certificate></X509Data>`;

    sig.computeSignature(xmlToSign, {
        location: {
            reference: `//*[local-name(.)='${tagToSign}']`,
            action: 'append',
        },
    });

    return sig.getSignedXml();
}

try {
    const xml1 = signXml(xmlTeste, 'InfRps', 'rps1');
    console.log('✓ InfRps assinado com sucesso');

    const xml2 = signXml(xml1, 'LoteRps', 'lote123');
    console.log('✓ LoteRps assinado com sucesso');
    console.log('\n✅ Assinatura XML funcionando corretamente!\n');
    console.log('Tamanho do XML final:', xml2.length, 'bytes');
} catch (err) {
    console.error('❌ Erro na assinatura:', err.message);
    process.exit(1);
}
