import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";

/**
 * Registra ferramentas de gerenciamento da agenda/calendário.
 */
export function registerCalendarTools(server: McpServer): void {
  // ── list_events ───────────────────────────
  server.tool(
    "list_events",
    "Lista eventos da agenda com filtros de período, tipo e status",
    {
      startDate: z.string().optional().describe("Data inicial (ISO 8601)"),
      endDate: z.string().optional().describe("Data final (ISO 8601)"),
      type: z.enum(["reuniao", "tarefa", "lembrete", "outro"]).optional().describe("Tipo de evento"),
      status: z.enum(["agendado", "concluido", "cancelado"]).optional().describe("Status"),
      userId: z.string().optional().describe("Filtrar por usuário"),
    },
    async ({ startDate, endDate, type, status, userId }) => {
      const where: Record<string, unknown> = {};

      if (type) where.type = type;
      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.startDate = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const events = await prisma.event.findMany({
        where,
        orderBy: { startDate: "asc" },
        include: { user: { select: { name: true } } },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              events.map((e: typeof events[number]) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.startDate,
                endDate: e.endDate,
                allDay: e.allDay,
                type: e.type,
                status: e.status,
                location: e.location,
                user: e.user.name,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── create_event ──────────────────────────
  server.tool(
    "create_event",
    "Cria um novo evento na agenda",
    {
      title: z.string().min(1).describe("Título do evento"),
      description: z.string().optional().describe("Descrição"),
      startDate: z.string().describe("Data/hora de início (ISO 8601)"),
      endDate: z.string().optional().describe("Data/hora de fim (ISO 8601)"),
      allDay: z.boolean().default(false).describe("Evento de dia inteiro"),
      type: z.enum(["reuniao", "tarefa", "lembrete", "outro"]).default("reuniao").describe("Tipo"),
      location: z.string().optional().describe("Local"),
      clientId: z.string().optional().describe("ID do cliente relacionado"),
      userId: z.string().describe("ID do usuário"),
    },
    async (data) => {
      const event = await prisma.event.create({
        data: {
          title: data.title,
          description: data.description,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          allDay: data.allDay,
          type: data.type,
          location: data.location,
          clientId: data.clientId,
          userId: data.userId,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Evento criado com sucesso", event }, null, 2),
          },
        ],
      };
    }
  );
}
