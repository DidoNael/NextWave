import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function derToP1363(der: Buffer): Buffer {
  let offset = 2; // pula 0x30 e length
  offset++; // pula 0x02
  const rLen = der[offset++];
  const rRaw = der.slice(offset, offset + rLen);
  offset += rLen;
  offset++; // pula 0x02
  const sLen = der[offset++];
  const sRaw = der.slice(offset, offset + sLen);

  // Remove byte de sinal (0x00) e normaliza para 32 bytes
  const r = rRaw[0] === 0x00 ? rRaw.slice(1) : rRaw;
  const s = sRaw[0] === 0x00 ? sRaw.slice(1) : sRaw;
  const result = Buffer.alloc(64);
  r.copy(result, 32 - r.length);
  s.copy(result, 64 - s.length);
  return result;
}

async function signResponse(payload: object): Promise<string> {
  try {
    const jwkRaw = process.env.ECDSA_PRIVATE_KEY_JWK;
    if (!jwkRaw) return "";
    const jwk = JSON.parse(jwkRaw);
    const privateKey = crypto.createPrivateKey({ key: jwk, format: "jwk" });
    const data = Buffer.from(JSON.stringify(payload));
    const derSig = crypto.sign("SHA256", data, privateKey);
    const p1363 = derToP1363(derSig);
    return p1363.toString("base64");
  } catch (e) {
    console.error("[License] Erro ao assinar resposta:", e);
    return "";
  }
}

async function respond(payload: object, status = 200) {
  const signature = await signResponse(payload);
  const body = signature ? { ...payload, signature } : payload;
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, host, nonce } = body;

    if (!key || typeof key !== "string") {
      return respond({ valid: false, blocked: false, message: "Chave inválida" }, 400);
    }

    // Ping de conectividade — responde sem buscar licença
    if (key === "__ping__") {
      return respond({ valid: false, blocked: false, message: "pong" });
    }

    const license = await prisma.pluginLicense.findUnique({ where: { key } });

    if (!license) {
      return respond({ valid: false, blocked: false, message: "Licença não encontrada" });
    }

    // Validação HMAC-SHA256 opcional
    const signature = req.headers.get("x-nws-signature");
    const timestamp = req.headers.get("x-nws-timestamp");

    if (signature && timestamp && license.secretKey) {
      // Garantimos a ordem das chaves para bater com o plugin
      const message = `${timestamp}.${JSON.stringify({ key, domain: host })}`;
      const expected = crypto
        .createHmac("sha256", license.secretKey)
        .update(message)
        .digest("hex");

      // timingSafeEqual exige que os buffers tenham o mesmo tamanho
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return respond({ valid: false, message: "Assinatura digital inválida." }, 401);
      }
    }

    // Atualiza lastValidAt e lastIp
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    await prisma.pluginLicense.update({
      where: { key },
      data: { lastValidAt: new Date(), lastIp: ip },
    });

    if (license.status === "blocked" || license.status === "suspended") {
      return respond({ valid: false, blocked: license.status === "blocked", message: "Licença Inválida" });
    }

    // --- CHECK FINANCEIRO (Carência de 10 dias) ---
    // Ignora check financeiro se for Trial
    if (!license.isTrial && (license.clientId || license.serviceId)) {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      // Busca transações pendentes vencidas há mais de 10 dias
      const overdueTransaction = await prisma.transaction.findFirst({
        where: {
          OR: [
            { clientId: license.clientId },
            { serviceId: license.serviceId }
          ],
          type: "receita",
          status: "pendente",
          dueDate: {
            lt: tenDaysAgo
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      if (overdueTransaction) {
        console.log(`[License] Suspensão automática (Financeiro): Cliente ${license.customerName} - Fatura vencida em ${overdueTransaction.dueDate?.toLocaleDateString()}`);
        return respond({ 
          valid: false, 
          blocked: false, 
          suspended: true, 
          message: "Licença Inválida" 
        });
      }
    }
    // ----------------------------------------------

    // Verifica trial
    if (license.isTrial && license.trialEndsAt) {
      const now = new Date();
      if (now > license.trialEndsAt) {
        return respond({ valid: false, blocked: false, trial: true, trialExpired: true, nonce, message: "Período de teste encerrado." });
      }
      const daysLeft = Math.ceil((license.trialEndsAt.getTime() - now.getTime()) / 86400000);
      return respond({
        valid: true, blocked: false, trial: true,
        trialDaysLeft: daysLeft, trialEndsAt: license.trialEndsAt,
        customerName: license.customerName, nonce,
        message: `Período de teste — ${daysLeft} dia(s) restante(s)`,
      });
    }

    // Verifica expiração normal
    if (license.expiresAt && new Date() > license.expiresAt) {
      return respond({ valid: false, blocked: false, nonce, message: "Licença expirada" });
    }

    return respond({
      valid: true, blocked: false, trial: false,
      customerName: license.customerName,
      expiresAt: license.expiresAt,
      nonce,
      message: "Licença ativa",
    });
  } catch (error) {
    return respond({ valid: false, blocked: false, message: "Erro interno" }, 500);
  }
}

export const dynamic = "force-dynamic";
