import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'nextwave-secret-v1';

function getDerivedKey(): Buffer {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only";
    return scryptSync(secret, SALT, 32);
}

/**
 * Criptografa uma string sensível (senha, token, chave de API) antes de salvar no banco.
 * Formato: iv_b64:authTag_b64:dados_b64
 */
export function encrypt(text: string): string {
    if (!text) return '';
    const key = getDerivedKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Descriptografa uma string sensível recuperada do banco.
 */
export function decrypt(stored: string): string {
    if (!stored) return '';
    
    const parts = stored.split(':');
    if (parts.length !== 3) {
        // Assume que não está criptografado (compatibilidade com dados legados)
        return stored;
    }
    
    try {
        const key = getDerivedKey();
        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encrypted = Buffer.from(parts[2], 'base64');
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch (e) {
        console.error('[CRYPTO_DECRYPT_ERROR]', e);
        return stored; // Se falhar, retorna o original (pode ser dado antigo ou erro de chave)
    }
}

/** Verifica se o valor parece estar criptografado pelo nosso padrão */
export function isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    return value.split(':').length === 3;
}
