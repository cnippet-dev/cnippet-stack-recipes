const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

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
