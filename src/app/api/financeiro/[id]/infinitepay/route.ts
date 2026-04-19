import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generatePaymentLink } from "@/lib/infinitepay";

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
