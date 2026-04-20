import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { syncToAgenda } from "@/lib/agenda-sync";
import { createPluginLicense } from "@/lib/license";

const serviceSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  amount: z.number().positive("Valor deve ser positivo"),
  status: z.enum(["rascunho", "enviado", "aprovado", "em_andamento", "concluido", "cancelado"]).default("rascunho"),
  category: z.string().optional(),
  clientId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  billingFrequency: z.enum(["semanal", "mensal", "trimestral", "avulso"]).default("avulso"),
  notes: z.string().optional(),
  paymentReceived: z.boolean().optional(),
  paymentMethod: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    const orgId = (session?.user as any)?.organizationId;
    if (!session?.user?.id || !orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { category: { contains: search } },
        ],
      }),
      ...(status && { status }),
      organizationId: orgId,
    };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { client: { select: { id: true, name: true } }, transactions: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return NextResponse.json({ services, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[SERVICOS_GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const orgId = (session?.user as any)?.organizationId;
    if (!session?.user?.id || !orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = serviceSchema.parse(body);
    const { paymentReceived, paymentMethod, ...serviceData } = data;

    const service = await prisma.service.create({
      data: {
        ...serviceData,
        userId: session.user.id,
        organizationId: orgId,
        clientId: serviceData.clientId || undefined,
        dueDate: serviceData.dueDate ? new Date(serviceData.dueDate) : undefined,
        // Gera transação automática para consulta no financeiro
        transactions: {
          create: {
            description: `Fatura: ${serviceData.title} (${serviceData.billingFrequency})`,
            amount: serviceData.amount,
            type: "receita",
            category: "Serviços",
            status: paymentReceived ? "pago" : "pendente",
            dueDate: serviceData.dueDate ? new Date(serviceData.dueDate) : undefined,
            paymentMethod: paymentMethod || "Pix",
            paidAt: paymentReceived ? new Date() : undefined,
            userId: session.user.id,
            clientId: serviceData.clientId || undefined,
          }
        }
      },
    });

    if (service.dueDate) {
      await syncToAgenda({
        type: "service",
        id: service.id,
        title: service.title,
        description: service.description || undefined,
        dueDate: service.dueDate,
        userId: session.user.id,
        clientId: service.clientId,
      });
    }

    // Auto-criar licença de plugin se categoria for "Plugin Grafana"
    if (serviceData.category === "Plugin Grafana") {
      let customerName = serviceData.title;
      let customerEmail: string | null = null;

      if (serviceData.clientId) {
        const client = await prisma.client.findUnique({
          where: { id: serviceData.clientId },
          select: { name: true, email: true },
        });
        if (client) {
          customerName = client.name;
          customerEmail = client.email;
        }
      }

      await createPluginLicense({
        customerName,
        customerEmail,
        organizationId: orgId,
        serviceId: service.id,
        clientId: serviceData.clientId,
        isTrial: false, // Vem de venda, não é trial por padrão
      });
    }

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("[SERVICOS_POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
