import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const clienteSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
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
  status: z.enum(["ativo", "inativo", "prospecto"]).default("ativo"),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) return NextResponse.json({ error: "Organização não encontrada" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const isExport = searchParams.get("all") === "true";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const skip = isExport ? undefined : (page - 1) * limit;
    const take = isExport ? undefined : limit;

    const where: any = {
      organizationId, // Filtro crítico SASS
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { document: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          ...(!isNaN(parseInt(search)) ? [{ registrationId: parseInt(search) }] : []),
        ],
      }),
      ...(status && { status }),
    };

    const [clientes, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: { select: { transactions: true, services: true } },
          user: { select: { name: true } }
        },
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({ clientes, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[CLIENTES_GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) return NextResponse.json({ error: "Organização não encontrada" }, { status: 403 });

    const body = await request.json();
    const data = clienteSchema.parse(body);

    // Gerar próximo registrationId dentro de uma transação para evitar race condition
    const cliente = await prisma.$transaction(async (tx) => {
      const lastClient = await tx.client.findFirst({
        orderBy: { registrationId: "desc" },
        select: { registrationId: true },
      });
      const nextId = (lastClient?.registrationId ?? 0) + 1;
      return tx.client.create({
        data: {
          ...data,
          userId: session.user.id,
          organizationId,
          registrationId: nextId,
        },
      });
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[CLIENTES_POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
