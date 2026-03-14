import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const serviceSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  amount: z.number().positive("Valor deve ser positivo"),
  status: z.enum(["rascunho", "enviado", "aprovado", "em_andamento", "concluido", "cancelado"]).default("rascunho"),
  category: z.string().optional(),
  clientId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  paymentReceived: z.boolean().optional(),
  paymentMethod: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const where = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { category: { contains: search } },
        ],
      }),
      ...(status && { status }),
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
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = serviceSchema.parse(body);
    const { paymentReceived, paymentMethod, ...serviceData } = data;

    const service = await prisma.service.create({
      data: {
        ...serviceData,
        userId: session.user.id,
        clientId: serviceData.clientId || undefined,
        startDate: serviceData.startDate ? new Date(serviceData.startDate) : undefined,
        endDate: serviceData.endDate ? new Date(serviceData.endDate) : undefined,
        ...(paymentReceived && paymentMethod && serviceData.amount > 0 ? {
          transactions: {
            create: {
              description: `Pagamento do seriço: ${serviceData.title}`,
              amount: serviceData.amount,
              type: "receita",
              category: "Serviços",
              status: "pago",
              paymentMethod: paymentMethod,
              paidAt: new Date(),
              userId: session.user.id,
              ...(serviceData.clientId ? { clientId: serviceData.clientId } : {}),
            }
          }
        } : {})
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("[SERVICOS_POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
