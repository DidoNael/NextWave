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
     * Assina um elemento XML identificado por `elementId`.
     * Se o elemento `tagToSign` ainda não tiver `Id="${elementId}"`, ele é adicionado.
     */
    public signXml(xml: string, tagToSign: string, elementId: string): string {
        const privateKeyPem = forge.pki.privateKeyToPem(this.key);
        const certPem = forge.pki.certificateToPem(this.cert);

        // Garantir que o elemento tem o atributo Id correto
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
            `<X509Data><X509Certificate>${this.cleanCert(certPem)}</X509Certificate></X509Data>`;

        sig.computeSignature(xmlToSign, {
            location: {
                reference: `//*[@Id='${elementId}']`,
                action: 'after',
            },
        });

        return sig.getSignedXml();
    }

    private cleanCert(certPem: string): string {
        return certPem
            .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
            .replace(/\s+/g, '');
    }
}
