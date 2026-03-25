import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const license = await prisma.pluginLicense.findUnique({ where: { serviceId: params.id } });
  if (!license) return NextResponse.json({ error: "Licença não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const toEmail = body.email || license.customerEmail;
  if (!toEmail) return NextResponse.json({ error: "Email do destinatário não informado" }, { status: 400 });

  const smtp = await prisma.smtpConfig.findFirst({ where: { isDefault: true, isActive: true } });
  if (!smtp) return NextResponse.json({ error: "Nenhum SMTP configurado" }, { status: 400 });

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transporter.sendMail({
    from: `"${smtp.fromName || "Netstream"}" <${smtp.fromEmail}>`,
    to: toEmail,
    subject: "Sua Licença do Plugin Grafana — Netstream Topology",
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">Sua licença foi ativada!</h2>
        <p>Olá, <strong>${license.customerName}</strong>.</p>
        <p>Sua chave de licença para o <strong>Netstream Topology Plugin</strong> está pronta:</p>
        <div style="background:#f4f4f4;border-radius:8px;padding:16px;text-align:center;margin:20px 0">
          <code style="font-size:16px;font-weight:bold;letter-spacing:1px">${license.key}</code>
        </div>
        <p><strong>Como usar:</strong></p>
        <ol>
          <li>Abra o Grafana e navegue até o painel de Topologia</li>
          <li>Clique em Opções do painel &rarr; categoria <strong>Licença</strong></li>
          <li>Cole a chave acima no campo <strong>Chave de Licença</strong></li>
          <li>Salve o painel</li>
        </ol>
        <p style="color:#888;font-size:12px;margin-top:24px">Em caso de dúvidas, entre em contato com o suporte.</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
