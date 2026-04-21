import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  document: z.string().optional().or(z.literal("")),
  company: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ativo", "inativo", "prospecto", "pausado", "bloqueado"]).optional(),
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const cliente = await prisma.client.findFirst({
      where: { id: params.id },
      include: {
        transactions: { orderBy: { dueDate: "desc" } },
        services: { orderBy: { createdAt: "desc" }, include: { pluginLicense: true } },
        subscriptions: { orderBy: { nextBillingDate: "asc" } },
        _count: { select: { transactions: true, services: true } },
      },
    });

    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error("[CLIENTE_GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = updateSchema.parse(body);

    const cliente = await prisma.client.updateMany({
      where: { id: params.id },
      data,
    });

    if (!cliente.count) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[CLIENTE_PUT]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    await prisma.client.deleteMany({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLIENTE_DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
