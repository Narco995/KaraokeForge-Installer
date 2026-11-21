type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit, last: now };
  const elapsed = now - bucket.last;
  bucket.tokens = Math.min(limit, bucket.tokens + (elapsed / windowMs) * limit);
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    throw Object.assign(new Error("Rate limit exceeded. Try again shortly."), { status: 429 });
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);

  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (now - b.last > windowMs * 10) buckets.delete(k);
    }
  }
}
