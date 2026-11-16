type CacheEntry<T> = { value: T; expiresAt: number };

const globalForStorefrontCache = globalThis as unknown as {
  __storefrontCacheEntries?: Map<string, CacheEntry<unknown>>;
};

const entries =
  globalForStorefrontCache.__storefrontCacheEntries ??
  (globalForStorefrontCache.__storefrontCacheEntries = new Map<string, CacheEntry<unknown>>());

export async function storefrontCache<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  if (ttlSeconds <= 0) return load();

  const now = Date.now();
  const cached = entries.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await load();
  entries.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

export function invalidateStorefrontCache(prefix?: string) {
  if (!prefix) {
    entries.clear();
    return;
  }
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

export function publicCacheHeaders(ttlSeconds: number) {
  if (ttlSeconds <= 0) return { "Cache-Control": "no-store" };
  return { "Cache-Control": `public, max-age=0, s-maxage=${ttlSeconds}, must-revalidate` };
}

export const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };
