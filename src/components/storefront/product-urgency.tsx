"use client";

import { useSyncExternalStore } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";

type ProductActivity = {
  stock: Record<string, number>;
  prices: Record<string, number>;
  sold: number;
  campaign: {
    code: string;
    endsAt: string;
    minimumCartSubtotal: number | null;
    isFreeShipping: boolean;
  } | null;
};

export function isProductDetailsPath(pathname: string) {
  return /^\/(?:vi|en|th)\/products\/[^/]+\/?$/.test(pathname);
}

export function productActivityQueryOptions(slug: string | null) {
  return queryOptions<ProductActivity>({
    queryKey: ["product-activity", slug],
    enabled: Boolean(slug),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/product-activity/${encodeURIComponent(slug ?? "")}`, { signal });
      if (!response.ok) throw new Error("Không thể cập nhật thông tin sản phẩm");
      return response.json();
    },
    staleTime: 14_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useProductActivity(slug: string | null) {
  return useQuery(productActivityQueryOptions(slug));
}

const subscribeToHydration = () => () => {};

export function useStorefrontHydration() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}
