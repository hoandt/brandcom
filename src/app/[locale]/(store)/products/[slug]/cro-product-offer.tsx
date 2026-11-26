"use client";

import Image from "next/image";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, formatPrice } from "@/lib/utils";
import type { PromotionSettings } from "@/lib/product-promotion";

export type CroVariant = {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
};

export function getBundleQuantity(name: string) {
  const match = name.trim().match(/^(?:combo\s+)?([1-9]\d{0,2})\s*cặp$/iu);
  return match ? Number(match[1]) : null;
}

export type OfferVariant = CroVariant & {
  pairCount: number | null;
  perPair: number | null;
  referencePrice: number | null;
  savings: number;
  comparesToSingles: boolean;
};

export function OfferPrice({ offer, locale, currency, layout = "hero" }: {
  offer: OfferVariant; locale: string; currency?: string; layout?: "hero" | "card" | "sticky";
}) {
  const { referencePrice, savings, price, comparesToSingles } = offer;
  const percent = referencePrice ? Math.round(savings / referencePrice * 100) : 0;
  const card = layout === "card";
  const sticky = layout === "sticky";
  return (
    <span className={cn("text-[#7a1c37]", card ? "block text-right" : "flex flex-wrap items-baseline gap-x-2")}>
      <span className={cn("whitespace-nowrap font-black tracking-tight", card && "block text-base sm:text-lg", sticky && "text-base", layout === "hero" && "text-2xl")}>
        {formatPrice(price, locale, currency)}
      </span>
      {referencePrice !== null && (
        <span className={cn("inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]", card && "flex justify-end", sticky && "text-[10px]")}>
          <span className="whitespace-nowrap text-muted-foreground">
            {comparesToSingles && "Mua lẻ "}<s>{formatPrice(referencePrice, locale, currency)}</s>
          </span>
          {!comparesToSingles && percent > 0 && (
            <span className="rounded-full bg-[#7a1c37] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">-{percent}%</span>
          )}
        </span>
      )}
    </span>
  );
}

export function getVariantOffers<T extends CroVariant>(variants: T[], showBundlePricing: boolean) {
  const counts = variants.map((variant) => getBundleQuantity(variant.name));
  const isPairBundle = showBundlePricing && variants.length > 1 && counts.every(Boolean) && new Set(counts).size === counts.length;
  const singlePrice = isPairBundle ? variants[counts.indexOf(1)]?.price : undefined;
  const offers = variants.map((variant, index): T & OfferVariant => {
    const pairCount = isPairBundle ? counts[index] : null;
    const comparePrice = variant.comparePrice && variant.comparePrice > variant.price ? variant.comparePrice : null;
    const singlesPrice = pairCount && singlePrice !== undefined ? singlePrice * pairCount : null;
    const comparesToSingles = !comparePrice && singlesPrice !== null && singlesPrice > variant.price;
    const referencePrice = comparePrice ?? (comparesToSingles ? singlesPrice : null);
    return {
      ...variant,
      pairCount,
      perPair: pairCount ? variant.price / pairCount : null,
      referencePrice,
      savings: referencePrice === null ? 0 : referencePrice - variant.price,
      comparesToSingles,
    };
  });
  return isPairBundle ? offers.sort((a, b) => (a.pairCount ?? 0) - (b.pairCount ?? 0)) : offers;
}

export function getUpgradeOffer<T extends OfferVariant>(offers: T[], selected: OfferVariant, cartQuantity: (id: string) => number) {
  const { pairCount, perPair } = selected;
  if (pairCount === null || perPair === null) return undefined;
  return offers.filter((offer) =>
    offer.pairCount !== null && offer.pairCount > pairCount &&
    offer.perPair !== null && offer.perPair < perPair &&
    offer.stock > cartQuantity(offer.id),
  ).sort((a, b) => (a.perPair ?? Infinity) - (b.perPair ?? Infinity))[0];
}

export function BundleSelector({
  variants,
  selectedVariantId,
  onSelect,
  locale,
  currency,
  bestVariantId,
}: {
  variants: OfferVariant[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
  locale: string;
  currency?: string;
  bestVariantId?: string;
}) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#5f1830]">
        {variants.some((variant) => variant.pairCount !== null) ? "Chọn combo của bạn" : "Phân loại"}
      </legend>

      <div className="space-y-2.5">
        {variants.map((variant) => {
          const { savings, perPair } = variant;
          const isSelected = selectedVariantId === variant.id;
          const isBestValue = variant.id === bestVariantId;
          const isOutOfStock = variant.stock <= 0;

          return (
            <button
              key={variant.id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelect(variant.id)}
              aria-pressed={isSelected}
              className={cn(
                "group relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden border bg-[#fffdfb] px-3.5 py-3.5 text-left transition-all duration-200 sm:px-4",
                isSelected
                  ? "border-[#7a1c37] shadow-[0_0_0_1px_#7a1c37,0_12px_30px_rgba(122,28,55,0.09)]"
                  : "border-[#e8dcd8] hover:border-[#b88493] hover:bg-[#fff9f8]",
                isOutOfStock && "cursor-not-allowed opacity-45",
              )}
            >
              {isBestValue && (
                <span className="absolute right-0 top-0 bg-[#7a1c37] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white sm:text-[9px]">
                  Giá mỗi cặp tốt nhất
                </span>
              )}

              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isSelected
                    ? "border-[#7a1c37] bg-[#7a1c37] text-white"
                    : "border-[#cdb9bf] bg-white text-transparent",
                )}
                aria-hidden="true"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>

              <span className="min-w-0 pt-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words text-sm font-extrabold uppercase tracking-[0.08em] text-[#351f27]">
                    {variant.name}
                  </span>
                  {variant.comparesToSingles && savings > 0 && (
                    <span className="rounded-full bg-[#f7e9ed] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#7a1c37]">
                      Tiết kiệm {formatPrice(savings, locale, currency)}
                    </span>
                  )}
                </span>
                {isOutOfStock ? (
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">Hết hàng</span>
                ) : perPair !== null && (
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                    {formatPrice(perPair, locale, currency)}/cặp
                  </span>
                )}
              </span>

              <span className={cn("min-w-[5.5rem]", isBestValue && "pt-4")}>
                <OfferPrice offer={variant} locale={locale} currency={currency} layout="card" />
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BundleReward({
  selectedVariant,
  bestVariant,
  locale,
  currency,
  onUpgrade,
}: {
  selectedVariant: OfferVariant;
  bestVariant: OfferVariant;
  locale: string;
  currency?: string;
  onUpgrade: () => void;
}) {
  const selectedQuantity = selectedVariant.pairCount;
  const bestQuantity = bestVariant.pairCount;
  const bestPerPair = bestVariant.perPair;
  if (selectedQuantity === null || bestQuantity === null || bestPerPair === null) return null;
  const isBestSelected = selectedVariant.id === bestVariant.id;
  const upgradeAmount = bestVariant.price - selectedVariant.price;

  if (isBestSelected) {
    return (
      <div className="border border-[#aac9b2] bg-[#f2f8f3] p-3.5 text-[#245b37]">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em]">Bạn đang có giá tốt nhất</p>
            <p className="mt-1 text-[11px] leading-4 text-[#437050]">
              Chỉ {formatPrice(bestPerPair, locale, currency)} mỗi cặp với Combo {bestQuantity} Cặp.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#ead7dc] bg-[#fbf3f5] p-3.5">
      <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-[#eadde0]">
        <div
          className="h-full rounded-full bg-[#7a1c37] transition-[width] duration-500"
          style={{ width: `${Math.min(100, (selectedQuantity / bestQuantity) * 100)}%` }}
        />
      </div>
      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold text-[#4d2935]">
            {upgradeAmount > 0 ? `Thêm ${formatPrice(upgradeAmount, locale, currency)} để chọn` : "Đổi sang"} {bestQuantity} cặp
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Giá còn {formatPrice(bestPerPair, locale, currency)}/cặp.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="flex shrink-0 items-center gap-1 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7a1c37] underline decoration-[#b88493] underline-offset-4"
        >
          Nâng lên {bestQuantity} cặp
          <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function MicroTrustRow({ labels }: { labels: string[] }) {
  const icons = [ShieldCheck, RotateCcw, PackageCheck];
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-y border-[#eadfdb] py-3">
      {labels.map((label, index) => {
        const Icon = icons[index % icons.length];
        return (
          <div key={index} className="flex min-w-0 flex-col items-center gap-1.5 px-1.5 text-center sm:flex-row sm:justify-center sm:text-left">
            <Icon className="size-4 shrink-0 text-[#7a1c37]" strokeWidth={1.7} />
            <span className="break-words text-[10px] font-semibold leading-3 text-[#584149]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProductComparisonSection({ comparison }: { comparison: NonNullable<PromotionSettings["comparison"]> }) {
  return (
    <section className="w-full overflow-hidden border-y border-[#eadfdb] bg-[#fdf9f7] px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <h2 id="comparison-heading" className="m-0 font-heading text-3xl font-medium leading-tight text-[#3d2930] sm:text-4xl">
            {comparison.title}
          </h2>
        </div>

        <div className="overflow-hidden border border-[#e6d8d4] bg-white shadow-[0_18px_50px_rgba(80,38,52,0.06)]">
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1fr)] bg-[#7a1c37] text-white">
            <div className="px-3 py-3 text-[9px] font-bold uppercase tracking-[0.14em] sm:px-5 sm:text-[10px]">Tiêu chí</div>
            <div className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.14em] sm:px-5 sm:text-[10px]">Auria</div>
            <div className="bg-[#682039] px-3 py-3 text-[9px] font-bold uppercase tracking-[0.14em] sm:px-5 sm:text-[10px]">Khi so sánh</div>
          </div>
          {comparison.rows.map(({ label, auria, alternative }, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1fr)] break-words border-t border-[#eee3df] text-[11px] leading-4 sm:text-sm sm:leading-5">
              <div className="flex items-center px-3 py-4 font-bold text-[#4b333b] sm:px-5">{label}</div>
              <div className="flex items-start gap-2 bg-[#fffaf9] px-3 py-4 text-[#3e2d33] sm:px-5">
                <CheckCircle2 className="mt-0.5 hidden size-4 shrink-0 text-[#7a1c37] sm:block" />
                <span>{auria}</span>
              </div>
              <div className="bg-[#faf8f7] px-3 py-4 text-muted-foreground sm:px-5">{alternative}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export function CartAddedSheet({
  open,
  onOpenChange,
  productName,
  imageUrl,
  selectedVariant,
  upgradeVariant,
  quantity,
  onQuantityChange,
  locale,
  currency,
  cartSubtotal,
  onUpgrade,
  onCheckout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  imageUrl?: string;
  selectedVariant?: CroVariant;
  upgradeVariant?: OfferVariant;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  locale: string;
  currency?: string;
  cartSubtotal: number;
  onUpgrade: () => void;
  onCheckout: () => void;
}) {
  const upgradeAmount = selectedVariant && upgradeVariant
    ? upgradeVariant.price - selectedVariant.price
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(92vw,430px)] gap-0 border-[#dfd1cc] bg-[#fdfbf9] sm:max-w-[430px]">
        <SheetHeader className="border-b border-[#eadfdb] px-5 py-5 pr-14">
          <div className="mb-1 flex items-center gap-2 text-[#2f6a42]">
            <CheckCircle2 className="size-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">Đã thêm vào giỏ</span>
          </div>
          <SheetTitle className="m-0 text-2xl text-[#3d2930]">Lựa chọn của bạn đã sẵn sàng</SheetTitle>
          <SheetDescription className="mt-1 text-xs">Kiểm tra lựa chọn trước khi chuyển sang thanh toán.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {selectedVariant && (
            <div className="flex gap-4 border-b border-[#eadfdb] pb-5">
              <div className="relative size-24 shrink-0 overflow-hidden bg-[#f3ebe8]">
                {imageUrl ? (
                  <Image src={imageUrl} alt={productName} fill className="object-cover" sizes="96px" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#39282e]">{productName}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a1c37]">{selectedVariant.name}</p>
                <p className="mt-3 text-lg font-black text-[#7a1c37]">{formatPrice(selectedVariant.price, locale, currency)}</p>
                <div className="mt-2 inline-flex h-10 items-center border border-[#eadfdb]" aria-label="Số lượng trong giỏ">
                  <button type="button" onClick={() => onQuantityChange(-1)} className="h-full w-10 hover:bg-[#f9f0f2]" aria-label="Giảm số lượng">−</button>
                  <span className="w-8 text-center tabular-nums" role="status">{quantity}</span>
                  <button type="button" onClick={() => onQuantityChange(1)} disabled={quantity >= selectedVariant.stock}
                    className="h-full w-10 hover:bg-[#f9f0f2] disabled:opacity-40" aria-label="Tăng số lượng">+</button>
                </div>
              </div>
            </div>
          )}

          {selectedVariant && upgradeVariant && upgradeVariant.perPair !== null && (
            <div className="mt-5 border border-[#d9bcc5] bg-[#fbf0f3] p-4">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[#7a1c37]" />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#5b2336]">Nâng cấp giá trị hơn</p>
                  <p className="mt-1.5 text-xs leading-5 text-[#654a53]">
                    {upgradeAmount > 0 ? `Thêm ${formatPrice(upgradeAmount, locale, currency)} để chuyển sang` : "Chuyển sang"} {upgradeVariant.name}, còn {formatPrice(upgradeVariant.perPair, locale, currency)}/cặp.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onUpgrade}
                className="mt-3 h-10 w-full rounded-none border-[#7a1c37] bg-white text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7a1c37] hover:bg-[#7a1c37] hover:text-white"
              >
                {quantity > 1 ? "Đổi 1 combo sang" : "Đổi sang"} {upgradeVariant.name}
              </Button>
            </div>
          )}

        </div>

        <SheetFooter className="border-t border-[#eadfdb] bg-white px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tạm tính giỏ hàng</span>
            <span className="text-lg font-black text-[#3d2930]">{formatPrice(cartSubtotal, locale, currency)}</span>
          </div>
          <Button
            type="button"
            onClick={onCheckout}
            className="h-12 w-full rounded-none bg-[#7a1c37] text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-[#68162e]"
          >
            Đi đến thanh toán
            <ChevronRight className="ml-1 size-4" />
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground underline underline-offset-4"
          >
            Tiếp tục mua sắm
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
