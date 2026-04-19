/**
 * Store in-memory de eventos WhatsApp para Server-Sent Events (SSE).
 * Quando o webhook recebe uma nova mensagem, chama notifyNewWaMessage()
 * para despertar todos os listeners SSE conectados.
 */

let _count = 0;
const _waiters: Array<() => void> = [];

/** Dispara notificação para todos os clientes SSE conectados */
export function notifyNewWaMessage() {
    _count++;
    _waiters.splice(0).forEach((fn) => fn());
}

/** Aguarda próximo evento (usado pelo endpoint SSE via long-poll) */
export function waitForWaEvent(signal: AbortSignal): Promise<number> {
    return new Promise((resolve) => {
        if (signal.aborted) return resolve(_count);
        const fn = () => resolve(_count);
        _waiters.push(fn);
        signal.addEventListener(
            "abort",
            () => {
                const i = _waiters.indexOf(fn);
                if (i >= 0) _waiters.splice(i, 1);
                resolve(_count);
            },
            { once: true }
        );
    });
}

export const getWaEventCount = () => _count;
