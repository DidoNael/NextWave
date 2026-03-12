import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const clienteSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().min(1, "Email obrigatório"),
  phone: z.string().min(1, "Telefone obrigatório"),
  document: z.string().min(1, "CPF/CNPJ obrigatório"),
  company: z.string().optional(),
  address: z.string().optional(),
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const skip = (page - 1) * limit;

    const where = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { company: { contains: search } },
        ],
      }),
      ...(status && { status }),
    };

    const [clientes, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: { select: { transactions: true, services: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
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

    const body = await request.json();
    const data = clienteSchema.parse(body);

    const cliente = await prisma.client.create({
      data: { ...data, userId: session.user.id },
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
