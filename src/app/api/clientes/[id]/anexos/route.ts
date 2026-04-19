import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join("/app/data", "uploads", "clientes");
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-zip-compressed",
];

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const anexos = await prisma.clientAttachment.findMany({
    where: { clientId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(anexos);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "";

    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo muito grande (máx 20MB)" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });

    // Garantir diretório
    const clientDir = path.join(UPLOADS_DIR, params.id);
    fs.mkdirSync(clientDir, { recursive: true });

    // Nome único no disco
    const ext = path.extname(file.name);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(clientDir, uniqueName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const anexo = await prisma.clientAttachment.create({
      data: {
        clientId: params.id,
        name: name || file.name,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        path: filePath,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json(anexo, { status: 201 });
  } catch (error) {
    console.error("[ANEXO_POST]", error);
    return NextResponse.json({ error: "Erro ao salvar anexo" }, { status: 500 });
  }
}
