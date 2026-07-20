import IORedis from "ioredis";

let redis: IORedis | null = null;

function getRedis(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redis) redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  return redis;
}

/**
 * Limite à `limit` requêtes par fenêtre de `windowSec` secondes pour une clé donnée
 * (typiquement l'IP ou l'IP+route). Fail-open : si Redis est indisponible, on autorise
 * plutôt que de bloquer tout le trafic public. Renvoie true si la requête est autorisée.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const client = getRedis();
  if (!client) return true; // pas de Redis configuré → pas de limitation (dev local)

  const redisKey = `ratelimit:${key}`;
  try {
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.expire(redisKey, windowSec);
    }
    return count <= limit;
  } catch {
    return true; // fail-open en cas d'erreur Redis
  }
}

/** Extrait une clé d'identification best-effort depuis les en-têtes de la requête. */
export function clientKey(req: Request, suffix: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${ip}:${suffix}`;
}
