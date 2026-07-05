/**
 * Simpel in-memory rate limiter (fast-window pr. IP). Nok til at daempe
 * misbrug af det offentlige lead-endpoint. Bag flere instanser: skift til
 * en delt store (Redis) bag samme interface.
 */
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Ryd gamle entries en gang imellem, saa map'et ikke vokser.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of hits) if (rec.resetAt <= now) hits.delete(ip);
  }, windowMs).unref?.();

  function check(ip) {
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || rec.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: max - 1 };
    }
    rec.count += 1;
    if (rec.count > max) {
      return { allowed: false, retryAfterMs: rec.resetAt - now };
    }
    return { allowed: true, remaining: max - rec.count };
  }

  return { check, _sweep: sweep };
}
