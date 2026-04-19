import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export interface McpServerConfig {
  port: number;
  bindAddress: string;
  apiKey: string;
  allowedIps: string[];
  allowedOrigins: string[];
  rateLimit: number;
  rateWindow: number;
  logLevel: "debug" | "info" | "warn" | "error";
  databaseUrl: string;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[MCP CONFIG] Variável de ambiente obrigatória não definida: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: McpServerConfig = {
  port: parseInt(getEnvOrDefault("MCP_PORT", "3001"), 10),
  bindAddress: getEnvOrDefault("MCP_BIND_ADDRESS", "127.0.0.1"),
  apiKey: getEnvOrThrow("MCP_API_KEY"),
  allowedIps: getEnvOrDefault("MCP_ALLOWED_IPS", "127.0.0.1")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
  allowedOrigins: getEnvOrDefault("MCP_ALLOWED_ORIGINS", "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  rateLimit: parseInt(getEnvOrDefault("MCP_RATE_LIMIT", "100"), 10),
  rateWindow: parseInt(getEnvOrDefault("MCP_RATE_WINDOW", "60"), 10),
  logLevel: getEnvOrDefault("MCP_LOG_LEVEL", "info") as McpServerConfig["logLevel"],
  databaseUrl: getEnvOrDefault("DATABASE_URL", "file:../data/prod.db"),
};

// Validações
if (config.port < 1 || config.port > 65535) {
  throw new Error(`[MCP CONFIG] Porta inválida: ${config.port}`);
}

if (config.apiKey.length < 16) {
  console.warn("[MCP CONFIG] ⚠️  API Key muito curta. Use pelo menos 32 caracteres para segurança adequada.");
}

if (config.allowedIps.includes("*")) {
  console.warn("[MCP CONFIG] ⚠️  IP Whitelist está configurada para aceitar TODOS os IPs. Não recomendado em produção.");
}

if (config.bindAddress === "0.0.0.0" && config.allowedIps.includes("*")) {
  console.warn("[MCP CONFIG] ⚠️  PERIGO: Servidor exposto em todas as interfaces SEM restrição de IP!");
}
