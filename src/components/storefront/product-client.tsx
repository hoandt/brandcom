"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Heart, Share2, MapPin } from "lucide-react";

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

// Map common color names to Hex codes for visual swatches
const getColorHex = (colorName: string): string => {
  const lower = colorName.toLowerCase();
  if (lower.includes("champagne")) return "#F0E2D3";
  if (lower.includes("white") || lower.includes("silk")) return "#F9F9FB";
  if (lower.includes("black")) return "#1A1A1A";
  if (lower.includes("brown")) return "#5C4033";
  if (lower.includes("blue") || lower.includes("navy")) return "#1B2A47";
  if (lower.includes("gray") || lower.includes("grey")) return "#8E8E93";
  if (lower.includes("red")) return "#A31D2C";
  // Fallback neutral
  return "#CCCCCC";
};

export function ProductClient({ product }: ProductClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Product");

  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartItems = useCartStore((state) => state.items);

  // Parse colors and sizes from variants list
  const hasOptionsSplit = product.variants.some(v => v.name.includes(" - "));
  
  let colors: string[] = [];
  let sizes: string[] = [];

  if (hasOptionsSplit) {
    colors = Array.from(new Set(product.variants.map(v => v.name.split(" - ")[0].trim())));
    sizes = Array.from(new Set(product.variants.map(v => v.name.split(" - ")[1]?.trim()).filter(Boolean)));
  } else {
    // If not split, classify variant names as either Sizes or Colors
    const sizeKeywords = ["xs", "s", "m", "l", "xl", "xxl", "one size", "os", "default", "variant"];
    const isSizeBased = product.variants.some(v => 
      sizeKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
    );

    if (isSizeBased) {
      sizes = product.variants.map(v => v.name);
    } else {
      colors = product.variants.map(v => v.name);
    }
  }

  // Active selections
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || "");
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] || "");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [showStoreStock, setShowStoreStock] = useState(false);

  // Match active selection to a variant
  useEffect(() => {
    let match: Variant | null = null;
    
    if (colors.length > 0 && sizes.length > 0) {
      match = product.variants.find(
        (v) => v.name.startsWith(selectedColor) && v.name.endsWith(selectedSize)
      ) || null;
    } else if (colors.length > 0) {
      match = product.variants.find((v) => v.name === selectedColor) || null;
    } else if (sizes.length > 0) {
      match = product.variants.find((v) => v.name === selectedSize) || null;
    } else {
      match = product.variants[0] || null;
    }

    setSelectedVariant(match);
    // Reset quantity if stock limit is lower
    if (match && quantity > match.stock) {
      setQuantity(Math.max(1, match.stock));
    }
  }, [selectedColor, selectedSize, product.variants]);

  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;

  // Sync with Cart item if already added
  const cartItem = cartItems.find((i) => i.variantId === selectedVariant?.id);
  const currentCartQuantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      sku: selectedVariant.sku,
      price: Number(selectedVariant.price),
      quantity: quantity,
      image: product.images[0]?.url,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Color Selector Swatches (Uniqlo Style) */}
      {colors.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs tracking-wider uppercase font-semibold">
            <span>Color: <span className="font-light text-muted-foreground">{selectedColor}</span></span>
          </div>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const hex = getColorHex(color);
              const isSelected = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? "border-black scale-105 shadow-sm" : "border-border hover:scale-105"
                  }`}
                  title={color}
                >
                  <span
                    className="w-7 h-7 rounded-full border border-black/10"
                    style={{ backgroundColor: hex }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Size Selector Blocks (Uniqlo Style) */}
      {sizes.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs tracking-wider uppercase font-semibold">
            <span>Size: <span className="font-light text-muted-foreground">{selectedSize}</span></span>
            <button type="button" className="text-[10px] underline uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Sizing Guide
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {sizes.map((size) => {
              const isSelected = selectedSize === size;
              // Check if size is in stock for the currently selected color
              const sizeVariant = hasOptionsSplit 
                ? product.variants.find(v => v.name === `${selectedColor} - ${size}`)
                : product.variants.find(v => v.name === size);
              const isSizeOutOfStock = sizeVariant ? sizeVariant.stock <= 0 : true;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={isSizeOutOfStock}
                  onClick={() => setSelectedSize(size)}
                  className={`h-11 border text-center text-xs tracking-wider uppercase font-medium transition-all relative flex items-center justify-center ${
                    isSelected
                      ? "border-black bg-black text-white font-bold"
                      : "border-border text-foreground hover:border-black"
                  } ${isSizeOutOfStock ? "opacity-30 line-through cursor-not-allowed bg-muted" : ""}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Stock Level & Availability */}
      {selectedVariant && (
        <div className="text-xs font-light text-muted-foreground">
          {isOutOfStock ? (
            <span className="text-destructive uppercase tracking-widest font-semibold">Out of Stock</span>
          ) : (
            <span className="text-emerald-600 uppercase tracking-widest font-semibold">In Stock ({selectedVariant.stock} available)</span>
          )}
          {selectedVariant.sku && (
            <span className="block mt-1 font-mono text-[10px]">SKU: {selectedVariant.sku}</span>
          )}
        </div>
      )}

      {/* 4. Action Area: Quantity Selector & Add to Bag (Uniqlo Horizontal Pill Layout) */}
      <div className="flex gap-4 items-center">
        {/* Quantity Controls */}
        {!isOutOfStock && (
          <div className="flex items-center h-12 border border-border bg-secondary/15 rounded-md overflow-hidden shrink-0">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity(q => q - 1)}
              className="w-10 h-full flex items-center justify-center text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
            >
              —
            </button>
            <div className="w-10 text-center font-medium text-sm">
              {quantity}
            </div>
            <button
              type="button"
              disabled={selectedVariant ? quantity >= selectedVariant.stock : true}
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-full flex items-center justify-center text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
            >
              +
            </button>
          </div>
        )}

        {/* Add To Cart */}
        <Button
          type="button"
          className="flex-1 h-12 bg-black hover:bg-black/90 text-white text-xs tracking-[0.2em] uppercase font-bold transition-all shadow-md rounded-none"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
        >
          {isOutOfStock ? t("outOfStock") : t("addToBag")}
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" className="flex-1 h-10 gap-2 text-[10px] uppercase tracking-widest rounded-none border-border">
          <Heart className="h-3.5 w-3.5" />
          Add to Wishlist
        </Button>
        <Button variant="outline" size="sm" className="h-10 w-12 flex items-center justify-center rounded-none border-border">
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 5. Find in Store Lookup Widget */}
      <div className="border border-border p-4 bg-secondary/10 rounded-sm">
        <button
          type="button"
          onClick={() => setShowStoreStock(!showStoreStock)}
          className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-foreground/80 hover:text-foreground w-full text-left"
        >
          <MapPin className="h-4 w-4 text-primary" />
          <span>Find in Store</span>
        </button>
        <p className="text-[11px] text-muted-foreground font-light mt-1 pl-6">
          Check real-time stock levels at physical store warehouses.
        </p>

        {showStoreStock && (
          <div className="mt-3 pl-6 pt-3 border-t border-border/50 text-xs space-y-2.5 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold block">Store Hanoi (Dong Da)</span>
                <span className="text-[10px] text-muted-foreground font-light">12A Chua Boc, Hanoi</span>
              </div>
              <span className={isOutOfStock ? "text-destructive" : "text-emerald-600 font-medium"}>
                {isOutOfStock ? "Out of stock" : "Low Stock (2)"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold block">Store HCM (District 1)</span>
                <span className="text-[10px] text-muted-foreground font-light">72 Le Thanh Ton, Ho Chi Minh</span>
              </div>
              <span className={isOutOfStock ? "text-destructive" : "text-emerald-600 font-medium"}>
                {isOutOfStock ? "Out of stock" : "In Stock (12)"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
