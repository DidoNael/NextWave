import { prisma } from "@/lib/db";

type SyncType = "service" | "project" | "task";

interface SyncParams {
  type: SyncType;
  id: string;
  title: string;
  description?: string;
  dueDate?: Date | null;
  userId: string;
  clientId?: string | null;
}

export async function syncToAgenda({
  type,
  id,
  title,
  description,
  dueDate,
  userId,
  clientId,
}: SyncParams) {
  try {
    // Determine the field based on type
    const whereField = `${type}Id`;
    const eventType = type === "task" || type === "service" ? "tarefa" : "reuniao";

    // Find existing event for this record
    const existingEvent = await prisma.event.findFirst({
      where: {
        [whereField]: id,
        userId,
      },
    });

    // If dueDate is null or undefined, delete the event if it exists
    if (!dueDate) {
      if (existingEvent) {
        await prisma.event.delete({
          where: { id: existingEvent.id },
        });
      }
      return;
    }

    // Upsert the event
    if (existingEvent) {
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          title,
          description: description || null,
          startDate: dueDate,
          clientId: clientId || null,
        },
      });
    } else {
      await prisma.event.create({
        data: {
          title,
          description: description || null,
          startDate: dueDate,
          type: eventType,
          userId,
          clientId: clientId || null,
          [whereField]: id,
        },
      });
    }
  } catch (error) {
    console.error(`[AGENDA_SYNC_ERROR] [${type}]`, error);
  }
}
