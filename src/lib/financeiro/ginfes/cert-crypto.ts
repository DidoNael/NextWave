import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'nfse-cert-v1';

function getDerivedKey(): Buffer {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('AUTH_SECRET não configurada — não é possível proteger o certificado');
    return scryptSync(secret, SALT, 32);
}

/**
 * Criptografa o certificado (base64 do .pfx) antes de salvar no banco.
 * Formato do resultado: iv_b64:authTag_b64:dados_b64
 */
export function encryptCert(plainBase64: string): string {
    const key = getDerivedKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainBase64, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Descriptografa o certificado para uso interno no GinfesClient.
 * NUNCA retorne o resultado para o frontend.
 */
export function decryptCert(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) {
        // Dado ainda não criptografado (migração de dados antigos)
        return stored;
    }
    const key = getDerivedKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/** Verifica se o valor já está criptografado pelo nosso padrão */
export function isCertEncrypted(value: string): boolean {
    return value.split(':').length === 3;
}
