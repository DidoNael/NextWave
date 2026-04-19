import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { pushEventToGoogle } from "@/lib/google-calendar";

const eventSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  allDay: z.boolean().default(false),
  type: z.enum(["reuniao", "call", "tarefa", "lembrete"]).default("reuniao"),
  status: z.enum(["agendado", "concluido", "cancelado"]).default("agendado"),
  location: z.string().optional(),
  clientId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes");
    const ano = searchParams.get("ano");

    let dateFilter = {};
    if (mes && ano) {
      const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const fim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);
      dateFilter = { startDate: { gte: inicio, lte: fim } };
    }

    const events = await prisma.event.findMany({
      where: { ...dateFilter },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[AGENDA_GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = eventSchema.parse(body);

    const event = await prisma.event.create({
      data: {
        ...data,
        userId: session.user.id,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        clientId: data.clientId || undefined,
      },
    });

    // Sincronizar com Google Calendar se o usuário estiver conectado
    try {
      const googleEventId = await pushEventToGoogle(session.user.id, {
        title: event.title,
        description: event.description || undefined,
        startDate: event.startDate,
        endDate: event.endDate || undefined,
        location: event.location || undefined,
      });

      if (googleEventId) {
        await prisma.event.update({
          where: { id: event.id },
          data: { googleEventId },
        });
      }
    } catch (error) {
      console.error("[GOOGLE_SYNC_POST_ERROR]", error);
      // Não falha a requisição se o sync falhar
    }

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("[AGENDA_POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
