import forge from 'node-forge';
import { DOMParser } from '@xmldom/xmldom';
import { ExclusiveCanonicalization } from 'xml-crypto';
import crypto from 'crypto';

export class GinfesSigner {
    private key: forge.pki.PrivateKey;
    private cert: forge.pki.Certificate;

    constructor(pfxBase64: string, password?: string) {
        const pfxDer = forge.util.decode64(pfxBase64);
        const p12Asn1 = forge.asn1.fromDer(pfxDer);

        let p12: forge.pkcs12.Pkcs12Pfx;
        const pass = password || '';
        try {
            // Tentativa 1 — strict (padrão, exige MAC SHA-1)
            p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pass);
        } catch (e1: any) {
            if (!e1?.message?.toLowerCase().includes('mac')) throw e1;
            try {
                // Tentativa 2 — strict=false (ignora falha de MAC; cobre SHA-256 em algumas versões do forge)
                p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pass);
            } catch (e2: any) {
                // Tentativa 3 — senha vazia (PFX sem senha salvo com senha em branco)
                if (pass !== '') {
                    try {
                        p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '');
                    } catch {
                        throw new Error(
                            'Não foi possível abrir o certificado PFX. ' +
                            'Verifique se a senha está correta e se o certificado ' +
                            'está no formato legado (3DES/SHA-1). ' +
                            'Se exportado com OpenSSL moderno, re-exporte com: ' +
                            'openssl pkcs12 -legacy -in cert.pfx -out temp.pem && ' +
                            'openssl pkcs12 -legacy -export -in temp.pem -out cert_legacy.pfx'
                        );
                    }
                } else {
                    throw new Error(
                        'Não foi possível abrir o certificado PFX (mac verify failure). ' +
                        'Re-exporte o certificado no formato legado: ' +
                        'openssl pkcs12 -legacy -in cert.pfx -out temp.pem && ' +
                        'openssl pkcs12 -legacy -export -in temp.pem -out cert_legacy.pfx'
                    );
                }
            }
        }

        const keyBags = p12!.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const certBags = p12!.getBags({ bagType: forge.pki.oids.certBag });

        this.key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]![0].key!;
        this.cert = certBags[forge.pki.oids.certBag]![0].cert!;
    }

    /**
     * Assina o elemento `tagToSign` identificado por `Id="${elementId}"`.
     * @param insertAfterClose Se true, a Signature é inserida APÓS </tagToSign>
     *   (enveloped no pai) — padrão GINFES para InfRps e LoteRps.
     *   Se false (padrão legado), a Signature vai dentro do elemento assinado.
     */
    public signXml(xml: string, tagToSign: string, elementId: string, insertAfterClose = true): string {
        const privateKeyPem = forge.pki.privateKeyToPem(this.key);
        const certPem = forge.pki.certificateToPem(this.cert);
        const certContent = this.cleanCert(certPem);

        // 1. Garantir que o elemento-alvo tem o atributo Id
        let xmlToSign = xml;
        if (!xml.includes(`Id="${elementId}"`)) {
            xmlToSign = xml.replace(
                new RegExp(`<${tagToSign}(\\s|>)`),
                `<${tagToSign} Id="${elementId}"$1`
            );
        }

        // 2. Parsear o XML e encontrar o elemento pelo Id
        const doc = new DOMParser().parseFromString(xmlToSign, 'text/xml');
        const elemToSign = this.findById(doc, elementId);
        if (!elemToSign) throw new Error(`Elemento com Id="${elementId}" não encontrado`);

        // 3. Coletar namespaces de ancestors (necessário para Exc-C14N correto)
        const ancestorNamespaces = this.collectAncestorNamespaces(elemToSign);

        // 4. Canonicalizar o elemento (Exc-C14N)
        const c14n = new ExclusiveCanonicalization();
        const canonElem: string = (c14n as any).process(elemToSign, { ancestorNamespaces });

        // 5. Digest SHA1 do elemento canonicalizado
        const digest = crypto.createHash('sha1')
            .update(Buffer.from(canonElem, 'utf8'))
            .digest('base64');

        // 6. Construir SignedInfo (com xmlns para canonicalização standalone)
        const signedInfoXml = [
            `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`,
            `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>`,
            `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>`,
            `<Reference URI="#${elementId}">`,
            `<Transforms>`,
            `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>`,
            `<Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>`,
            `</Transforms>`,
            `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>`,
            `<DigestValue>${digest}</DigestValue>`,
            `</Reference>`,
            `</SignedInfo>`,
        ].join('');

        // 7. Canonicalizar o SignedInfo para assinar
        const siDoc = new DOMParser().parseFromString(signedInfoXml, 'text/xml');
        const canonSI: string = (c14n as any).process(siDoc.documentElement, {});

        // 8. Assinar o SignedInfo canonicalizado com RSA-SHA1
        const sigValue = crypto.createSign('SHA1')
            .update(Buffer.from(canonSI, 'utf8'))
            .sign(privateKeyPem, 'base64');

        // 9. Montar bloco <Signature> completo
        // SignedInfo sem xmlns redundante (Signature pai já declara)
        const signedInfoInner = signedInfoXml.replace(
            `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`,
            `<SignedInfo>`
        );
        const signatureBlock = [
            `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">`,
            signedInfoInner,
            `<SignatureValue>${sigValue}</SignatureValue>`,
            `<KeyInfo><X509Data><X509Certificate>${certContent}</X509Certificate></X509Data></KeyInfo>`,
            `</Signature>`,
        ].join('');

        // 10. Inserir Signature
        const closingTag = `</${tagToSign}>`;
        const lastIdx = xmlToSign.lastIndexOf(closingTag);
        if (lastIdx === -1) throw new Error(`Tag </${tagToSign}> não encontrada`);

        if (insertAfterClose) {
            // Signature vai APÓS o fechamento do elemento (padrão GINFES)
            const afterClose = lastIdx + closingTag.length;
            return (
                xmlToSign.substring(0, afterClose) +
                signatureBlock +
                xmlToSign.substring(afterClose)
            );
        }

        return (
            xmlToSign.substring(0, lastIdx) +
            signatureBlock +
            xmlToSign.substring(lastIdx)
        );
    }

    /** Localiza elemento com atributo Id="id" em qualquer namespace */
    private findById(doc: any, id: string): any {
        const all = doc.getElementsByTagName('*');
        for (let i = 0; i < all.length; i++) {
            if (all[i].getAttribute('Id') === id) return all[i];
        }
        return null;
    }

    /**
     * Coleta declarações de namespace de todos os ancestors do elemento.
     * Necessário para Exc-C14N incluir corretamente namespaces herdados.
     */
    private collectAncestorNamespaces(elem: any): Array<{ prefix: string; namespaceURI: string }> {
        const seen = new Set<string>();
        const ns: Array<{ prefix: string; namespaceURI: string }> = [];
        let node = elem.parentNode;
        while (node && node.nodeType === 1) {
            const attrs = node.attributes || [];
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if (attr.name === 'xmlns') {
                    if (!seen.has('')) { seen.add(''); ns.push({ prefix: '', namespaceURI: attr.value }); }
                } else if (attr.name.startsWith('xmlns:')) {
                    const prefix = attr.name.slice(6);
                    if (!seen.has(prefix)) { seen.add(prefix); ns.push({ prefix, namespaceURI: attr.value }); }
                }
            }
            node = node.parentNode;
        }
        return ns;
    }

    private cleanCert(certPem: string): string {
        return certPem
            .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
            .replace(/\s+/g, '');
    }
}
