import forge from 'node-forge';
import { DOMParser } from '@xmldom/xmldom';
import { ExclusiveCanonicalization } from 'xml-crypto';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class GinfesSigner {
    private keyPem: string;
    private certPem: string;

    constructor(pfxBase64: string, password?: string) {
        const pfxBuffer = Buffer.from(pfxBase64, 'base64');
        const pass = password || '';

        // Tentativa 1 e 2: node-forge (strict=true, depois strict=false)
        const forgeResult = this.tryForge(pfxBase64, pass);
        if (forgeResult) {
            this.keyPem  = forgeResult.keyPem;
            this.certPem = forgeResult.certPem;
            return;
        }

        // Tentativa 3: openssl nativo do sistema (suporta todos os formatos)
        const opensslResult = this.tryOpenssl(pfxBuffer, pass);
        if (opensslResult) {
            this.keyPem  = opensslResult.keyPem;
            this.certPem = opensslResult.certPem;
            return;
        }

        throw new Error(
            'Não foi possível abrir o certificado PFX. ' +
            'Verifique a senha ou re-exporte no formato legado:\n' +
            'openssl pkcs12 -legacy -in cert.pfx -out tmp.pem\n' +
            'openssl pkcs12 -legacy -export -in tmp.pem -out cert_legacy.pfx'
        );
    }

    private tryForge(pfxBase64: string, pass: string): { keyPem: string; certPem: string } | null {
        try {
            const pfxDer  = forge.util.decode64(pfxBase64);
            const p12Asn1 = forge.asn1.fromDer(pfxDer);

            let p12: forge.pkcs12.Pkcs12Pfx;
            try {
                p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pass);
            } catch {
                // strict=false ignora falha de MAC — cobre SHA-256 em versões mais recentes do forge
                p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pass);
            }

            const keyBags  = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

            const key  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]![0].key!;
            const cert = certBags[forge.pki.oids.certBag]![0].cert!;

            return {
                keyPem:  forge.pki.privateKeyToPem(key),
                certPem: forge.pki.certificateToPem(cert),
            };
        } catch {
            return null;
        }
    }

    private tryOpenssl(pfxBuffer: Buffer, pass: string): { keyPem: string; certPem: string } | null {
        const tmpPfx = join(tmpdir(), `ginfes_${Date.now()}_${Math.random().toString(36).slice(2)}.pfx`);
        try {
            writeFileSync(tmpPfx, pfxBuffer);

            // Passa senha via variável de ambiente para evitar command injection
            const env = { ...process.env, GINFES_PFX_PASS: pass };
            const opts = { env, timeout: 10_000 };

            const keyPem = execSync(
                `openssl pkcs12 -in "${tmpPfx}" -nocerts -nodes -passin env:GINFES_PFX_PASS`,
                opts
            ).toString();

            const certPem = execSync(
                `openssl pkcs12 -in "${tmpPfx}" -nokeys -clcerts -passin env:GINFES_PFX_PASS`,
                opts
            ).toString();

            if (!keyPem.includes('PRIVATE KEY') || !certPem.includes('CERTIFICATE')) return null;

            return { keyPem, certPem };
        } catch {
            return null;
        } finally {
            try { unlinkSync(tmpPfx); } catch { /* ignora */ }
        }
    }

    /**
     * Assina o elemento `tagToSign` identificado por `Id="${elementId}"`.
     * @param insertAfterClose Se true, a Signature é inserida APÓS </tagToSign>
     *   (enveloped no pai) — padrão GINFES para InfRps e LoteRps.
     *   Se false (padrão legado), a Signature vai dentro do elemento assinado.
     */
    public signXml(xml: string, tagToSign: string, elementId: string, insertAfterClose = true): string {
        const certContent = this.cleanCert(this.certPem);

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
            .sign(this.keyPem, 'base64');

        // 9. Montar bloco <Signature> completo
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
