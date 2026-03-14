import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../db.js";

/**
 * Registra recursos de leitura (read-only) no MCP Server.
 * Recursos são acessados via URIs no formato crm://
 */
export function registerResources(server: McpServer): void {
  // ── Dashboard Stats ───────────────────────
  server.resource(
    "dashboard-stats",
    "crm://dashboard/stats",
    {
      description: "Estatísticas gerais do CRM: total de clientes, receita, despesa, transações pendentes",
      mimeType: "application/json",
    },
    async () => {
      const [
        totalClients,
        activeClients,
        totalRevenue,
        totalExpense,
        pendingTransactions,
        totalProjects,
        upcomingEvents,
      ] = await Promise.all([
        prisma.client.count(),
        prisma.client.count({ where: { status: "ativo" } }),
        prisma.transaction.aggregate({
          where: { type: "receita", status: "pago" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { type: "despesa", status: "pago" },
          _sum: { amount: true },
        }),
        prisma.transaction.count({ where: { status: "pendente" } }),
        prisma.project.count(),
        prisma.event.count({
          where: {
            startDate: { gte: new Date() },
            status: "agendado",
          },
        }),
      ]);

      const stats = {
        clients: {
          total: totalClients,
          active: activeClients,
          inactive: totalClients - activeClients,
        },
        financial: {
          totalRevenue: totalRevenue._sum.amount || 0,
          totalExpense: totalExpense._sum.amount || 0,
          netProfit: (totalRevenue._sum.amount || 0) - (totalExpense._sum.amount || 0),
          pendingTransactions,
        },
        projects: {
          total: totalProjects,
        },
        events: {
          upcoming: upcomingEvents,
        },
        generatedAt: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: "crm://dashboard/stats",
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }
  );

  // ── Recent Activity ───────────────────────
  server.resource(
    "recent-activity",
    "crm://dashboard/recent-activity",
    {
      description: "Atividade recente: últimos clientes, transações e eventos criados",
      mimeType: "application/json",
    },
    async () => {
      const [recentClients, recentTransactions, recentEvents] = await Promise.all([
        prisma.client.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, name: true, createdAt: true },
        }),
        prisma.transaction.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            description: true,
            amount: true,
            type: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.event.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            startDate: true,
            type: true,
            status: true,
          },
        }),
      ]);

      const activity = {
        recentClients,
        recentTransactions,
        recentEvents,
        generatedAt: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: "crm://dashboard/recent-activity",
            mimeType: "application/json",
            text: JSON.stringify(activity, null, 2),
          },
        ],
      };
    }
  );

  // ── System Config ─────────────────────────
  server.resource(
    "system-config",
    "crm://system/config",
    {
      description: "Configurações do sistema: branding, licença, módulos ativos",
      mimeType: "application/json",
    },
    async () => {
      const [branding, license, modules] = await Promise.all([
        prisma.systemBranding.findUnique({ where: { id: "default" } }),
        prisma.systemLicense.findUnique({
          where: { id: "default" },
          select: { status: true, validUntil: true, customerName: true },
        }),
        prisma.systemModule.findMany({
          select: { key: true, name: true, enabled: true },
        }),
      ]);

      const config = {
        branding: branding
          ? {
              name: branding.name,
              primaryColor: branding.primaryColor,
              supportEmail: branding.supportEmail,
              supportPhone: branding.supportPhone,
            }
          : null,
        license,
        modules,
        generatedAt: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: "crm://system/config",
            mimeType: "application/json",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }
  );
}
