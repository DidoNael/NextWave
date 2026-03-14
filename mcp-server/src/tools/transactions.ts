import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";

/**
 * Registra ferramentas de gerenciamento de transações financeiras.
 */
export function registerTransactionTools(server: McpServer): void {
  // ── list_transactions ─────────────────────
  server.tool(
    "list_transactions",
    "Lista transações financeiras com filtros de tipo, status, período e paginação",
    {
      type: z.enum(["receita", "despesa"]).optional().describe("Tipo: receita ou despesa"),
      status: z.enum(["pendente", "pago", "cancelado", "atrasado"]).optional().describe("Status da transação"),
      startDate: z.string().optional().describe("Data inicial (ISO 8601, ex: 2026-01-01)"),
      endDate: z.string().optional().describe("Data final (ISO 8601, ex: 2026-12-31)"),
      clientId: z.string().optional().describe("Filtrar por ID do cliente"),
      page: z.number().int().min(1).default(1).describe("Página"),
      pageSize: z.number().int().min(1).max(100).default(20).describe("Itens por página"),
    },
    async ({ type, status, startDate, endDate, clientId, page, pageSize }) => {
      const where: Record<string, unknown> = {};

      if (type) where.type = type;
      if (status) where.status = status;
      if (clientId) where.clientId = clientId;
      if (startDate || endDate) {
        where.createdAt = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            client: { select: { name: true } },
            user: { select: { name: true } },
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
                transactions: transactions.map((t: typeof transactions[number]) => ({
                  id: t.id,
                  description: t.description,
                  amount: t.amount,
                  type: t.type,
                  category: t.category,
                  status: t.status,
                  dueDate: t.dueDate,
                  paidAt: t.paidAt,
                  client: t.client?.name || null,
                  user: t.user.name,
                  createdAt: t.createdAt,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── create_transaction ────────────────────
  server.tool(
    "create_transaction",
    "Cria uma nova transação financeira (receita ou despesa)",
    {
      description: z.string().min(1).describe("Descrição da transação"),
      amount: z.number().positive().describe("Valor (positivo)"),
      type: z.enum(["receita", "despesa"]).describe("Tipo"),
      category: z.string().describe("Categoria (ex: servico, produto, aluguel)"),
      status: z.enum(["pendente", "pago", "cancelado"]).default("pendente").describe("Status"),
      dueDate: z.string().optional().describe("Data de vencimento (ISO 8601)"),
      notes: z.string().optional().describe("Observações"),
      userId: z.string().describe("ID do usuário responsável"),
      clientId: z.string().optional().describe("ID do cliente (opcional)"),
    },
    async (data) => {
      const transaction = await prisma.transaction.create({
        data: {
          description: data.description,
          amount: data.amount,
          type: data.type,
          category: data.category,
          status: data.status,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes,
          userId: data.userId,
          clientId: data.clientId,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Transação criada com sucesso", transaction }, null, 2),
          },
        ],
      };
    }
  );

  // ── update_transaction_status ─────────────
  server.tool(
    "update_transaction_status",
    "Atualiza o status de uma transação (ex: marcar como pago)",
    {
      transactionId: z.string().describe("ID da transação"),
      status: z.enum(["pendente", "pago", "cancelado", "atrasado"]).describe("Novo status"),
    },
    async ({ transactionId, status }) => {
      const updateData: Record<string, unknown> = { status };

      // Se marcando como pago, registra a data de pagamento
      if (status === "pago") {
        updateData.paidAt = new Date();
      }

      const transaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { message: `Transação atualizada para "${status}"`, transaction },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
