"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { ProductVouchers } from "@/components/store/product-vouchers";
import { useQuery } from "@tanstack/react-query";

type Variant = {
  id: string;
  sku: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  isActive?: boolean;
  imageUrl?: string | null;
};

type ProductClientProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    images: { url: string }[];
    variants: Variant[];
  };
  details: {
    description?: string;
    overview?: string;
    materials?: string;
    care?: string;
  };
};

export function ProductClient({ product, details }: ProductClientProps) {
  const locale = useLocale();
  const t = useTranslations("Product");
  const router = useRouter();
  const { data: storeSettingsData } = useQuery<{ settings: { storeName: string; currency: string } }>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load store settings");
      return response.json();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const storeName = storeSettingsData?.settings.storeName || "Store";
  const currency = storeSettingsData?.settings.currency;

  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    const available = product.variants.find((v) => v.stock > 0);
    return available ? available.id : (product.variants[0]?.id || "");
  });
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const cartItem = items.find((item) => item.variantId === selectedVariantId);
  const cartQuantity = cartItem?.quantity || 0;

  const [isBumping, setIsBumping] = useState(false);
  const prevQuantityRef = useRef(cartQuantity);

  useEffect(() => {
    if (cartQuantity > prevQuantityRef.current) {
      setIsBumping(true);
      const timer = setTimeout(() => setIsBumping(false), 300);
      prevQuantityRef.current = cartQuantity;
      return () => clearTimeout(timer);
    }
    prevQuantityRef.current = cartQuantity;
  }, [cartQuantity]);

  // Dynamically build the images list including variant images
  const allImages = [...product.images];
  product.variants.forEach(v => {
    if (v.imageUrl && !allImages.some(img => img.url === v.imageUrl)) {
      allImages.push({ url: v.imageUrl });
    }
  });

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : true;

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant?.imageUrl) {
      const idx = allImages.findIndex(img => img.url === variant.imageUrl);
      if (idx !== -1) {
        setActiveImageIdx(idx);
      }
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      sku: selectedVariant.sku,
      price: Number(selectedVariant.price),
      quantity: 1,
      image: allImages[activeImageIdx]?.url || product.images[0]?.url,
      productSlug: product.slug,
    });
  };

  const handlePrevImage = () => {
    setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-start pb-24 lg:pb-0">
      {/* Left Column: Interactive Image Gallery & Accordions */}
      <div className="contents lg:flex lg:flex-col lg:space-y-8 lg:w-full">

        {/* Image Gallery */}
        <div className="order-1 flex flex-col space-y-4 w-full lg:w-auto">
          <div className="relative aspect-[1/1] sm:aspect-[4/5] w-full bg-secondary overflow-hidden rounded-xl group shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50">
            {allImages[activeImageIdx] ? (
              <Image
                src={allImages[activeImageIdx].url}
                alt={`${product.name} - Image ${activeImageIdx + 1}`}
                fill
                className="object-cover transition-all duration-300"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground uppercase tracking-widest text-xs">No Image Available</span>
              </div>
            )}

            {/* Left/Right Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Badge */}
            {selectedVariant?.comparePrice && (
              <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                Sale
              </div>
            )}

            {/* Slide Indicator */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-md text-foreground text-xs font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                {activeImageIdx + 1} / {allImages.length}
              </div>
            )}
          </div>

          {/* Thumbnails list */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto p-2 scrollbar-thin justify-center">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-lg bg-secondary overflow-hidden shrink-0 transition-all ${activeImageIdx === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "border border-border opacity-70 hover:opacity-100"
                    }`}
                >
                  <Image
                    src={img.url}
                    alt={`${product.name} Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible details panels */}
        <div className="order-3 border-t border-border/60 divide-y divide-border/60 w-full lg:w-auto">
          {details.overview && (
            <details className="py-4 group" open>
              <summary className="flex justify-between items-center cursor-pointer font-bold uppercase tracking-widest text-xs list-none">
                <span>Details</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-180">↓</span>
              </summary>
              <div
                className="mt-3 text-sm font-light text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: details.overview }}
              />
            </details>
          )}

          {details.description && (
            <details className="py-4 group">
              <summary className="flex justify-between items-center cursor-pointer font-bold uppercase tracking-widest text-xs list-none">
                <span>Product Description</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-180">↓</span>
              </summary>
              <div
                className="mt-3 text-sm font-light text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: details.description }}
              />
            </details>
          )}

          {(details.materials || details.care) && (
            <details className="py-4 group">
              <summary className="flex justify-between items-center cursor-pointer font-bold uppercase tracking-widest text-xs list-none">
                <span>Washing & Care Instructions</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-180">↓</span>
              </summary>
              <div className="mt-3 text-sm font-light text-muted-foreground leading-relaxed space-y-4">
                {details.materials && (
                  <div>
                    <h5 className="font-semibold text-foreground text-xs uppercase mb-1">Materials</h5>
                    <div dangerouslySetInnerHTML={{ __html: details.materials }} />
                  </div>
                )}
                {details.care && (
                  <div>
                    <h5 className="font-semibold text-foreground text-xs uppercase mb-1">Care Instructions</h5>
                    <div dangerouslySetInnerHTML={{ __html: details.care }} />
                  </div>
                )}
              </div>
            </details>
          )}

          <details className="py-4 group">
            <summary className="flex justify-between items-center cursor-pointer font-bold uppercase tracking-widest text-xs list-none">
              <span>Shipping & Returns</span>
              <span className="text-muted-foreground transition-transform group-open:rotate-180">↓</span>
            </summary>
            <div className="mt-3 text-sm font-light text-muted-foreground leading-relaxed space-y-2">
              <p>Standard delivery charge of {formatPrice(15, locale, currency)} applies on orders under {formatPrice(100, locale, currency)}. Orders over {formatPrice(100, locale, currency)} qualify for <strong>FREE shipping</strong>.</p>
              <p>Return policy: We offer a 30-day window for hassle-free returns and size exchanges on all unused items in their original packaging.</p>
            </div>
          </details>
        </div>
      </div>

      {/* Right Column: Sticky Sidebar */}
      <div className="order-2 lg:sticky lg:top-28 flex flex-col gap-6 pb-24 lg:pb-32 w-full lg:w-auto">

        {/* Header Section (Breadcrumbs, Rating, Title) */}
        <div className="flex flex-col gap-2.5">
          {/* Breadcrumbs */}
          <div className="text-[11px] text-muted-foreground font-light tracking-wide uppercase flex items-center gap-1.5">
            <span>Home</span>
            <span>/</span>
            <span>All Products</span>
            <span>/</span>
            <span className="text-foreground font-normal">{product.name}</span>
          </div>

          {/* Rating Stars & Reviews */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex text-amber-500">
              {"★★★★★".split("").map((star, i) => (
                <span key={i} className="text-sm">★</span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-light hover:underline cursor-pointer">4.8/5 Excellent • 7000+ reviews</span>
          </div>

          {/* Product Title */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-heading uppercase tracking-widest text-primary font-bold">
              {product.name}
            </h1>
          </div>
        </div>

        {/* Available Vouchers */}
        <ProductVouchers productId={product.id} />

        {/* Purchase Options Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-5">
          {/* Select Unit Variant Cards */}
          {product.variants.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">
                Color & Size
              </span>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  const vInCart = items.find((item) => item.variantId === v.id);
                  const vQty = vInCart?.quantity || 0;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleVariantSelect(v.id)}
                      className={`relative px-4 py-2.5 border-2 rounded-xl text-center transition-all ${isSelected
                        ? "border-primary bg-primary/[0.06] text-primary shadow-sm"
                        : "border-transparent bg-muted/40 hover:bg-muted/70 text-foreground/80 hover:text-foreground"
                        } ${v.stock <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                      disabled={v.stock <= 0}
                    >
                      {vQty > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm z-10">
                          {vQty}
                        </div>
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-wider">{v.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <hr className="border-border/40" />

          {/* Horizontal Actions Block */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            {/* Active Pricing */}
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {selectedVariant?.name} Price
              </div>
              {selectedVariant && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground tracking-tight">
                    {formatPrice(selectedVariant.price, locale, currency)}
                  </span>
                  {selectedVariant.comparePrice && (
                    <span className="text-xs line-through text-muted-foreground font-light">
                      {formatPrice(selectedVariant.comparePrice, locale, currency)}
                    </span>
                  )}
                </div>
              )}
              <div className="text-[9px] text-muted-foreground/80 font-light">
                (Inclusive of all taxes)
              </div>
            </div>

            {/* Quantity Selector & Add Button */}
            <div className={`flex items-center gap-3 w-full sm:w-auto transition-transform duration-300 ${isBumping ? "scale-[1.03]" : "scale-100"}`}>
              {cartQuantity === 0 ? (
                <Button
                  className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm tracking-wider font-bold uppercase px-8 w-full sm:min-w-[160px] shadow-xl shadow-primary/25 transition-all"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                >
                  {isOutOfStock ? t("outOfStock") : t("addToBag")}
                </Button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center h-14 rounded-2xl bg-secondary text-foreground overflow-hidden shrink-0 shadow-sm border border-border/40">
                    <button
                      type="button"
                      onClick={() => {
                        if (cartQuantity > 1) {
                          updateQuantity(selectedVariantId, cartQuantity - 1);
                        } else {
                          removeItem(selectedVariantId);
                        }
                      }}
                      className="w-12 h-full flex items-center justify-center hover:bg-black/5 transition-colors font-medium text-2xl"
                    >
                      -
                    </button>
                    <div className="w-10 flex items-center justify-center font-bold text-base">
                      {cartQuantity}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateQuantity(selectedVariantId, cartQuantity + 1)}
                      className="w-12 h-full flex items-center justify-center hover:bg-black/5 transition-colors font-medium text-2xl"
                      disabled={selectedVariant ? cartQuantity >= selectedVariant.stock : true}
                    >
                      +
                    </button>
                  </div>
                  <Button
                    onClick={() => router.push(`/${locale}/checkout`)}
                    className="h-14 flex-1 sm:min-w-[140px] rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm tracking-wider font-bold uppercase shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{locale === "vi" ? "Thanh toán" : "Checkout"}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stock status indicator */}
          <div className="flex items-center gap-2 text-xs font-light">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOutOfStock ? "bg-destructive" : "bg-primary animate-pulse"}`} />
            <span className="text-muted-foreground">
              {isOutOfStock ? "Out of Stock" : "In Stock - Ready to ship"}
            </span>
          </div>
        </div>

        {/* Why shop from AURIA? */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5">
          <h3 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Why shop from {storeName}?</h3>
          <div className="space-y-3">
            <div className="flex gap-2.5 items-start text-xs">
              <div className="shrink-0 text-base leading-none mt-0.5">🛡️</div>
              <div>
                <span className="font-medium text-foreground">100-Day Fit & Feel Guarantee!</span> <span className="text-muted-foreground font-light">Not in love with the fit? We&apos;ll make it right. No questions asked.</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start text-xs">
              <div className="shrink-0 text-base leading-none mt-0.5">🚚</div>
              <div>
                <span className="font-medium text-foreground">Free shipping on orders over {formatPrice(100, locale, currency)}.</span> <span className="text-muted-foreground font-light">Free standard shipping applied automatically at checkout.</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start text-xs">
              <div className="shrink-0 text-base leading-none mt-0.5">✨</div>
              <div>
                <span className="font-medium text-foreground">Premium Silk-Touch Fabrics.</span> <span className="text-muted-foreground font-light">Buttery soft, wire-free essentials designed for all-day comfort.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Footer Add to Cart */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className={`flex items-center gap-4 transition-transform duration-300 ${isBumping ? "scale-[1.02]" : "scale-100"}`}>
          <div className="flex flex-col flex-1">
            <span className="text-sm font-bold text-foreground">
              {selectedVariant ? formatPrice(selectedVariant.price, locale, currency) : ""}
            </span>
            {selectedVariant?.comparePrice && (
              <span className="text-xs line-through text-muted-foreground font-light">
                {formatPrice(selectedVariant.comparePrice, locale, currency)}
              </span>
            )}
          </div>
          {cartQuantity === 0 ? (
            <Button
              className="h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase px-8 flex-shrink-0 shadow-sm"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {isOutOfStock ? t("outOfStock") : t("addToBag")}
            </Button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center h-14 rounded-full bg-secondary text-foreground overflow-hidden shrink-0 shadow-sm border border-border/40">
                <button
                  type="button"
                  onClick={() => {
                    if (cartQuantity > 1) {
                      updateQuantity(selectedVariantId, cartQuantity - 1);
                    } else {
                      removeItem(selectedVariantId);
                    }
                  }}
                  className="w-12 h-full flex items-center justify-center hover:bg-black/5 transition-colors font-medium text-2xl"
                >
                  -
                </button>
                <div className="w-10 text-center font-bold text-base">
                  {cartQuantity}
                </div>
                <button
                  type="button"
                  onClick={() => updateQuantity(selectedVariantId, cartQuantity + 1)}
                  className="w-12 h-full flex items-center justify-center hover:bg-black/5 transition-colors font-medium text-2xl"
                  disabled={selectedVariant ? cartQuantity >= selectedVariant.stock : true}
                >
                  +
                </button>
              </div>
              <Button
                onClick={() => router.push(`/${locale}/checkout`)}
                className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 shadow-xl shadow-primary/25 flex items-center justify-center p-0"
                aria-label={locale === "vi" ? "Thanh toán" : "Checkout"}
              >
                <ShoppingBag className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
