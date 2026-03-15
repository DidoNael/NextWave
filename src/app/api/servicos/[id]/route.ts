import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { syncToAgenda } from "@/lib/agenda-sync";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  status: z.enum(["rascunho", "enviado", "aprovado", "em_andamento", "concluido", "cancelado"]).optional(),
  category: z.string().optional(),
  clientId: z.string().optional().nullable(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paymentReceived: z.boolean().optional(),
  paymentMethod: z.string().optional(),
  billingFrequency: z.enum(["semanal", "mensal", "trimestral", "avulso"]).optional(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = updateSchema.parse(body);
    const { paymentReceived, paymentMethod, ...serviceData } = data;

    const service = await prisma.service.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { transactions: true }
    });

    if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

    await prisma.service.update({
      where: { id: service.id },
      data: {
        ...serviceData,
        clientId: serviceData.clientId === null ? null : serviceData.clientId,
        dueDate: serviceData.dueDate ? new Date(serviceData.dueDate) : undefined,
      },
    });

    const transaction = service.transactions[0];
    const updateTitle = serviceData.title ?? service.title;
    const updateAmount = serviceData.amount ?? service.amount;
    const clientUpdate = serviceData.clientId === null ? undefined : (serviceData.clientId || service.clientId);

    const updateDueDate = serviceData.dueDate ? new Date(serviceData.dueDate) : (service.dueDate as Date | null);

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          amount: updateAmount,
          paymentMethod: paymentMethod ?? transaction.paymentMethod,
          description: `Fatura: ${updateTitle} (${serviceData.billingFrequency || (service as any).billingFrequency})`,
          clientId: clientUpdate,
          status: paymentReceived ? "pago" : "pendente",
          dueDate: updateDueDate,
          paidAt: paymentReceived ? (transaction.paidAt || new Date()) : null,
        }
      });
    } else if (updateAmount > 0) {
      await prisma.transaction.create({
        data: {
          description: `Fatura: ${updateTitle} (${serviceData.billingFrequency || (service as any).billingFrequency})`,
          amount: updateAmount,
          type: "receita",
          category: "Serviços",
          status: paymentReceived ? "pago" : "pendente",
          paymentMethod: paymentMethod || "Pix",
          dueDate: updateDueDate,
          paidAt: paymentReceived ? new Date() : undefined,
          userId: session.user.id,
          clientId: clientUpdate,
          serviceId: service.id,
        }
      });
    }

    await syncToAgenda({
      type: "service",
      id: service.id,
      title: updateTitle,
      description: service.description || undefined,
      dueDate: updateDueDate,
      userId: session.user.id,
      clientId: clientUpdate,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("[SERVICO_PUT]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const service = await prisma.service.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (service) {
      // Clear agenda event
      await syncToAgenda({
        type: "service",
        id: service.id,
        title: "",
        dueDate: null,
        userId: session.user.id,
      });
    }

    await prisma.service.deleteMany({ where: { id: params.id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SERVICO_DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
