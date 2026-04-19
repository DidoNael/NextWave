import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import fs from "fs";

export async function GET(_: Request, { params }: { params: { id: string; anexoId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const anexo = await prisma.clientAttachment.findFirst({
    where: { id: params.anexoId, clientId: params.id },
  });

  if (!anexo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const buffer = fs.readFileSync(anexo.path);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": anexo.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(anexo.fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado no disco" }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string; anexoId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const anexo = await prisma.clientAttachment.findFirst({
    where: { id: params.anexoId, clientId: params.id },
  });

  if (!anexo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Remove arquivo do disco
  try { fs.unlinkSync(anexo.path); } catch { /* arquivo pode já não existir */ }

  await prisma.clientAttachment.delete({ where: { id: params.anexoId } });

  return NextResponse.json({ success: true });
}
