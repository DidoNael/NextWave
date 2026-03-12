import { NextResponse } from "next/server";
import { processRecurringBilling } from "@/lib/billing";

export async function GET(req: Request) {
    // Verificação básica de segurança (ex: Token via Header)
    // Em um cenário real, você deve passar um CRON_SECRET nas variáveis de ambiente
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const processedCount = await processRecurringBilling();
        return NextResponse.json({
            success: true,
            message: `Processamento concluído. ${processedCount} assinaturas verificadas.`,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error("[CRON_BILLING_ERROR]", error);
        return NextResponse.json({ error: "Erro ao processar faturamento recorrente" }, { status: 500 });
    }
}
