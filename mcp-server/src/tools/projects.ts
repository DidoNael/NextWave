import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";

/**
 * Registra ferramentas de gerenciamento de projetos e tarefas (Kanban).
 */
export function registerProjectTools(server: McpServer): void {
  // ── list_projects ─────────────────────────
  server.tool(
    "list_projects",
    "Lista todos os projetos com suas colunas e contagem de tarefas",
    {
      userId: z.string().optional().describe("Filtrar por usuário"),
    },
    async ({ userId }) => {
      const where = userId ? { userId } : {};

      const projects = await prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          columns: {
            orderBy: { order: "asc" },
            include: {
              _count: { select: { tasks: true } },
            },
          },
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              projects.map((p: typeof projects[number]) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                color: p.color,
                owner: p.user.name,
                columns: p.columns.map((col: typeof p.columns[number]) => ({
                  id: col.id,
                  title: col.title,
                  order: col.order,
                  taskCount: col._count.tasks,
                })),
                createdAt: p.createdAt,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── get_project_board ─────────────────────
  server.tool(
    "get_project_board",
    "Retorna o quadro Kanban completo de um projeto com todas as colunas e tarefas",
    {
      projectId: z.string().describe("ID do projeto"),
    },
    async ({ projectId }) => {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          columns: {
            orderBy: { order: "asc" },
            include: {
              tasks: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      if (!project) {
        return {
          content: [{ type: "text" as const, text: "Projeto não encontrado" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    }
  );

  // ── create_task ───────────────────────────
  server.tool(
    "create_task",
    "Cria uma nova tarefa em uma coluna de um projeto",
    {
      columnId: z.string().describe("ID da coluna onde a tarefa será criada"),
      title: z.string().min(1).describe("Título da tarefa"),
      description: z.string().optional().describe("Descrição detalhada"),
      priority: z.enum(["baixa", "media", "alta"]).default("media").describe("Prioridade"),
      scope: z.enum(["empresa", "pessoal"]).default("empresa").describe("Escopo"),
      dueDate: z.string().optional().describe("Data de vencimento (ISO 8601)"),
    },
    async (data) => {
      // Determina a última posição na coluna
      const lastTask = await prisma.task.findFirst({
        where: { columnId: data.columnId },
        orderBy: { order: "desc" },
      });

      const task = await prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          scope: data.scope,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          order: (lastTask?.order ?? -1) + 1,
          columnId: data.columnId,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Tarefa criada com sucesso", task }, null, 2),
          },
        ],
      };
    }
  );

  // ── move_task ─────────────────────────────
  server.tool(
    "move_task",
    "Move uma tarefa para outra coluna do projeto (ex: de 'A Fazer' para 'Em Progresso')",
    {
      taskId: z.string().describe("ID da tarefa"),
      targetColumnId: z.string().describe("ID da coluna de destino"),
    },
    async ({ taskId, targetColumnId }) => {
      // Determina a última posição na coluna destino
      const lastTask = await prisma.task.findFirst({
        where: { columnId: targetColumnId },
        orderBy: { order: "desc" },
      });

      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          columnId: targetColumnId,
          order: (lastTask?.order ?? -1) + 1,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Tarefa movida com sucesso", task }, null, 2),
          },
        ],
      };
    }
  );
}
