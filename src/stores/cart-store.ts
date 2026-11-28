import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { brandConfig } from '@/lib/brand-config';

export type CartItem = {
  variantId: string;
  productName: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
  productSlug?: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  syncPrices: (prices: Record<string, number>) => void;
  replaceOne: (oldVariantId: string, replacement: CartItem, maxQuantity: number) => boolean;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.variantId === item.variantId
          );
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, price: item.price, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        })),
      syncPrices: (prices) =>
        set((state) => {
          let changed = false;
          const items = state.items.map((item) => {
            const price = prices[item.variantId];
            if (!Number.isFinite(price) || price < 0 || price === item.price) return item;
            changed = true;
            return { ...item, price };
          });
          return changed ? { items } : state;
        }),
      replaceOne: (oldVariantId, replacement, maxQuantity) => {
        if (oldVariantId === replacement.variantId) return false;
        const { items } = get();
        const original = items.find((item) => item.variantId === oldVariantId);
        const target = items.find((item) => item.variantId === replacement.variantId);
        if (!original || original.quantity < 1 || (target?.quantity ?? 0) >= maxQuantity) return false;

        const nextItems = items
          .filter((item) => item.variantId !== oldVariantId || item.quantity > 1)
          .map((item) => {
            if (item.variantId === oldVariantId) return { ...item, quantity: item.quantity - 1 };
            if (item.variantId === replacement.variantId) return { ...replacement, quantity: item.quantity + 1 };
            return item;
          });
        set({ items: target ? nextItems : [...nextItems, { ...replacement, quantity: 1 }] });
        return true;
      },
      clearCart: () => set({ items: [] }),
    }),
    {
      name: brandConfig.cartStorageKey,
    }
  )
);
