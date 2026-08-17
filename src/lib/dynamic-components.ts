import { prisma } from "@/lib/prisma";

export type ComponentData<T = any> = T;

export type FeaturedProductsComponent = {
  title: string;
  subtitle: string;
  displayType: 'latest' | 'manual';
  productIds: string[];
};

let cachedComponents: Record<string, { data: any; expiresAt: number }> = {};
const CACHE_TTL_MS = process.env.NODE_ENV === "development" ? 0 : 5 * 60_000; // 5 minutes in-memory cache in production

export function invalidateDynamicComponentCache(code?: string) {
  if (code) {
    delete cachedComponents[code];
  } else {
    cachedComponents = {};
  }
}

export async function getDynamicComponent<T = any>(code: string): Promise<T | null> {
  const now = Date.now();
  const cached = cachedComponents[code];

  if (cached && cached.expiresAt > now) {
    console.log(`[getDynamicComponent] Returning cached ${code}:`, cached.data);
    return cached.data as T;
  }

  try {
    if (!prisma || !prisma.dynamicComponent) {
      return null;
    }

    const component = await prisma.dynamicComponent.findUnique({
      where: { code },
    });

    if (component && component.isActive) {
      cachedComponents[code] = {
        data: component.content,
        expiresAt: now + CACHE_TTL_MS,
      };
      console.log(`[getDynamicComponent] Fetched from DB ${code}:`, component.content);
      return component.content as unknown as T;
    }
  } catch (error) {
    console.error(`[GET_DYNAMIC_COMPONENT_ERROR:${code}]`, error);
    return null;
  }

  return null;
}
