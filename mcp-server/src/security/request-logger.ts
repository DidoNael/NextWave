import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { normalizeIp } from "./ip-whitelist.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger estruturado em JSON para o MCP Server.
 * Registra todas as requisições com informações de segurança.
 */
class McpLogger {
  private level: number;

  constructor(level: LogLevel) {
    this.level = LOG_LEVELS[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    return JSON.stringify(entry);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, meta));
    }
  }
}

export const logger = new McpLogger(config.logLevel);

/**
 * Middleware de logging de requisições.
 * Registra cada request com IP, método, path, status, duração e user-agent.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const clientIp = normalizeIp(req.ip);

  // Intercepta o fim da resposta para logar o resultado
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logData = {
      ip: clientIp,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "unknown",
      contentType: req.headers["content-type"] || "none",
    };

    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.path} → ${res.statusCode}`, logData);
    } else {
      logger.info(`${req.method} ${req.path} → ${res.statusCode}`, logData);
    }
  });

  next();
}
