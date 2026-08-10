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
import { ProductRatingInline, ProductReviews } from "@/components/storefront/product-reviews";

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
  const currency = storeSettingsData?.settings.currency;

  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    const available = product.variants.find((v) => v.stock > 0);
    return available ? available.id : (product.variants[0]?.id || "");
  });
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

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

  const displayImages = [...allImages];
  if (activeImageIdx > 0 && activeImageIdx < displayImages.length) {
    const temp = displayImages[0];
    displayImages[0] = displayImages[activeImageIdx];
    displayImages[activeImageIdx] = temp;
  }

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const isSelectedVariantOnSale = Boolean(selectedVariant?.comparePrice && selectedVariant.comparePrice > selectedVariant.price);
  const selectedStock = selectedVariant?.stock ?? 0;
  const isOutOfStock = selectedStock <= 0;
  const normalizedTitleLength = product.name.trim().length;
  const titleSizeClass = normalizedTitleLength > 64
    ? "text-[1.85rem] lg:text-[2.15rem]"
    : normalizedTitleLength > 36
      ? "text-[2rem] lg:text-[2.55rem]"
      : "text-[2.25rem] lg:text-[3.1rem]";

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
    setActiveImageIdx((prev) => (prev === 0 ? Math.min(allImages.length, 6) - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIdx((prev) => (prev === Math.min(allImages.length, 6) - 1 ? 0 : prev + 1));
  };

  const handleSwipeStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSwipeEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    const touch = event.changedTouches[0];
    swipeStartRef.current = null;
    if (!start || allImages.length < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) handleNextImage();
    else handlePrevImage();
  };

  return (
    <div className="flex w-full flex-col pb-24 lg:pb-10">
      <div className="flex flex-col items-start lg:grid lg:grid-cols-[7fr_6fr] lg:gap-x-0">
        {/* Left Column: Interactive Image Gallery & Accordions */}
        <div className="contents lg:flex lg:w-full lg:flex-col lg:space-y-6">

          {/* Mobile Image Gallery (Slideshow) */}
          <div className="order-1 flex w-full flex-col lg:hidden">
            <div
              className="group relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden bg-muted/40"
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
            >
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
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">No Image Available</span>
                </div>
              )}

              {/* Left/Right Navigation Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-foreground/15 bg-background/90 text-foreground opacity-90 transition-all hover:border-foreground/50 active:scale-95"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-foreground/15 bg-background/90 text-foreground opacity-90 transition-all hover:border-foreground/50 active:scale-95"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Badge */}
              {isSelectedVariantOnSale && (
                <div className="absolute left-3 top-3 bg-foreground px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-background">
                  Sale
                </div>
              )}
            </div>

            {/* Bullet Navigation */}
            {allImages.length > 1 && (
              <div className="flex justify-center gap-2 pb-4 pt-3">
                {allImages.slice(0, 6).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeImageIdx === idx ? "w-6 bg-foreground" : "w-1.5 bg-border hover:bg-foreground/40"}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Image Gallery (Grid) */}
          <div className="order-1 hidden lg:grid w-full grid-cols-2">
            {displayImages.length > 0 ? (
              displayImages.slice(0, 6).map((img, idx) => (
                <div key={idx} className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
                  {isSelectedVariantOnSale && idx === 0 && (
                    <div className="absolute left-2 top-2 z-10 bg-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-background">
                      Sale
                    </div>
                  )}
                  <Image
                    src={img.url}
                    alt={`${product.name} - Image ${idx + 1}`}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    sizes="(max-width: 1024px) 50vw, 30vw"
                    priority={idx < 2}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-2 relative aspect-[3/4] w-full overflow-hidden bg-muted/40 flex items-center justify-center">
                <span className="text-muted-foreground uppercase tracking-widest text-xs">No Image Available</span>
              </div>
            )}
          </div>

          {/* Collapsible details panels */}
          <div className="order-3 border-t border-border/60 divide-y divide-border/60 w-full px-4 sm:px-6 lg:px-0">
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
        <div className="order-2 flex w-full min-w-0 flex-col gap-2 pb-8 px-2 sm:px-4 lg:sticky lg:top-24 lg:w-auto lg:pl-4 xl:pl-8 lg:pr-2 lg:pt-4">

          {/* Header Section (Breadcrumbs, Rating, Title) */}
          <div className="flex flex-col gap-2 border-b border-border/70 pb-4">
            {/* Rating Stars & Reviews */}
            <ProductRatingInline productId={product.id} />

            {/* Product Title */}
            <div>
              <h1 className={`max-w-[22ch] text-pretty break-words font-heading font-medium leading-[1.03] tracking-[0.025em] text-foreground/80 [hyphens:auto] ${titleSizeClass}`}>
                {product.name}
              </h1>
            </div>
          </div>

          {/* Available Vouchers */}
          <ProductVouchers productId={product.id} />

          {/* Purchase Options Section */}
          <div className="flex flex-col gap-4 border border-border/80 bg-card p-4">
            {/* Select Unit Variant Cards */}
            {product.variants.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">
                  {t("colorAndSize")}
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    const vInCart = items.find((item) => item.variantId === v.id);
                    const vQty = vInCart?.quantity || 0;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleVariantSelect(v.id)}
                        className={`relative min-w-0 border px-3 py-2.5 text-center transition-all ${isSelected
                          ? "border-primary bg-primary/[0.04] text-primary"
                          : "border-border bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground"
                          } ${v.stock <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                        disabled={v.stock <= 0}
                      >
                        {vQty > 0 && (
                          <div className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center bg-primary text-[9px] font-bold text-primary-foreground">
                            {vQty}
                          </div>
                        )}
                        {v.stock <= 0 && (
                          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-muted-foreground/60" preserveAspectRatio="none">
                            <line x1="0" y1="100%" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                          </svg>
                        )}
                        <span className="text-[11px] font-bold uppercase tracking-wider">{v.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          <hr className="hidden border-border/40 lg:block" />

          {/* Horizontal Actions Block */}
          <div className="hidden items-center gap-5 lg:grid xl:grid-cols-[minmax(0,1fr)_auto]">
              {/* Active Pricing */}
              <div className="min-w-0 space-y-1">
                <div className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {selectedVariant?.name} Price
                </div>
                {selectedVariant && (
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="whitespace-nowrap text-[clamp(1.75rem,3vw,2rem)] font-black tracking-tight text-primary">
                      {formatPrice(selectedVariant.price, locale, currency)}
                    </span>
                    {isSelectedVariantOnSale && selectedVariant.comparePrice && (
                      <span className="text-xs line-through text-muted-foreground font-light">
                        {formatPrice(selectedVariant.comparePrice, locale, currency)}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-[9px] text-muted-foreground/80 font-light">
                  ({t("taxInclusive")})
                </div>
              </div>

              {/* Quantity Selector & Add Button */}
              <div className={`flex w-full items-center gap-2 transition-transform duration-300 xl:w-auto ${isBumping ? "scale-[1.02]" : "scale-100"}`}>
                {cartQuantity === 0 ? (
                  <Button
                    className="h-12 w-full rounded-none bg-primary px-7 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:min-w-[170px]"
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                  >
                    {isOutOfStock ? t("outOfStock") : t("addToBag")}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex h-12 shrink-0 items-center overflow-hidden border bg-secondary text-foreground">
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
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-none bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:min-w-[140px]"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{locale === "vi" ? "Thanh toán" : "Checkout"}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Stock status indicator */}
          <div className="hidden items-center gap-2 text-xs font-light lg:flex">
              <span className={`h-2 w-2 shrink-0 rounded-full ${isOutOfStock ? "bg-muted-foreground/50" : "bg-primary"}`} />
              <span className="text-muted-foreground">
                {isOutOfStock
                  ? "Out of stock"
                  : selectedStock < 10
                    ? locale === "vi" ? `Chỉ còn ${selectedStock}` : `${selectedStock} left`
                    : "In stock"}
              </span>
            </div>
          </div>

          {/* Why shop from AURIA? */}
          {/* <div className="border border-border/80 bg-card p-4">
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
        </div> */}

        </div>
      </div>

      <ProductReviews productId={product.id} productName={product.name} />

      {/* Mobile Sticky Footer Add to Cart */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/10 bg-background/95 px-3 pb-[max(.625rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden">
        <div className={`mx-auto flex max-w-3xl items-center gap-2 transition-transform duration-300 ${isBumping ? "scale-[1.01]" : "scale-100"}`}>
          <div className="min-w-[5.5rem] flex-1 max-[360px]:hidden">

            <span className="block whitespace-nowrap text-xl font-black leading-tight tracking-tight text-foreground">
              {selectedVariant ? formatPrice(selectedVariant.price, locale, currency) : ""}
            </span>
            {isSelectedVariantOnSale && selectedVariant?.comparePrice && (
              <span className="block text-[12px] leading-none text-muted-foreground line-through">
                {formatPrice(selectedVariant.comparePrice, locale, currency)}
              </span>
            )}
          </div>
          {cartQuantity === 0 ? (
            <Button
              className="h-11 min-w-[9.5rem] flex-[1.35] shrink-0 rounded-none bg-primary px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-primary-foreground shadow-[0_5px_14px_rgba(181,31,48,0.22)] hover:bg-primary/90"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {isOutOfStock ? t("outOfStock") : t("addToBag")}
            </Button>
          ) : (
            <div className="flex min-w-0 flex-[1.8] items-center gap-2">
              <div className="flex h-11 shrink-0 items-center overflow-hidden border border-border/80 bg-secondary/70 text-foreground">
                <button
                  type="button"
                  onClick={() => {
                    if (cartQuantity > 1) {
                      updateQuantity(selectedVariantId, cartQuantity - 1);
                    } else {
                      removeItem(selectedVariantId);
                    }
                  }}
                  className="flex h-full w-9 items-center justify-center text-xl font-medium transition-colors hover:bg-black/5"
                  aria-label={locale === "vi" ? "Giảm số lượng" : "Decrease quantity"}
                >
                  -
                </button>
                <div className="w-8 text-center text-sm font-bold tabular-nums">
                  {cartQuantity}
                </div>
                <button
                  type="button"
                  onClick={() => updateQuantity(selectedVariantId, cartQuantity + 1)}
                  className="flex h-full w-9 items-center justify-center text-xl font-medium transition-colors hover:bg-black/5 disabled:opacity-35"
                  disabled={selectedVariant ? cartQuantity >= selectedVariant.stock : true}
                  aria-label={locale === "vi" ? "Tăng số lượng" : "Increase quantity"}
                >
                  +
                </button>
              </div>
              <Button
                onClick={() => router.push(`/${locale}/checkout`)}
                className="group flex h-11 min-w-[8.75rem] flex-1 items-center justify-between gap-2 rounded-none bg-primary px-4 text-xs font-extrabold uppercase tracking-[0.06em] text-primary-foreground shadow-[0_5px_14px_rgba(181,31,48,0.22)] hover:bg-primary/90"
                aria-label={locale === "vi" ? "Thanh toán" : "Checkout"}
              >
                <span className="whitespace-nowrap">{locale === "vi" ? "Thanh toán" : "Checkout"}</span>
                <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
