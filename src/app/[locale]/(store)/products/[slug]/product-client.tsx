"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ProductVouchers } from "@/components/store/product-vouchers";
import type { ProductPromotion } from "@/lib/product-promotion";
import { hasLiveBundlePrices } from "@/lib/auria-product-offers";
import { ProductRatingInline, ProductReviews } from "@/components/storefront/product-reviews";
import palette from "@/components/storefront/product-palette.module.css";
import { useProductActivity, useStorefrontHydration } from "@/components/storefront/product-urgency";
import {
  BundleSelector,
  DeliveryNotes,
  getUpgradeOffer,
  getVariantOffers,
  OfferPrice,
  ProductComparisonSection,
} from "./cro-product-offer";
import { CartDrawer } from "./cart-drawer";
import { OfferCountdown } from "./offer-countdown";
import { ProductGallery } from "./product-gallery";
import { StickyMobileBar } from "./sticky-mobile-bar";
import type { ReviewPreview } from "./review-preview.server";

type Variant = {
  id: string;
  sku: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  imageUrl?: string | null;
};

type ProductClientProps = {
  promotion: ProductPromotion | null;
  reviewPreview?: ReviewPreview;
  currency: string;
  ratingSummary: { total: number; average: number };
  product: {
    id: string;
    name: string;
    slug: string;
    images: { url: string; alt?: string | null }[];
    cardHoverImageUrl?: string | null;
    variants: Variant[];
  };
  details: {
    description?: string;
    overview?: string;
    materials?: string;
    care?: string;
  };
};

const galleryPreviews = new Map([
  [
    "https://cdn.dashgo.vn/1791780249750-1791778537441_282073252119084964_8384377736422963477_467ad73096ec199b0d041c644e80994e.jpg",
    "/banners/product-gallery/mieng-dan-nhu-hoa-tron-neutral.webp",
  ],
]);

const emptyCart: CartItem[] = [];
type OfferEvent = "pdp_bundle_selected" | "pdp_atc_clicked" | "cart_upsell_accepted" | "begin_checkout";

export function ProductClient({ product, details, promotion, currency, ratingSummary, reviewPreview }: ProductClientProps) {
  const locale = useLocale();
  const t = useTranslations("Product");
  const tOffer = useTranslations("ProductOffer");
  const router = useRouter();
  const activePromotion = promotion?.enabled ? promotion : null;
  const cartDrawerEnabled = activePromotion?.cartDrawer ?? false;
  const hydrated = useStorefrontHydration();
  const activityQuery = useProductActivity(product.slug);
  const activity = hydrated && !activityQuery.isError ? activityQuery.data : undefined;

  const offers = getVariantOffers(product.variants.map((variant) => ({
    ...variant,
    stock: activity?.stock[variant.id] ?? variant.stock,
    price: activity?.prices?.[variant.id] ?? variant.price,
  })));

  const [chosenVariantId, setSelectedVariantId] = useState<string>();
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [cartSheetVariantId, setCartSheetVariantId] = useState<string>();
  const [expiredCampaignEnd, setExpiredCampaignEnd] = useState<string>();
  const purchaseButtonRef = useRef<HTMLButtonElement>(null);
  const shippingDetailsRef = useRef<HTMLDetailsElement>(null);

  const storedItems = useCartStore((state) => state.items);
  const items = hydrated ? storedItems : emptyCart;
  const addItem = useCartStore((state) => state.addItem);
  const syncPrices = useCartStore((state) => state.syncPrices);
  const livePrices = activity?.prices;

  useEffect(() => {
    if (livePrices) syncPrices(livePrices);
  }, [livePrices, syncPrices]);

  const getCartQuantity = (id: string) => items.find((item) => item.variantId === id)?.quantity ?? 0;
  const chosenOffer = offers.find((offer) => offer.id === chosenVariantId);
  const firstAvailableOffer = offers.find((offer) => offer.stock > 0) ?? offers[0];
  const selectedSize = (chosenOffer ?? firstAvailableOffer)?.size;
  const sizeOffers = offers.filter((offer) => offer.size === selectedSize && offer.stock > 0);
  const [lowestUnitPrice, nextLowestUnitPrice] = sizeOffers
    .filter((offer) => offer.perPair !== null)
    .sort((a, b) => (a.perPair ?? Infinity) - (b.perPair ?? Infinity));
  const bestBundleVariant = lowestUnitPrice?.pairCount && lowestUnitPrice.pairCount > 1
    && lowestUnitPrice.perPair !== null && nextLowestUnitPrice?.perPair != null
    && lowestUnitPrice.perPair < nextLowestUnitPrice.perPair
    ? lowestUnitPrice : undefined;
  const suggestedBundle = sizeOffers.find((offer) => offer.pairCount === 2 && (offer.savings > 0 || offer.size !== null));
  const preferredOffer = activePromotion?.defaultVariant === "best-value" ? bestBundleVariant : suggestedBundle;
  const selectedVariant = chosenOffer ?? preferredOffer ?? firstAvailableOffer;
  const cartQuantity = selectedVariant ? getCartQuantity(selectedVariant.id) : 0;
  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;
  const showViewBag = Boolean(cartQuantity && selectedVariant && (!cartDrawerEnabled || cartQuantity >= selectedVariant.stock));
  const purchaseLabel = showViewBag ? t("viewBag") : isOutOfStock ? t("outOfStock") : t("addToBag");
  const purchaseDisabled = isOutOfStock && !showViewBag;
  const priceText = selectedVariant ? formatPrice(selectedVariant.price, locale, currency) : "";

  const galleryImages = [...product.images];
  for (const variant of product.variants) {
    if (variant.imageUrl && !galleryImages.some((image) => image.url === variant.imageUrl)) {
      galleryImages.push({ url: variant.imageUrl });
    }
  }
  const leadPhoto = activePromotion?.galleryLeadImage ? product.images[activePromotion.galleryLeadImage - 1] : undefined;
  const leadIndex = galleryImages.findIndex((image) => image.url === leadPhoto?.url);
  if (leadIndex > 0) galleryImages.unshift(...galleryImages.splice(leadIndex, 1));

  const secondaryIndex = galleryImages.findIndex((image) => image.url === product.cardHoverImageUrl);
  if (secondaryIndex > 1) galleryImages.splice(1, 0, ...galleryImages.splice(secondaryIndex, 1));
  const previews = galleryImages.map((image) => ({ ...image, url: galleryPreviews.get(image.url) ?? image.url }));
  const lightboxCount = galleryImages.length;

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") setLightboxIdx((index) => (index + lightboxCount - 1) % lightboxCount);
      if (event.key === "ArrowRight") setLightboxIdx((index) => (index + 1) % lightboxCount);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxCount]);

  const cartSheetVariant = offers.find((offer) => offer.id === cartSheetVariantId);
  const cartUpgradeOffer = activePromotion?.bundleUpgrade && cartSheetVariant && getCartQuantity(cartSheetVariant.id) > 0
    ? getUpgradeOffer(offers, cartSheetVariant, getCartQuantity)
    : undefined;
  const cartSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartSavings = items.reduce((sum, item) => {
    const offer = offers.find((variant) => variant.id === item.variantId);
    return offer?.pairCount && offer.referencePrice !== null
      ? sum + Math.max(0, offer.referencePrice - item.price) * item.quantity
      : sum;
  }, 0);
  const campaign = activePromotion && activity?.campaign?.endsAt !== expiredCampaignEnd ? activity?.campaign : null;
  const previewCountdownEnd = activity?.campaign === null ? reviewPreview?.endsAt : undefined;
  const countdownEnd = campaign?.endsAt ?? previewCountdownEnd;
  const showCountdown = countdownEnd && countdownEnd !== expiredCampaignEnd;
  const giftName = activePromotion?.threePairIncludedGift;
  const giftQuantity = giftName
    ? offers.reduce((sum, offer) => sum + (offer.pairCount === 3 ? getCartQuantity(offer.id) : 0), 0)
    : 0;
  const bundlePerks: Record<string, string> = {};
  for (const offer of offers) {
    if (!offer.pairCount) continue;
    const perks: string[] = [];
    if (campaign?.isFreeShipping && offer.price >= (campaign.minimumCartSubtotal ?? 0)) {
      perks.push(tOffer("shippingWithCode", { code: campaign.code }));
    }
    if (giftName && offer.pairCount === 3) perks.push(tOffer("giftIncluded", { name: giftName }));
    if (perks.length) bundlePerks[offer.id] = perks.join(" · ");
  }

  const displayStock = selectedVariant && (hasLiveBundlePrices(product.slug)
    ? selectedVariant.stock
    : activity?.stock[selectedVariant.id]);

  function trackOffer(event: OfferEvent, fields: Record<string, unknown>) {
    (window.dataLayer ??= []).push({ event, product_id: product.id, product_slug: product.slug, currency, ...fields });
  }

  function selectVariant(variantId: string) {
    setSelectedVariantId(variantId);
    const offer = offers.find((variant) => variant.id === variantId);
    if (offer?.imageUrl && (offer.pairCount === null || offer.size)) {
      const index = galleryImages.findIndex((image) => image.url === offer.imageUrl);
      if (index >= 0) setActiveImageIdx(index);
    }
    trackOffer("pdp_bundle_selected", { variant_id: variantId, pairs: offer?.pairCount, value: offer?.price });
  }

  function createCartItem(variant: Variant): CartItem {
    return {
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      price: variant.price,
      quantity: 1,
      image: variant.imageUrl || galleryImages[0]?.url,
      productSlug: product.slug,
    };
  }

  function openCart(variantId: string) {
    if (cartDrawerEnabled) {
      setCartSheetVariantId(variantId);
      setCartSheetOpen(true);
    } else {
      router.push(`/${locale}/checkout`);
    }
  }

  function handlePurchase() {
    if (!selectedVariant) return;
    const currentQuantity = useCartStore.getState().items.find((item) => item.variantId === selectedVariant.id)?.quantity ?? 0;
    if (currentQuantity && (!cartDrawerEnabled || currentQuantity >= selectedVariant.stock)) {
      openCart(selectedVariant.id);
      return;
    }
    if (currentQuantity >= selectedVariant.stock) return;
    addItem(createCartItem(selectedVariant));
    setSelectedVariantId(selectedVariant.id);
    trackOffer("pdp_atc_clicked", { variant_id: selectedVariant.id, pairs: selectedVariant.pairCount, value: selectedVariant.price });
    if (cartDrawerEnabled) openCart(selectedVariant.id);
  }

  function handleUpgradeCartBundle() {
    if (!cartSheetVariant || !cartUpgradeOffer) return;
    const upgraded = useCartStore.getState().replaceOne(
      cartSheetVariant.id,
      createCartItem(cartUpgradeOffer),
      cartUpgradeOffer.stock,
    );
    if (!upgraded) return;
    setSelectedVariantId(cartUpgradeOffer.id);
    setCartSheetVariantId(cartUpgradeOffer.id);
    trackOffer("cart_upsell_accepted", {
      from_variant_id: cartSheetVariant.id,
      variant_id: cartUpgradeOffer.id,
      value: cartUpgradeOffer.price,
    });
  }

  function changeDrawerQuantity(variantId: string, delta: number) {
    const variant = offers.find((offer) => offer.id === variantId);
    if (!variant) return;
    const cart = useCartStore.getState();
    const quantity = cart.items.find((item) => item.variantId === variantId)?.quantity ?? 0;
    const nextQuantity = quantity + delta;
    if (!quantity || (delta > 0 && nextQuantity > variant.stock)) return;
    if (nextQuantity > 0) cart.updateQuantity(variantId, nextQuantity);
    else cart.removeItem(variantId);
  }

  function handleCheckout() {
    trackOffer("begin_checkout", { value: cartSubtotal, items: items.map((item) => ({ item_id: item.variantId, price: item.price, quantity: item.quantity })) });
    router.push(`/${locale}/checkout`);
  }

  const detailsHeading = "flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden";
  const detailsIndicator = (
    <span aria-hidden="true" className="text-muted-foreground">
      <span className="group-open:hidden">+</span>
      <span className="hidden group-open:inline">−</span>
    </span>
  );
  const detailsSections = [
    { key: "highlights", content: details.overview },
    { key: "productDescription", content: details.description },
  ] as const;

  return (
    <div className="flex w-full flex-col pb-24 md:pb-10">
      <div className={palette.productGrid}>
        <ProductGallery
          images={previews}
          name={product.name}
          index={activeImageIdx}
          onIndexChange={setActiveImageIdx}
          onZoom={() => {
            setLightboxIdx(activeImageIdx);
            setLightboxOpen(true);
          }}
        />

        <div className="flex min-w-0 flex-col gap-4 pb-8 lg:pt-1">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <h1 title={product.name} className="m-0 line-clamp-2 text-balance break-words font-heading text-2xl font-normal leading-snug tracking-tight text-[var(--pdp-ink)] lg:text-[28px]">
              {product.name}
            </h1>
            <ProductRatingInline
              productId={product.id}
              emphasizeAuthenticity
              compact
              initialSummary={ratingSummary}
              preview={reviewPreview?.reviewData.summary}
              sold={activity?.sold}
              previewSold={activity?.sold === 0 ? reviewPreview?.sold : undefined}
            />
            {selectedVariant && (
              <div role="status" aria-atomic="true" data-pdp-price>
                <OfferPrice offer={selectedVariant} locale={locale} currency={currency} />
              </div>
            )}
          </div>

          <div id="product-purchase" className="flex scroll-mt-32 flex-col gap-3">
            {displayStock !== undefined && displayStock > 0 && displayStock <= (activePromotion?.lowStockThreshold ?? 15) && (
              <p className="text-xs text-muted-foreground">
                {tOffer(selectedVariant?.pairCount ? "stockNote" : "availableStock", { count: displayStock })}
              </p>
            )}
            {offers.length > 1 && (
              <BundleSelector
                variants={offers}
                selectedVariantId={selectedVariant?.id ?? ""}
                onSelect={selectVariant}
                locale={locale}
                currency={currency}
                bestVariantId={bestBundleVariant?.id}
                suggestedVariantId={suggestedBundle?.id}
                perks={bundlePerks}
              />
            )}
            {offers.length === 1 && <p className="text-sm text-muted-foreground">{offers[0].name}</p>}
            <div className="flex w-full flex-col gap-3">
              <Button
                ref={purchaseButtonRef}
                type="button"
                onClick={handlePurchase}
                disabled={purchaseDisabled}
                className="h-12 w-full rounded-full bg-primary px-4 text-sm font-semibold tracking-normal text-primary-foreground shadow-none hover:bg-[var(--pdp-wine-hover)] focus-visible:ring-foreground"
              >
                {purchaseDisabled || showViewBag ? purchaseLabel : `${purchaseLabel} · ${priceText}`}
              </Button>
              {showCountdown && (
                <OfferCountdown
                  key={countdownEnd}
                  endsAt={countdownEnd}
                  code={campaign?.code}
                  preview={!campaign}
                  onExpire={setExpiredCampaignEnd}
                />
              )}
              <DeliveryNotes
                express={activePromotion?.expressShipping}
                returnPolicy={activePromotion?.returnPolicy}
                onShowPolicy={() => {
                  if (shippingDetailsRef.current) shippingDetailsRef.current.open = true;
                }}
              />
            </div>
          </div>

          {(locale !== "vi" || !activePromotion) && (
            <div className="empty:hidden"><ProductVouchers productId={product.id} /></div>
          )}

          <div className="divide-y divide-border border-t border-border">
            {detailsSections.map(({ key, content }) => content && (
              <details className="group py-4" key={key}>
                <summary className={detailsHeading}>{tOffer(key)}{detailsIndicator}</summary>
                <div className="prose prose-sm mt-3 max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: content }} />
              </details>
            ))}
            {(details.materials || details.care) && (
              <details className="group py-4">
                <summary className={detailsHeading}>{tOffer("materialsAndCare")}{detailsIndicator}</summary>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {details.materials && (
                    <div>
                      <h2 className="mb-1 font-semibold text-foreground">{tOffer("materials")}</h2>
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: details.materials }} />
                    </div>
                  )}
                  {details.care && (
                    <div>
                      <h2 className="mb-1 font-semibold text-foreground">{tOffer("care")}</h2>
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: details.care }} />
                    </div>
                  )}
                </div>
              </details>
            )}
            <details ref={shippingDetailsRef} id="product-shipping" className="group scroll-mt-20 py-4">
              <summary className={detailsHeading}>{tOffer("shippingAndReturns")}{detailsIndicator}</summary>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <p>{tOffer("shippingAtCheckout")}</p>
                {activePromotion?.returnPolicy && <p className="whitespace-pre-line">{activePromotion.returnPolicy}</p>}
              </div>
            </details>
          </div>
        </div>
      </div>

      {activePromotion?.comparison && <ProductComparisonSection comparison={activePromotion.comparison} />}
      <ProductReviews productId={product.id} productName={product.name} preview={reviewPreview?.reviewData} />

      {(activePromotion?.stickyBar ?? true) && selectedVariant && (
        <StickyMobileBar
          anchor={purchaseButtonRef}
          hidden={cartSheetOpen || lightboxOpen}
          price={priceText}
          label={purchaseLabel}
          disabled={purchaseDisabled}
          onBuy={handlePurchase}
        />
      )}

      {cartDrawerEnabled && (
        <CartDrawer
          open={cartSheetOpen}
          onOpenChange={setCartSheetOpen}
          items={items}
          offers={offers}
          currency={currency}
          subtotal={cartSubtotal}
          savings={cartSavings}
          fromOffer={cartSheetVariant}
          upgradeOffer={cartUpgradeOffer}
          upgradePerk={cartUpgradeOffer && bundlePerks[cartUpgradeOffer.id]}
          gift={giftName && giftQuantity ? { name: giftName, quantity: giftQuantity } : undefined}
          onUpgrade={handleUpgradeCartBundle}
          onCheckout={handleCheckout}
          onQuantityChange={changeDrawerQuantity}
        />
      )}

      {lightboxOpen && lightboxCount > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-6 top-6 z-[110] flex h-12 w-12 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background transition-colors"
            aria-label={tOffer("closeGallery")}
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxCount > 1 && (
            <button
              onClick={() => setLightboxIdx((prev) => (prev === 0 ? lightboxCount - 1 : prev - 1))}
              className="absolute left-6 top-1/2 z-[110] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background transition-colors"
              aria-label={tOffer("previousPhoto")}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {lightboxCount > 1 && (
            <button
              onClick={() => setLightboxIdx((prev) => (prev === lightboxCount - 1 ? 0 : prev + 1))}
              className="absolute right-6 top-1/2 z-[110] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background transition-colors"
              aria-label={tOffer("nextPhoto")}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="relative flex h-full max-h-[90vh] w-full max-w-[90vw] items-center justify-center">
            {galleryImages[lightboxIdx] && (
              <Image
                src={galleryImages[lightboxIdx].url}
                alt={galleryImages[lightboxIdx].alt || product.name}
                fill
                className="object-contain"
              sizes="90vw"
                priority
              />
            )}
          </div>
          
          <div className="absolute bottom-6 left-1/2 flex w-max max-w-[90vw] -translate-x-1/2 flex-wrap justify-center gap-2">
            {galleryImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setLightboxIdx(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${lightboxIdx === idx ? "w-8 bg-foreground" : "w-2 bg-foreground/30 hover:bg-foreground/60"}`}
                aria-label={tOffer("showPhoto", { index: idx + 1 })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
