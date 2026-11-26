"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X, ShoppingBag } from "lucide-react";
import { ProductVouchers } from "@/components/store/product-vouchers";
import type { ProductPromotion } from "@/lib/product-promotion";
import { ProductRatingInline, ProductReviews } from "@/components/storefront/product-reviews";
import { ExpressCutoff, ProductDemand, RecentPurchaseToast, useProductActivity, useStorefrontHydration } from "@/components/storefront/product-urgency";
import {
  BundleReward,
  BundleSelector,
  CartAddedSheet,
  getUpgradeOffer,
  getVariantOffers,
  MicroTrustRow,
  OfferPrice,
  ProductComparisonSection,
} from "./cro-product-offer";

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
  promotion: ProductPromotion | null;
  currency: string;
  lowStockThreshold: number;
  ratingSummary: { total: number; average: number };
  product: {
    id: string;
    name: string;
    slug: string;
    images: { url: string }[];
    cardHoverImageUrl?: string | null;
    variants: Variant[];
  };
  details: {
    summary?: string;
    description?: string;
    overview?: string;
    materials?: string;
    care?: string;
  };
};

export function ProductClient({ product, details, promotion, currency, lowStockThreshold, ratingSummary }: ProductClientProps) {
  const locale = useLocale();
  const t = useTranslations("Product");
  const router = useRouter();
  const isCroExperience = promotion?.enabled === true;
  const hydrated = useStorefrontHydration();
  const activityQuery = useProductActivity(isCroExperience ? product.slug : null);
  const activity = !hydrated || activityQuery.isError ? undefined : activityQuery.data;
  const expressShipping = activityQuery.isError ? null : activity
    ? activity.expressShipping : promotion?.expressShipping;
  const variants = product.variants.map((variant) => ({
    ...variant,
    stock: activity?.stock[variant.id] ?? variant.stock,
  }));
  const offers = getVariantOffers(variants, isCroExperience && promotion.bundleUpgrade);
  const initialOffer = offers.find((offer) => offer.stock > 0) ?? offers[0];
  const [chosenVariantId, setSelectedVariantId] = useState<string>();
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [touchDragX, setTouchDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number; lockedAxis?: "x" | "y" } | null>(null);

  // Fullscreen Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [cartSheetVariantId, setCartSheetVariantId] = useState<string | null>(null);
  const [showDesktopSticky, setShowDesktopSticky] = useState(false);
  const purchaseButtonRef = useRef<HTMLButtonElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const [stickyHeight, setStickyHeight] = useState(0);

  useEffect(() => {
    const bar = stickyBarRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(() => setStickyHeight(bar.offsetHeight));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [isCroExperience, promotion?.stickyBar, product.variants.length]);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const getCartQuantity = (id: string) => items.find((item) => item.variantId === id)?.quantity ?? 0;
  const eligibleOffers = offers
    .filter((offer) => offer.perPair !== null && offer.stock > getCartQuantity(offer.id))
    .sort((a, b) => (a.perPair ?? Infinity) - (b.perPair ?? Infinity));
  const [topOffer, nextOffer] = eligibleOffers;
  const bestBundleVariant = topOffer && nextOffer && (topOffer.pairCount ?? 0) > 1 && topOffer.perPair !== nextOffer.perPair
    ? topOffer : undefined;
  const preferredOffer = promotion?.defaultVariant === "best-value" ? bestBundleVariant : undefined;
  const selectedVariant = offers.find((offer) => offer.id === chosenVariantId) ?? preferredOffer ?? initialOffer;
  const selectedVariantId = selectedVariant?.id ?? "";
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

  useEffect(() => {
    const button = purchaseButtonRef.current;
    if (!button || !isCroExperience || !promotion.stickyBar) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowDesktopSticky(!entry.isIntersecting && entry.boundingClientRect.bottom < 112);
    }, { rootMargin: "-112px 0px 0px 0px" });
    observer.observe(button);
    return () => observer.disconnect();
  }, [isCroExperience, promotion?.stickyBar]);

  // Dynamically build the images list including variant images
  const allImages = [...product.images];
  product.variants.forEach(v => {
    if (v.imageUrl && !allImages.some(img => img.url === v.imageUrl)) {
      allImages.push({ url: v.imageUrl });
    }
  });

  // Reorder images to put the secondary image at index 1
  if (product.cardHoverImageUrl) {
    const secondaryIdx = allImages.findIndex(img => img.url === product.cardHoverImageUrl);
    if (secondaryIdx > 1) {
      const [secondaryImg] = allImages.splice(secondaryIdx, 1);
      allImages.splice(1, 0, secondaryImg);
    }
  }

  const displayImages = [...allImages];
  if (activeImageIdx > 0 && activeImageIdx < displayImages.length) {
    const temp = displayImages[0];
    displayImages[0] = displayImages[activeImageIdx];
    displayImages[activeImageIdx] = temp;
  }

  const isSelectedVariantOnSale = Boolean(selectedVariant?.comparePrice && selectedVariant.comparePrice > selectedVariant.price);
  const selectedStock = selectedVariant?.stock ?? 0;
  const isOutOfStock = selectedStock <= 0;
  const stockThreshold = promotion?.lowStockThreshold ?? lowStockThreshold;
  const openCart = () => {
    if (promotion?.cartDrawer && selectedVariant) {
      setCartSheetVariantId(selectedVariant.id);
      setCartSheetOpen(true);
    } else {
      router.push(`/${locale}/checkout`);
    }
  };
  const handlePromotionPurchase = cartQuantity > 0 ? openCart : handleAddToCart;
  const promotionCta = cartQuantity > 0 ? t("viewBag") : isOutOfStock ? t("outOfStock") : t("addToBag");
  const normalizedTitleLength = product.name.trim().length;
  const titleSizeClass = normalizedTitleLength > 64
    ? "text-[1.85rem] lg:text-[2.15rem]"
    : normalizedTitleLength > 36
      ? "text-[2rem] lg:text-[2.55rem]"
      : "text-[2.25rem] lg:text-[3.1rem]";
  const selectedBundleSavings = selectedVariant?.savings ?? 0;
  const upgradeOffer = selectedVariant
    ? getUpgradeOffer(offers, selectedVariant, getCartQuantity)
    : undefined;
  const rewardOffer = upgradeOffer ?? (selectedVariant?.id === bestBundleVariant?.id ? bestBundleVariant : undefined);
  const cartSheetVariant = offers.find((offer) => offer.id === cartSheetVariantId);
  const cartUpgradeOffer = cartSheetVariant && getCartQuantity(cartSheetVariant.id) > 0
    ? getUpgradeOffer(offers, cartSheetVariant, getCartQuantity)
    : undefined;
  const cartSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant?.imageUrl) {
      const idx = allImages.findIndex(img => img.url === variant.imageUrl);
      if (idx >= 0 && idx < 8) {
        setActiveImageIdx(idx);
      }
    }
  };

  function createCartItem(variant: Variant): CartItem {
    return {
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      price: variant.price,
      quantity: 1,
      image: variant.imageUrl || product.images[0]?.url,
      productSlug: product.slug,
    };
  }

  function handleAddToCart() {
    if (!selectedVariant) return;
    const currentItem = useCartStore.getState().items.find((item) => item.variantId === selectedVariant.id);
    if ((currentItem?.quantity ?? 0) >= selectedVariant.stock) return;
    addItem(createCartItem(selectedVariant));
    if (isCroExperience) {
      setSelectedVariantId(selectedVariant.id);
      if (promotion.cartDrawer) openCart();
    }
  }

  const handleUpgradeCartBundle = () => {
    if (!cartSheetVariant || !cartUpgradeOffer) return;
    const upgraded = useCartStore.getState().replaceOne(
      cartSheetVariant.id,
      createCartItem(cartUpgradeOffer),
      cartUpgradeOffer.stock,
    );
    if (!upgraded) return;
    handleVariantSelect(cartUpgradeOffer.id);
    setCartSheetVariantId(cartUpgradeOffer.id);
  };

  function changeDrawerQuantity(delta: number) {
    if (!cartSheetVariant) return;
    const cart = useCartStore.getState();
    const quantity = cart.items.find((item) => item.variantId === cartSheetVariant.id)?.quantity ?? 0;
    const nextQuantity = quantity + delta;
    if (!quantity || (delta > 0 && nextQuantity > cartSheetVariant.stock)) return;
    if (nextQuantity > 0) {
      cart.updateQuantity(cartSheetVariant.id, nextQuantity);
    } else {
      cart.removeItem(cartSheetVariant.id);
      setCartSheetOpen(false);
    }
  }

  const galleryImages = allImages.slice(0, 8);

  const handlePrevImage = () => {
    if (galleryImages.length < 2) return;
    setActiveImageIdx((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (galleryImages.length < 2) return;
    setActiveImageIdx((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleSwipeStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (galleryImages.length < 2) return;
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
    setTouchDragX(0);
  };

  const handleSwipeMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start || galleryImages.length < 2) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (!start.lockedAxis) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      start.lockedAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }

    if (start.lockedAxis === "x") {
      setTouchDragX(deltaX);
    }
  };

  const handleSwipeEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    const touch = event.changedTouches[0];
    swipeStartRef.current = null;
    setIsDragging(false);
    setTouchDragX(0);
    if (!start || galleryImages.length < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (start.lockedAxis === "y" || Math.abs(deltaX) < 35 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) handleNextImage();
    else handlePrevImage();
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setLightboxIdx((prev) => (prev === 0 ? Math.min(allImages.length, 6) - 1 : prev - 1));
      if (e.key === "ArrowRight") setLightboxIdx((prev) => (prev === Math.min(allImages.length, 6) - 1 ? 0 : prev + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, allImages.length]);

  return (
    <div className={`flex w-full flex-col ${isCroExperience ? promotion.stickyBar ? "bg-[#FDFBF9] pb-40" : "bg-[#FDFBF9] pb-10" : "pb-24"}`}>
      <div className="flex flex-col items-start lg:grid lg:grid-cols-[7fr_6fr] lg:gap-x-0">
        {/* Left Column: Interactive Image Gallery & Accordions */}
        <div className="contents lg:flex lg:w-full lg:flex-col lg:space-y-6">

          {/* Mobile Image Gallery (Slideshow) */}
          <div className="order-1 flex w-full flex-col lg:hidden">
            <div
              className={`group relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden bg-muted/40 ${isCroExperience ? "max-h-[32svh] max-sm:[@media(max-height:700px)]:max-h-[20svh]" : ""}`}
              onTouchStart={handleSwipeStart}
              onTouchMove={handleSwipeMove}
              onTouchEnd={handleSwipeEnd}
              onTouchCancel={() => {
                swipeStartRef.current = null;
                setIsDragging(false);
                setTouchDragX(0);
              }}
            >
              {galleryImages.length > 0 ? (
                <div
                  className={`flex h-full w-full will-change-transform ${
                    isDragging ? "" : "transition-transform duration-200 ease-out"
                  }`}
                  style={{
                    transform: `translate3d(calc(-${activeImageIdx * 100}% + ${touchDragX}px), 0, 0)`,
                  }}
                >
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="relative h-full w-full shrink-0">
                      <Image
                        src={img.url}
                        alt={`${product.name} - Image ${idx + 1}`}
                        fill
                        className="object-cover pointer-events-none"
                        sizes="100vw"
                        priority={idx <= 1}
                        loading="eager"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">No Image Available</span>
                </div>
              )}

              {/* Left/Right Navigation Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-foreground/15 bg-background/90 text-foreground opacity-90 transition-all hover:border-foreground/50 active:scale-95"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-foreground/15 bg-background/90 text-foreground opacity-90 transition-all hover:border-foreground/50 active:scale-95"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Badge */}
              {isSelectedVariantOnSale && (
                <div className="absolute left-3 top-3 z-10 bg-foreground px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-background">
                  Sale
                </div>
              )}
            </div>

            {/* Thumbnail Strip Below Hero Image */}
            {galleryImages.length > 1 && (
              <div className={`flex items-center gap-2 overflow-x-auto px-3 pb-3 pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isCroExperience ? "max-sm:[@media(max-height:700px)]:py-1.5" : ""}`}>
                {galleryImages.map((img, idx) => {
                  const isActive = activeImageIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-none border transition-all ${isCroExperience ? "max-sm:[@media(max-height:700px)]:size-8" : ""} ${
                        isActive
                          ? "border-primary ring-1 ring-primary opacity-100"
                          : "border-border/60 opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    >
                      <Image
                        src={img.url}
                        alt={`${product.name} - Thumbnail ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                        loading="eager"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Image Gallery (Grid) */}
          <div className="order-1 hidden lg:grid w-full grid-cols-2">
            {displayImages.length > 0 ? (
              displayImages.slice(0, 6).map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setLightboxIdx(idx);
                    setLightboxOpen(true);
                  }}
                  className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40 cursor-zoom-in outline-none"
                >
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
                </button>
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
                  <span>{isCroExperience ? "Điểm nổi bật" : "Details"}</span>
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
                  <span>{isCroExperience ? "Thông tin sản phẩm" : "Product Description"}</span>
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
                  <span>{isCroExperience ? "Chất liệu & cách bảo quản" : "Washing & Care Instructions"}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">↓</span>
                </summary>
                <div className="mt-3 text-sm font-light text-muted-foreground leading-relaxed space-y-4">
                  {details.materials && (
                    <div>
                      <h5 className="font-semibold text-foreground text-xs uppercase mb-1">{isCroExperience ? "Chất liệu" : "Materials"}</h5>
                      <div dangerouslySetInnerHTML={{ __html: details.materials }} />
                    </div>
                  )}
                  {details.care && (
                    <div>
                      <h5 className="font-semibold text-foreground text-xs uppercase mb-1">{isCroExperience ? "Cách sử dụng & bảo quản" : "Care Instructions"}</h5>
                      <div dangerouslySetInnerHTML={{ __html: details.care }} />
                    </div>
                  )}
                </div>
              </details>
            )}

            <details className="py-4 group">
              <summary className="flex justify-between items-center cursor-pointer font-bold uppercase tracking-widest text-xs list-none">
                <span>{isCroExperience ? "Giao hàng & đổi trả" : "Shipping & Returns"}</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-180">↓</span>
              </summary>
              <div className="mt-3 text-sm font-light text-muted-foreground leading-relaxed space-y-2">
                {isCroExperience ? (
                  <>
                    <p>Phí vận chuyển được tính theo địa chỉ và hiển thị rõ trước khi bạn xác nhận đơn.</p>
                    {promotion.returnPolicy && <p className="whitespace-pre-line">{promotion.returnPolicy}</p>}
                  </>
                ) : (
                  <>
                    <p>Standard delivery charge of {formatPrice(15, locale, currency)} applies on orders under {formatPrice(100, locale, currency)}. Orders over {formatPrice(100, locale, currency)} qualify for <strong>FREE shipping</strong>.</p>
                    <p>Return policy: We offer a 30-day window for hassle-free returns and size exchanges on all unused items in their original packaging.</p>
                  </>
                )}
              </div>
            </details>
          </div>
        </div>

        {/* Right Column: Sticky Sidebar */}
        <div className="order-2 flex w-full min-w-0 flex-col gap-2 pb-8 px-2 sm:px-4 lg:sticky lg:top-24 lg:w-auto lg:pl-4 xl:pl-8 lg:pr-2 lg:pt-4">

          {/* Header Section (Breadcrumbs, Rating, Title) */}
          <div className="flex flex-col gap-2 border-b border-border/70 pb-4">
            {/* Rating Stars & Reviews */}
            <ProductRatingInline productId={product.id} emphasizeAuthenticity={isCroExperience}
              initialSummary={isCroExperience ? ratingSummary : undefined} sold={activity?.sold} />

            {/* Product Title */}
            <div>
              <h1 className={`max-w-[22ch] text-pretty break-words font-heading font-medium leading-[1.03] tracking-[0.025em] text-foreground/80 [hyphens:auto] ${titleSizeClass} ${isCroExperience ? "mb-1 max-sm:text-[1.65rem]" : ""}`}>
                {product.name}
              </h1>
            </div>

            {isCroExperience && (
              <>
                {(promotion.intro ?? details.summary) && (
                  <p className="max-w-xl text-sm leading-5 text-[#604b52] lg:leading-6">
                    {promotion.intro ?? details.summary}
                  </p>
                )}
                <ProductDemand slug={product.slug} track={promotion.liveViewers !== false}
                  stock={selectedVariant ? activity?.stock[selectedVariant.id] : undefined}
                  threshold={stockThreshold} variant={selectedVariant?.name} />
                {selectedVariant && (
                  <div className={promotion.stickyBar ? "max-sm:[@media(max-height:700px)]:hidden" : undefined}>
                    <OfferPrice offer={selectedVariant} locale={locale} currency={currency} />
                  </div>
                )}
                {expressShipping && !isOutOfStock && (
                  <div className={promotion.stickyBar ? "hidden empty:hidden lg:block" : "empty:hidden"}>
                    <ExpressCutoff express={expressShipping} />
                  </div>
                )}
                {!!promotion.benefits?.length && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {promotion.benefits.map((benefit, index) => (
                      <span key={index} className="max-w-full break-words border border-[#e4d5d8] bg-[#fbf2f4] px-2.5 py-1 text-[10px] font-semibold text-[#6d2b40]">
                        {benefit}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Available Vouchers */}
          <div id={isCroExperience ? "product-vouchers" : undefined} className="scroll-mt-32 empty:hidden">
            <ProductVouchers productId={product.id} />
          </div>

          {/* Purchase Options Section */}
          <div id={isCroExperience ? "product-purchase" : undefined} className={`flex scroll-mt-32 flex-col gap-4 border bg-card p-4 ${isCroExperience ? "border-[#d9c4ca] shadow-[0_18px_45px_rgba(89,36,53,0.08)]" : "border-border/80"}`}>
            {/* Select Unit Variant Cards */}
            {isCroExperience ? (
              <>
                {offers.length > 0 && <BundleSelector
                  variants={offers}
                  selectedVariantId={selectedVariantId}
                  onSelect={handleVariantSelect}
                  locale={locale}
                  currency={currency}
                  bestVariantId={bestBundleVariant?.id}
                />}
                {selectedVariant && rewardOffer && <BundleReward
                  selectedVariant={selectedVariant}
                  bestVariant={rewardOffer}
                  locale={locale}
                  currency={currency}
                  onUpgrade={() => handleVariantSelect(rewardOffer.id)}
                />}
                <Button
                  ref={purchaseButtonRef}
                  type="button"
                  onClick={handlePromotionPurchase}
                  disabled={isOutOfStock && cartQuantity === 0}
                  className="h-13 w-full rounded-none bg-[#7a1c37] text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(122,28,55,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#68162e] hover:shadow-[0_14px_28px_rgba(122,28,55,0.26)]"
                >
                  {promotionCta}
                </Button>
                {!!promotion.trustLabels?.length && <MicroTrustRow labels={promotion.trustLabels} />}
              </>
            ) : product.variants.length > 0 && (
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
                          ? "border-foreground bg-foreground/5 text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
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

          {!isCroExperience && <hr className="hidden border-border/40 lg:block" />}

          {/* Horizontal Actions Block */}
          {!isCroExperience && <div className="hidden items-center gap-5 lg:grid xl:grid-cols-[minmax(0,1fr)_auto]">
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
            </div>}

            {/* Stock status indicator */}
          {!isCroExperience && <div className="hidden items-center gap-2 text-xs font-light lg:flex">
              <span className={`h-2 w-2 shrink-0 rounded-full ${isOutOfStock ? "bg-muted-foreground/50" : "bg-primary"}`} />
              <span className="text-muted-foreground">
                {isOutOfStock
                  ? "Out of stock"
                  : selectedStock < 10
                    ? locale === "vi" ? `Chỉ còn ${selectedStock}` : `${selectedStock} left`
                    : "In stock"}
              </span>
            </div>}
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

      {isCroExperience && promotion.comparison && <ProductComparisonSection comparison={promotion.comparison} />}

      <ProductReviews productId={product.id} productName={product.name} />

      {/* Mobile Sticky Footer Add to Cart */}
      {!isCroExperience && <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/10 bg-background/95 px-3 pb-[max(.625rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden">
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
      </div>}

      {isCroExperience && promotion.stickyBar && selectedVariant && (
        <div
          ref={stickyBarRef}
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#dac3ca] bg-[#fdfbf9]/95 px-3 pb-[max(.625rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(60,27,38,0.1)] backdrop-blur-xl lg:px-6 lg:py-3 ${showDesktopSticky ? "" : "lg:hidden"}`}
        >
          {expressShipping && !isOutOfStock && (
            <div className="mb-1.5 empty:hidden lg:hidden"><ExpressCutoff express={expressShipping} /></div>
          )}
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 lg:gap-6">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7a1c37]">
                <span className="hidden lg:inline">{product.name} · </span>{selectedVariant.name}
              </p>
              <div className="mt-0.5 lg:hidden" data-pdp-sticky-price>
                <OfferPrice offer={selectedVariant} locale={locale} currency={currency} layout="sticky" />
              </div>
              <div className="mt-0.5 hidden flex-wrap items-baseline gap-x-2 lg:flex">
                <span className="whitespace-nowrap text-lg font-black text-[#3d2930] lg:text-xl">{formatPrice(selectedVariant.price, locale, currency)}</span>
                {selectedBundleSavings > 0 && (
                  <span className="rounded-full bg-[#f5e5e9] px-1.5 py-0.5 text-[9px] font-bold text-[#7a1c37]">
                    Tiết kiệm {formatPrice(selectedBundleSavings, locale, currency)}
                  </span>
                )}
              </div>
            </div>
            {expressShipping && !isOutOfStock && (
              <div className="hidden max-w-sm empty:hidden lg:block"><ExpressCutoff express={expressShipping} /></div>
            )}
            <div className="shrink-0">
              <Button
                type="button"
                onClick={handlePromotionPurchase}
                disabled={isOutOfStock && cartQuantity === 0}
                className="h-11 rounded-none bg-[#7a1c37] px-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-[#68162e] lg:min-w-52 lg:px-7 lg:text-[11px]"
              >
                {promotionCta}
              </Button>
            </div>
          </div>
          {!!promotion.trustLabels?.length && (
            <p className="mt-1 text-center text-[10px] font-medium text-[#584149] lg:hidden">
              {promotion.trustLabels.join(" · ")}
            </p>
          )}
        </div>
      )}

      {isCroExperience && promotion.purchaseToast !== false && (
        <RecentPurchaseToast recent={activity?.recent ?? null} imageUrl={product.images[0]?.url}
          stickyHeight={promotion.stickyBar ? stickyHeight : 0} paused={cartSheetOpen || lightboxOpen} />
      )}

      {isCroExperience && promotion.cartDrawer && (
        <CartAddedSheet
          open={cartSheetOpen}
          onOpenChange={setCartSheetOpen}
          productName={product.name}
          imageUrl={cartSheetVariant?.imageUrl || allImages[0]?.url}
          selectedVariant={cartSheetVariant}
          quantity={getCartQuantity(cartSheetVariantId ?? "")}
          onQuantityChange={changeDrawerQuantity}
          upgradeVariant={cartUpgradeOffer}
          locale={locale}
          currency={currency}
          cartSubtotal={cartSubtotal}
          onUpgrade={handleUpgradeCartBundle}
          onCheckout={() => router.push(`/${locale}/checkout`)}
        />
      )}

      {/* Fullscreen Lightbox (Desktop) */}
      {lightboxOpen && allImages.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-6 top-6 z-[110] flex h-12 w-12 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background transition-colors"
            aria-label="Close gallery"
          >
            <X className="h-6 w-6" />
          </button>

          {allImages.length > 1 && (
            <button
              onClick={() => setLightboxIdx((prev) => (prev === 0 ? Math.min(allImages.length, 6) - 1 : prev - 1))}
              className="absolute left-6 top-1/2 z-[110] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {allImages.length > 1 && (
            <button
              onClick={() => setLightboxIdx((prev) => (prev === Math.min(allImages.length, 6) - 1 ? 0 : prev + 1))}
              className="absolute right-6 top-1/2 z-[110] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="relative flex h-full max-h-[90vh] w-full max-w-[90vw] items-center justify-center">
            {allImages[lightboxIdx] && (
              <Image
                src={allImages[lightboxIdx].url}
                alt={`${product.name} - Gallery Image ${lightboxIdx + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            )}
          </div>
          
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {allImages.slice(0, 6).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setLightboxIdx(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${lightboxIdx === idx ? "w-8 bg-foreground" : "w-2 bg-foreground/30 hover:bg-foreground/60"}`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
