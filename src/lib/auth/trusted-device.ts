import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "nextwave-secret-fallback";
export const TRUSTED_DEVICE_DAYS = 30;

export function generateTrustedDeviceToken(userId: string): string {
    const timestamp = Date.now().toString();
    const mac = crypto
        .createHmac("sha256", SECRET)
        .update(`${userId}:${timestamp}`)
        .digest("hex");
    return `${timestamp}:${mac}`;
}

export function verifyTrustedDeviceToken(token: string, userId: string): boolean {
    try {
        const colonIndex = token.indexOf(":");
        if (colonIndex === -1) return false;
        const timestamp = token.slice(0, colonIndex);
        const mac = token.slice(colonIndex + 1);

        const age = Date.now() - parseInt(timestamp, 10);
        if (isNaN(age) || age < 0 || age > TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000) return false;

        const expectedMac = crypto
            .createHmac("sha256", SECRET)
            .update(`${userId}:${timestamp}`)
            .digest("hex");

        const macBuf = Buffer.from(mac, "hex");
        const expectedBuf = Buffer.from(expectedMac, "hex");
        if (macBuf.length !== expectedBuf.length) return false;

        return crypto.timingSafeEqual(macBuf, expectedBuf);
    } catch {
        return false;
    }
}

export function trustedDeviceCookieName(userId: string): string {
    // Sufixo com os últimos 10 chars do userId para não expor o id completo
    return `nextwave-td-${userId.slice(-10)}`;
}

export function parseCookieValue(cookieHeader: string, name: string): string | null {
    const encoded = encodeURIComponent(name).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
    const regex = new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`);
    const match = cookieHeader.match(regex);
    return match ? decodeURIComponent(match[1]) : null;
}
