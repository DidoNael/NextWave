import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export const generateTwoFactorSecret = (email: string) => {
    const secret = speakeasy.generateSecret({
        name: `NextWave CRM (${email})`,
    });
    return secret;
};

export const verifyTwoFactorToken = (secret: string, token: string) => {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1, // Janela de 30s de tolerância
    });
};

export const generateQRCodeDataURL = async (otpauth_url: string) => {
    try {
        return await QRCode.toDataURL(otpauth_url);
    } catch (err) {
        console.error('Erro ao gerar QR Code:', err);
        return null;
    }
};
