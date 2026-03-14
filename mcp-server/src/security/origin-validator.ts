import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { logger } from "./request-logger.js";

/**
 * Middleware de validação do header Origin.
 * Protege contra ataques de DNS rebinding conforme especificação MCP.
 * 
 * Quando um host malicioso faz DNS rebinding para apontar para localhost,
 * o header Origin ainda contém o domínio original, permitindo detectar o ataque.
 */
export function originValidatorMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Se a configuração permite todas as origens, pula validação
  if (config.allowedOrigins.includes("*")) {
    next();
    return;
  }

  const origin = req.headers.origin;

  // Se não há header Origin (ex: requests diretas via curl, ferramentas CLI),
  // permitimos pois essas requests já são filtradas por IP e API Key
  if (!origin) {
    next();
    return;
  }

  const isAllowed = config.allowedOrigins.some((allowed) => {
    // Match exato
    if (origin === allowed) return true;
    // Match por domínio (ex: "*.example.com" matches "sub.example.com")
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(1); // ".example.com"
      return origin.endsWith(domain) || origin === `https://${allowed.slice(2)}` || origin === `http://${allowed.slice(2)}`;
    }
    return false;
  });

  if (!isAllowed) {
    logger.warn(`[ORIGIN] Origem não permitida: ${origin} de ${req.ip}`);
    res.status(403).json({
      jsonrpc: "2.0",
      error: {
        code: -32005,
        message: "Origem não autorizada",
      },
    });
    return;
  }

  next();
}
