type CacheEntry = { data: unknown; timestamp: number };

export const adminProductCache = new Map<string, CacheEntry>();
export const adminProductsListCache: { entry: CacheEntry | null } = { entry: null };

export function invalidateAdminProductCache(productId?: string) {
  if (productId) adminProductCache.delete(productId);
  else adminProductCache.clear();
}

export function invalidateProductsListCache() {
  adminProductsListCache.entry = null;
}
