// Cache em memória compartilhado entre requisições no mesmo processo Node.
// Adequado para deployment single-instance (Docker). Em multi-instance, usar Redis.

// ── Rate Limiting ──────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Retorna true se a requisição está dentro do limite.
 * @param key    Identificador único (ex: IP do cliente)
 * @param limit  Máximo de requisições na janela
 * @param windowMs Duração da janela em milissegundos
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

// Limpeza periódica para não acumular entradas expiradas na memória
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  });
}, 60_000);

// ── Pending 2FA Secrets ────────────────────────────────────────────────────────

interface Pending2FAEntry {
  secret: string;
  expiresAt: number;
}

const pending2FAMap = new Map<string, Pending2FAEntry>();

/** Armazena o secret gerado no setup por 10 minutos. */
export function storePending2FA(userId: string, secret: string) {
  pending2FAMap.set(userId, { secret, expiresAt: Date.now() + 10 * 60 * 1000 });
}

/**
 * Consome o secret pendente para o userId (use-once).
 * Retorna null se não existir ou estiver expirado.
 */
export function consumePending2FA(userId: string): string | null {
  const entry = pending2FAMap.get(userId);
  pending2FAMap.delete(userId);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.secret;
}
