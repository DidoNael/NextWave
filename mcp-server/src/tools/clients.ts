import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";

/**
 * Registra ferramentas de gerenciamento de clientes no MCP Server.
 */
export function registerClientTools(server: McpServer): void {
  // ── list_clients ──────────────────────────
  server.tool(
    "list_clients",
    "Lista clientes do CRM com filtros opcionais de nome, status e paginação",
    {
      search: z.string().optional().describe("Busca por nome, email ou telefone"),
      status: z.enum(["ativo", "inativo"]).optional().describe("Filtrar por status"),
      page: z.number().int().min(1).default(1).describe("Página (começa em 1)"),
      pageSize: z.number().int().min(1).max(100).default(20).describe("Itens por página"),
    },
    async ({ search, status, page, pageSize }) => {
      const where: Record<string, unknown> = {};

      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ];
      }

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        }),
        prisma.client.count({ where }),
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
                clients: clients.map((c: typeof clients[number]) => ({
                  id: c.id,
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  company: c.company,
                  status: c.status,
                  createdAt: c.createdAt,
                  assignedTo: c.user.name,
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

  // ── get_client ────────────────────────────
  server.tool(
    "get_client",
    "Retorna detalhes completos de um cliente por ID, incluindo transações e serviços",
    {
      clientId: z.string().describe("ID do cliente"),
    },
    async ({ clientId }) => {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          user: { select: { name: true, email: true } },
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          services: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!client) {
        return {
          content: [{ type: "text" as const, text: "Cliente não encontrado" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(client, null, 2),
          },
        ],
      };
    }
  );

  // ── create_client ─────────────────────────
  server.tool(
    "create_client",
    "Cria um novo cliente no CRM",
    {
      name: z.string().min(1).describe("Nome do cliente"),
      email: z.string().email().optional().describe("Email"),
      phone: z.string().optional().describe("Telefone"),
      document: z.string().optional().describe("CPF/CNPJ"),
      company: z.string().optional().describe("Empresa"),
      address: z.string().optional().describe("Endereço"),
      city: z.string().optional().describe("Cidade"),
      state: z.string().optional().describe("Estado"),
      zipCode: z.string().optional().describe("CEP"),
      notes: z.string().optional().describe("Observações"),
      userId: z.string().describe("ID do usuário responsável"),
    },
    async (data) => {
      const client = await prisma.client.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          document: data.document,
          company: data.company,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          notes: data.notes,
          userId: data.userId,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Cliente criado com sucesso", client }, null, 2),
          },
        ],
      };
    }
  );

  // ── update_client ─────────────────────────
  server.tool(
    "update_client",
    "Atualiza dados de um cliente existente",
    {
      clientId: z.string().describe("ID do cliente"),
      name: z.string().optional().describe("Nome"),
      email: z.string().email().optional().describe("Email"),
      phone: z.string().optional().describe("Telefone"),
      document: z.string().optional().describe("CPF/CNPJ"),
      company: z.string().optional().describe("Empresa"),
      address: z.string().optional().describe("Endereço"),
      city: z.string().optional().describe("Cidade"),
      state: z.string().optional().describe("Estado"),
      zipCode: z.string().optional().describe("CEP"),
      notes: z.string().optional().describe("Observações"),
      status: z.enum(["ativo", "inativo"]).optional().describe("Status"),
    },
    async ({ clientId, ...data }) => {
      // Filtra campos undefined
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(updateData).length === 0) {
        return {
          content: [{ type: "text" as const, text: "Nenhum campo para atualizar foi fornecido" }],
          isError: true,
        };
      }

      const client = await prisma.client.update({
        where: { id: clientId },
        data: updateData,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Cliente atualizado com sucesso", client }, null, 2),
          },
        ],
      };
    }
  );
}
