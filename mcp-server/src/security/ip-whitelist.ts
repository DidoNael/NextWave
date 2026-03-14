import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { logger } from "./request-logger.js";
import net from "net";

/**
 * Verifica se um IP está dentro de um range CIDR.
 * Ex: isIpInCidr("192.168.1.50", "192.168.1.0/24") → true
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  if (!bitsStr) return ip === cidr; // IP exato, sem CIDR

  const bits = parseInt(bitsStr, 10);
  if (bits < 0 || bits > 32) return false;

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  if (ipNum === null || rangeNum === null) return false;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Converte um endereço IPv4 para número inteiro.
 */
function ipToNumber(ip: string): number | null {
  if (!net.isIPv4(ip)) return null;
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Normaliza o endereço IP recebido pelo Express.
 * Express pode retornar IPs em formato IPv6-mapped (::ffff:127.0.0.1).
 */
function normalizeIp(rawIp: string | undefined): string {
  if (!rawIp) return "unknown";
  // Remove prefixo IPv6-mapped
  if (rawIp.startsWith("::ffff:")) {
    return rawIp.substring(7);
  }
  // ::1 é localhost em IPv6
  if (rawIp === "::1") return "127.0.0.1";
  return rawIp;
}

/**
 * Verifica se um IP está na lista de IPs permitidos.
 */
function isIpAllowed(ip: string, allowedList: string[]): boolean {
  // Wildcard → permite tudo
  if (allowedList.includes("*")) return true;

  const normalizedIp = normalizeIp(ip);

  for (const allowed of allowedList) {
    if (allowed.includes("/")) {
      // Range CIDR
      if (isIpInCidr(normalizedIp, allowed)) return true;
    } else {
      // IP exato
      if (normalizedIp === allowed) return true;
    }
  }

  return false;
}

/**
 * Middleware de whitelist de IPs.
 * Bloqueia requisições de IPs que não estão na lista MCP_ALLOWED_IPS.
 */
export function ipWhitelistMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIp = normalizeIp(req.ip);

  if (!isIpAllowed(clientIp, config.allowedIps)) {
    logger.warn(`[IP_WHITELIST] Bloqueado: ${clientIp} não está na lista de IPs permitidos`);
    res.status(403).json({
      jsonrpc: "2.0",
      error: {
        code: -32003,
        message: "Acesso negado: seu IP não está autorizado",
      },
    });
    return;
  }

  next();
}

export { normalizeIp, isIpAllowed, isIpInCidr };
