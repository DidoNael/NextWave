import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { logger } from "./request-logger.js";
import { normalizeIp } from "./ip-whitelist.js";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpa entradas expiradas a cada 5 minutos para evitar memory leak
setInterval(() => {
  const now = Date.now();
  const windowMs = config.rateWindow * 1000;
  for (const [ip, entry] of rateLimitStore) {
    if (now - entry.windowStart > windowMs * 2) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Middleware de rate limiting por IP usando sliding window.
 * Limita requisições por janela de tempo configurável.
 */
export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIp = normalizeIp(req.ip);
  const now = Date.now();
  const windowMs = config.rateWindow * 1000;

  let entry = rateLimitStore.get(clientIp);

  if (!entry || now - entry.windowStart >= windowMs) {
    // Nova janela
    entry = { count: 1, windowStart: now };
    rateLimitStore.set(clientIp, entry);
  } else {
    entry.count++;
  }

  // Adiciona headers de rate limiting na resposta
  const remaining = Math.max(0, config.rateLimit - entry.count);
  const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);

  res.setHeader("X-RateLimit-Limit", config.rateLimit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", resetTime);

  if (entry.count > config.rateLimit) {
    logger.warn(`[RATE_LIMIT] IP ${clientIp} excedeu o limite de ${config.rateLimit} requests/${config.rateWindow}s`);
    res.status(429).json({
      jsonrpc: "2.0",
      error: {
        code: -32004,
        message: `Rate limit excedido. Tente novamente em ${resetTime} segundos.`,
      },
    });
    return;
  }

  next();
}
