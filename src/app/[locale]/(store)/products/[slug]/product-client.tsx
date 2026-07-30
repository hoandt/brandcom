"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type Variant = {
  id: string;
  sku: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  isActive?: boolean;
};

type ProductClientProps = {
  product: {
    id: string;
    name: string;
    images: { url: string }[];
    variants: Variant[];
  };
};

export function ProductClient({ product }: ProductClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id || ""
  );

  const locale = useLocale();
  const t = useTranslations("Product");
  const router = useRouter();

  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartItems = useCartStore((state) => state.items);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : true;

  const cartItem = cartItems.find((i) => i.variantId === selectedVariantId);
  const currentQuantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      sku: selectedVariant.sku,
      price: Number(selectedVariant.price),
      quantity: 1,
      image: product.images[0]?.url,
    });
  };

  const handleIncrement = () => {
    if (!selectedVariant) return;
    updateQuantity(selectedVariant.id, currentQuantity + 1);
  };

  const handleDecrement = () => {
    if (!selectedVariant) return;
    if (currentQuantity <= 1) {
      removeItem(selectedVariant.id);
    } else {
      updateQuantity(selectedVariant.id, currentQuantity - 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Variant Selector */}
      {product.variants.length > 1 && (
        <div className="space-y-4">
          <label className="text-xs font-heading uppercase tracking-widest block text-muted-foreground">
            {t("variantLabel")}
          </label>
          <div className="flex flex-wrap gap-3">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                className={`border px-6 py-3 text-xs transition-all uppercase tracking-[0.15em] rounded-full font-medium ${selectedVariantId === variant.id
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-transparent text-foreground hover:border-primary/50 hover:bg-secondary"
                  } ${variant.stock <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={variant.stock <= 0}
              >
                {variant.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Area (Mobile Fixed, Desktop Inline) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-[0_-1px_10px_rgba(0,0,0,0.02)] p-4 sm:static sm:z-auto sm:bg-transparent sm:border-none sm:shadow-none sm:p-0 sm:pt-4">
        <div className="w-full sm:w-auto sm:max-w-md">
          {currentQuantity > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center h-14 rounded-full border border-border flex-1 max-w-[200px] overflow-hidden">
                <button
                  onClick={handleDecrement}
                  className="w-14 h-full flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
                  aria-label="Decrease quantity"
                >
                  <svg width="12" height="1" viewBox="0 0 12 1" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0H12V1H0V0Z" />
                  </svg>
                </button>
                <div className="flex-1 text-center font-medium text-sm tracking-widest bg-secondary/30 h-full flex items-center justify-center">
                  {currentQuantity}
                </div>
                <button
                  onClick={handleIncrement}
                  className="w-14 h-full flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
                  aria-label="Increase quantity"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.5 0H6.5V5.5H12V6.5H6.5V12H5.5V6.5H0V5.5H5.5V0Z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => router.push(`/${locale}/checkout`)}
                className="text-xs font-bold uppercase tracking-[0.2em] underline underline-offset-4 text-primary hover:text-primary/80 transition-colors h-14 px-4 flex items-center shrink-0"
              >
                {t("viewBag")}
              </button>
            </div>
          ) : (
            <Button
              className="w-full h-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm tracking-[0.15em] font-medium uppercase shadow-lg shadow-primary/20 transition-all"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {isOutOfStock ? t("outOfStock") : t("addToBag")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
