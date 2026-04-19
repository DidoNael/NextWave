import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generatePaymentLink } from "@/lib/infinitepay"; // O nome do arquivo ainda é o mesmo, mas a função agora é genérica

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const url = await generatePaymentLink(params.id);
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error("[PAYMENT_API_ROUTE_ERROR]", error);
        return NextResponse.json({ error: error.message || "Erro ao gerar link de pagamento" }, { status: 500 });
    }
}
