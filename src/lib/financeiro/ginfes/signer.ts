import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';

export class GinfesSigner {
    private key: forge.pki.PrivateKey;
    private cert: forge.pki.Certificate;

    constructor(pfxBase64: string, password?: string) {
        const pfxDer = forge.util.decode64(pfxBase64);
        const p12Asn1 = forge.asn1.fromDer(pfxDer);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');

        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

        this.key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]![0].key!;
        this.cert = certBags[forge.pki.oids.certBag]![0].cert!;
    }

    /**
     * Assina o elemento `tagToSign` identificado por `Id="${elementId}"`.
     * A assinatura é inserida dentro do elemento (enveloped), antes do fechamento da tag.
     */
    public signXml(xml: string, tagToSign: string, elementId: string): string {
        const privateKeyPem = forge.pki.privateKeyToPem(this.key);
        const certPem = forge.pki.certificateToPem(this.cert);

        // Garantir que o elemento tem o atributo Id
        let xmlToSign = xml;
        if (!xml.includes(`Id="${elementId}"`)) {
            xmlToSign = xml.replace(
                new RegExp(`<${tagToSign}(\\s|>)`),
                `<${tagToSign} Id="${elementId}"$1`
            );
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
            `<X509Data><X509Certificate>${this.cleanCert(certPem)}</X509Certificate></X509Data>`;

        // Assinar sem location — a Signature vai para o root por padrão
        sig.computeSignature(xmlToSign);

        const signedXml = sig.getSignedXml();

        // Extrair o bloco <Signature>...</Signature> gerado
        const sigMatch = signedXml.match(/<Signature[\s\S]*?<\/Signature>/);
        if (!sigMatch) throw new Error('Bloco Signature não encontrado no XML assinado');
        const signatureBlock = sigMatch[0];

        // Remover a Signature do local onde foi inserida pelo xml-crypto
        const withoutSig = signedXml.replace(signatureBlock, '');

        // Inserir a Signature imediatamente antes do fechamento do elemento alvo
        // Usa índice da ÚLTIMA ocorrência para não colidir com elementos aninhados
        const closingTag = `</${tagToSign}>`;
        const lastIdx = withoutSig.lastIndexOf(closingTag);
        if (lastIdx === -1) throw new Error(`Tag de fechamento </${tagToSign}> não encontrada`);

        return (
            withoutSig.substring(0, lastIdx) +
            signatureBlock +
            withoutSig.substring(lastIdx)
        );
    }

    private cleanCert(certPem: string): string {
        return certPem
            .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
            .replace(/\s+/g, '');
    }
}
