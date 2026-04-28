import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const importClientSchema = z.object({
  name: z.string().min(2),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  cityCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ativo", "inativo", "prospecto"]).default("ativo"),
});

const importArraySchema = z.array(importClientSchema);

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) return NextResponse.json({ error: "Organização não encontrada" }, { status: 403 });

    const body = await request.json();
    const clients = importArraySchema.parse(body);

    if (clients.length === 0) {
      return NextResponse.json({ error: "Nenhum cliente para importar" }, { status: 400 });
    }

    // Processar importação em transação
    const result = await prisma.$transaction(async (tx) => {
      // Pegar o último ID para continuar a sequência
      const lastClient = await tx.client.findFirst({
        orderBy: { registrationId: "desc" },
        select: { registrationId: true },
      });
      
      let currentRegId = (lastClient?.registrationId ?? 0);
      
      const createdClients = [];
      
      for (const clientData of clients) {
        currentRegId++;
        const created = await tx.client.create({
          data: {
            ...clientData,
            email: clientData.email || null,
            phone: clientData.phone || null,
            document: clientData.document || null,
            company: clientData.company || null,
            address: clientData.address || null,
            number: clientData.number || null,
            complement: clientData.complement || null,
            neighborhood: clientData.neighborhood || null,
            city: clientData.city || null,
            state: clientData.state || null,
            zipCode: clientData.zipCode || null,
            cityCode: clientData.cityCode || null,
            notes: clientData.notes || null,
            userId: session.user.id,
            organizationId,
            registrationId: currentRegId,
          },
        });
        createdClients.push(created);
      }
      
      return createdClients;
    });

    return NextResponse.json({ 
      success: true, 
      count: result.length,
      message: `${result.length} clientes importados com sucesso.` 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos no arquivo", details: error.errors }, { status: 400 });
    }
    console.error("[CLIENTES_IMPORT]", error);
    return NextResponse.json({ error: "Erro interno na importação" }, { status: 500 });
  }
}
