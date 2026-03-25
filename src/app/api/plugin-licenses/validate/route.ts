import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { key } = await req.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json({ valid: false, blocked: false, message: "Chave inválida" }, { status: 400 });
    }

    const license = await prisma.pluginLicense.findUnique({ where: { key } });

    if (!license) {
      return NextResponse.json({ valid: false, blocked: false, message: "Licença não encontrada" });
    }

    // Atualiza lastValidAt e lastIp
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    await prisma.pluginLicense.update({
      where: { key },
      data: { lastValidAt: new Date(), lastIp: ip },
    });

    if (license.status === "blocked") {
      return NextResponse.json({ valid: false, blocked: true, message: "Licença bloqueada permanentemente" });
    }

    if (license.status === "suspended") {
      return NextResponse.json({ valid: false, blocked: false, suspended: true, message: "Licença suspensa. Entre em contato com o suporte." });
    }

    // Verifica trial
    if (license.isTrial && license.trialEndsAt) {
      const now = new Date();
      if (now > license.trialEndsAt) {
        return NextResponse.json({ valid: false, blocked: false, trial: true, trialExpired: true, message: "Período de teste encerrado. Adquira uma licença para continuar." });
      }
      const msLeft = license.trialEndsAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      return NextResponse.json({
        valid: true,
        blocked: false,
        trial: true,
        trialDaysLeft: daysLeft,
        trialEndsAt: license.trialEndsAt,
        customerName: license.customerName,
        message: `Período de teste — ${daysLeft} dia(s) restante(s)`,
      });
    }

    // Verifica expiração de licença normal
    if (license.expiresAt && new Date() > license.expiresAt) {
      return NextResponse.json({ valid: false, blocked: false, message: "Licença expirada" });
    }

    return NextResponse.json({
      valid: true,
      blocked: false,
      trial: false,
      customerName: license.customerName,
      expiresAt: license.expiresAt,
      message: "Licença ativa",
    });
  } catch (error) {
    return NextResponse.json({ valid: false, blocked: false, message: "Erro interno" }, { status: 500 });
  }
}
