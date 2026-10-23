const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

// Recipe-scope limiter: in-memory, per-server-instance. Fine for a single
// instance; won't share state across multiple instances/processes. Swap for
// a shared store (e.g. Upstash Redis) if you deploy this behind more than
// one instance.
export function rateLimit(key: string): { success: boolean } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true };
  }

  if (entry.count >= MAX_ATTEMPTS) return { success: false };

  entry.count += 1;
  return { success: true };
}
