import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { updateGoogleEvent, deleteGoogleEvent } from "@/lib/google-calendar";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional(),
  type: z.enum(["reuniao", "call", "tarefa", "lembrete"]).optional(),
  status: z.enum(["agendado", "concluido", "cancelado"]).optional(),
  location: z.string().optional(),
  clientId: z.string().optional().nullable(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = updateSchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: params.id },
    });

    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    const result = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        clientId: data.clientId === null ? null : data.clientId,
      },
    });

    // Sincronizar com Google
    if (result.googleEventId) {
      try {
        await updateGoogleEvent(session.user.id, result.googleEventId, {
          title: result.title,
          description: result.description || undefined,
          startDate: result.startDate,
          endDate: result.endDate || undefined,
          location: result.location || undefined,
        });
      } catch (error) {
        console.error("[GOOGLE_SYNC_PUT_ERROR]", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("[AGENDA_PUT]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const event = await prisma.event.findFirst({
      where: { id: params.id },
    });

    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    // Sincronizar com Google
    if (event.googleEventId) {
      try {
        await deleteGoogleEvent(session.user.id, event.googleEventId);
      } catch (error) {
        console.error("[GOOGLE_SYNC_DELETE_ERROR]", error);
      }
    }

    await prisma.event.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AGENDA_DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
