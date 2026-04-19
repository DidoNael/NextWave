import { getWaEventCount, waitForWaEvent } from "@/lib/wa-events";

export const dynamic = "force-dynamic";

/**
 * Endpoint SSE — o frontend se conecta aqui e recebe notificações
 * imediatamente quando o webhook recebe uma nova mensagem.
 */
export async function GET(req: Request) {
    const signal = req.signal;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (count: number) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ count })}\n\n`)
                    );
                } catch {
                    // Stream fechado pelo cliente
                }
            };

            // Envia o count atual imediatamente ao conectar
            send(getWaEventCount());

            // Aguarda eventos enquanto o cliente estiver conectado
            while (!signal.aborted) {
                const count = await waitForWaEvent(signal);
                if (!signal.aborted) send(count);
            }

            try {
                controller.close();
            } catch {
                // Já fechado
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
