import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
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
     * Assina o elemento `tagToSign` identificado por `Id="${elementId}"` usando
     * xml-crypto SignedXml.
     *
     * @param insertAfterClose Se true, a Signature é inserida como último filho do PAI
     *   do elemento assinado (padrão GINFES: InfRps e LoteRps).
     */
    public signXml(xml: string, tagToSign: string, elementId: string, insertAfterClose = false): string {
        // 1. Minificar o XML para evitar problemas de espaços em branco com C14N
        const minifiedXml = xml.replace(/>\s+</g, '><').trim();

        // 2. Garantir que o elemento-alvo tem o atributo Id
        let xmlToSign = minifiedXml;
        if (!xmlToSign.includes(`Id="${elementId}"`)) {
            const escaped = tagToSign.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(':', '\\:');
            xmlToSign = xmlToSign.replace(
                new RegExp(`(<${escaped})(\\s[^>]*)?(>|/>)`),
                `$1 Id="${elementId}"$2$3`
            );
        }

        // 3. Configurar SignedXml (xml-crypto 6.x usa opções nativas para prefixos)
        const sig = new SignedXml({
            privateKey: this.keyPem,
            publicCert: this.certPem,
            idAttribute: 'Id',
            signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
            canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
        });

        // 4. Adicionar referência com transforms padrão ABRASF/GINFES
        sig.addReference({
            xpath: `//*[@Id='${elementId}']`,
            transforms: [
                'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
                'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
            ],
            digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
        });

        // 5. Definir onde inserir a Signature
        const locationRef = insertAfterClose
            ? `//*[@Id='${elementId}']/..`
            : `//*[@Id='${elementId}']`;

        // 6. Computar assinatura com prefixo 'ds' nativo
        sig.computeSignature(xmlToSign, {
            location: { reference: locationRef, action: 'append' },
            prefix: 'ds'
        });

        return sig.getSignedXml();
    }



}
