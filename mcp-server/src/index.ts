import express from "express";
import helmet from "helmet";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { logger, requestLoggerMiddleware } from "./security/request-logger.js";
import { ipWhitelistMiddleware } from "./security/ip-whitelist.js";
import { apiKeyMiddleware } from "./security/api-key.js";
import { rateLimiterMiddleware } from "./security/rate-limiter.js";
import { originValidatorMiddleware } from "./security/origin-validator.js";
import { registerClientTools } from "./tools/clients.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerResources } from "./resources/dashboard.js";
import { randomUUID } from "crypto";

// ═══════════════════════════════════════════
// NextWave CRM — MCP Server
// ═══════════════════════════════════════════

const app = express();

// ── Segurança: Helmet (headers de segurança) ──
app.use(
  helmet({
    contentSecurityPolicy: false, // MCP usa JSON-RPC, não serve HTML
    crossOriginEmbedderPolicy: false,
  })
);

// ── Trust proxy (para obter IP real em Docker/reverse-proxy) ──
app.set("trust proxy", 1);

// ── Parse JSON body ──
app.use(express.json());

// ── Camada 1: Request Logging (ANTES de tudo, para logar inclusive rejeições) ──
app.use(requestLoggerMiddleware);

// ── Health check (sem autenticação, para Docker healthcheck) ──
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ── Camada 2: IP Whitelist ──
app.use("/mcp", ipWhitelistMiddleware);

// ── Camada 3: Origin Validation ──
app.use("/mcp", originValidatorMiddleware);

// ── Camada 4: Rate Limiting ──
app.use("/mcp", rateLimiterMiddleware);

// ── Camada 5: API Key Authentication ──
app.use("/mcp", apiKeyMiddleware);

// ═══════════════════════════════════════════
// MCP Server Setup
// ═══════════════════════════════════════════

// Map de sessões de transporte ativas
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Cria uma nova instância do MCP Server com todas as tools e resources registradas.
 */
function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "NextWave CRM MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Registra todas as tools
  registerClientTools(server);
  registerTransactionTools(server);
  registerProjectTools(server);
  registerCalendarTools(server);

  // Registra todos os resources
  registerResources(server);

  return server;
}

// ── POST /mcp — Handle JSON-RPC messages ──
app.post("/mcp", async (req, res) => {
  try {
    // Verifica se é uma inicialização (sem session ID)
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId) {
      // Nova sessão
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports.set(sessionId, transport);
          logger.info(`[SESSION] Nova sessão criada: ${sessionId}`);
        },
      });

      // Cria novo MCP server para esta sessão
      const server = createMcpServer();
      await server.connect(transport);

      // Lida com a request
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Sessão existente
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32006,
          message: "Sessão não encontrada ou expirada. Inicie uma nova sessão.",
        },
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error("[MCP] Erro ao processar request", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Erro interno do servidor",
        },
      });
    }
  }
});

// ── GET /mcp — SSE stream para notificações server-initiated ──
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Mcp-Session-Id header necessário para SSE",
      },
    });
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({
      jsonrpc: "2.0",
      error: {
        code: -32006,
        message: "Sessão não encontrada",
      },
    });
    return;
  }

  await transport.handleRequest(req, res);
});

// ── DELETE /mcp — Termina sessão ──
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId) {
    res.status(400).json({ error: "Mcp-Session-Id header necessário" });
    return;
  }

  const transport = transports.get(sessionId);
  if (transport) {
    await transport.close();
    transports.delete(sessionId);
    logger.info(`[SESSION] Sessão terminada: ${sessionId}`);
  }

  res.status(200).json({ message: "Sessão terminada" });
});

// ═══════════════════════════════════════════
// Inicialização
// ═══════════════════════════════════════════

app.listen(config.port, config.bindAddress, () => {
  console.log("");
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║     NextWave CRM — MCP Server v1.0.0         ║");
  console.log("╠═══════════════════════════════════════════════╣");
  console.log(`║  Endpoint: http://${config.bindAddress}:${config.port}/mcp`);
  console.log(`║  Health:   http://${config.bindAddress}:${config.port}/health`);
  console.log("╠═══════════════════════════════════════════════╣");
  console.log(`║  IP Whitelist: ${config.allowedIps.join(", ")}`);
  console.log(`║  Rate Limit:   ${config.rateLimit} req/${config.rateWindow}s`);
  console.log(`║  Bind:         ${config.bindAddress}`);
  console.log(`║  Log Level:    ${config.logLevel}`);
  console.log("╚═══════════════════════════════════════════════╝");
  console.log("");

  logger.info("[STARTUP] MCP Server iniciado com sucesso", {
    port: config.port,
    bindAddress: config.bindAddress,
    allowedIps: config.allowedIps,
    rateLimit: `${config.rateLimit}/${config.rateWindow}s`,
  });
});

// ── Graceful Shutdown ──
async function shutdown(signal: string): Promise<void> {
  logger.info(`[SHUTDOWN] Recebido ${signal}. Encerrando...`);

  // Fecha todas as sessões ativas
  for (const [sessionId, transport] of transports) {
    try {
      await transport.close();
      logger.info(`[SHUTDOWN] Sessão fechada: ${sessionId}`);
    } catch {
      // Ignora erros ao fechar sessões
    }
  }
  transports.clear();

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
