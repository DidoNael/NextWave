import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { logger } from "./request-logger.js";
import crypto from "crypto";

/**
 * Middleware de autenticação por API Key.
 * Espera o header: Authorization: Bearer <api_key>
 * Usa comparação em tempo constante para evitar timing attacks.
 */
export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn(`[API_KEY] Requisição sem header Authorization de ${req.ip}`);
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Autenticação necessária. Inclua o header: Authorization: Bearer <api_key>",
      },
    });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    logger.warn(`[API_KEY] Formato inválido de Authorization de ${req.ip}`);
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Formato inválido. Use: Authorization: Bearer <api_key>",
      },
    });
    return;
  }

  const providedKey = parts[1];

  // Comparação timing-safe: evita que um atacante descubra a chave
  // byte a byte medindo o tempo de resposta
  const expectedBuffer = Buffer.from(config.apiKey, "utf-8");
  const providedBuffer = Buffer.from(providedKey, "utf-8");

  const isValid =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValid) {
    logger.warn(`[API_KEY] Chave inválida fornecida por ${req.ip}`);
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "API Key inválida",
      },
    });
    return;
  }

  next();
}
