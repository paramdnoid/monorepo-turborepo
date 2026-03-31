import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW_LOGIN = 30;
const MAX_PER_WINDOW_TOKEN = 60;

function take(
  key: string,
  max: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (b.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  b.count += 1;
  return { ok: true };
}

export function rateLimitLogin(ip: string) {
  return take(`login:${ip}`, MAX_PER_WINDOW_LOGIN);
}

export function rateLimitTokenExchange(ip: string) {
  return take(`token:${ip}`, MAX_PER_WINDOW_TOKEN);
}
