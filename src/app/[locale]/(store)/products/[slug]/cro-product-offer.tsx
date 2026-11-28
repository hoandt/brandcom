"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { PromotionSettings } from "@/lib/product-promotion";

export type CroVariant = {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
};

function getBundleQuantity(name: string) {
  const match = name.trim().match(/^(?:combo\s+)?([1-9]\d{0,2})\s*cặp$/iu);
  return match ? Number(match[1]) : null;
}

const bundleSizes = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL", "6XL"];

function getBundleOptions(name: string) {
  const [size, quantity, ...rest] = name.trim().toUpperCase().split(/\s*\/\s*/);
  const sizedPairs = quantity && !rest.length && bundleSizes.includes(size) ? getBundleQuantity(quantity) : null;
  return sizedPairs === null ? { size: null, pairCount: getBundleQuantity(name) } : { size, pairCount: sizedPairs };
}

export type OfferVariant = CroVariant & {
  size: string | null;
  pairCount: number | null;
  perPair: number | null;
  referencePrice: number | null;
  savings: number;
};

export function OfferPrice({ offer, locale, currency }: {
  offer: OfferVariant;
  locale: string;
  currency?: string;
}) {
  const { price, referencePrice, savings } = offer;
  const percent = referencePrice ? Math.round(savings / referencePrice * 100) : 0;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5 text-foreground">
      <span className="whitespace-nowrap text-[1.65rem] font-semibold tabular-nums">{formatPrice(price, locale, currency)}</span>
      {referencePrice !== null && (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums">
          <s className="whitespace-nowrap text-muted-foreground">{formatPrice(referencePrice, locale, currency)}</s>
          {percent > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">−{percent}%</span>}
        </span>
      )}
    </span>
  );
}

export function getVariantOffers<T extends CroVariant>(variants: T[]) {
  const options = variants.map((variant) => getBundleOptions(variant.name));
  const isPairBundle = variants.length > 1
    && options.every((option) => option.pairCount !== null && Boolean(option.size) === Boolean(options[0].size))
    && new Set(options.map((option) => `${option.size}:${option.pairCount}`)).size === variants.length;
  const singles = new Map<string | null, number>();
  if (isPairBundle) {
    options.forEach(({ size, pairCount }, index) => {
      if (pairCount === 1) singles.set(size, variants[index].price);
    });
  }

  const offers = variants.map((variant, index): T & OfferVariant => {
    const { size, pairCount } = isPairBundle ? options[index] : { size: null, pairCount: null };
    const comparePrice = variant.comparePrice && variant.comparePrice > variant.price ? variant.comparePrice : null;
    const singlesPrice = pairCount && pairCount > 1 ? (singles.get(size) ?? 0) * pairCount : 0;
    const referencePrice = singlesPrice > variant.price ? singlesPrice : comparePrice;
    return {
      ...variant,
      size,
      pairCount,
      perPair: pairCount ? variant.price / pairCount : null,
      referencePrice,
      savings: referencePrice === null ? 0 : referencePrice - variant.price,
    };
  });
  return isPairBundle ? offers.sort((a, b) => (a.pairCount ?? 0) - (b.pairCount ?? 0)) : offers;
}

export function getUpgradeOffer<T extends OfferVariant>(offers: T[], selected: OfferVariant, cartQuantity: (id: string) => number) {
  const { pairCount, perPair } = selected;
  if (pairCount === null || perPair === null) return undefined;
  return offers.find((offer) =>
    offer.size === selected.size && offer.price > selected.price && offer.pairCount !== null && offer.pairCount > pairCount &&
    offer.perPair !== null && offer.perPair < perPair &&
    offer.stock > cartQuantity(offer.id),
  );
}

const variantSwatches = new Map(Object.entries({
  da: "#d8b597", "màu da": "#d8b597", nude: "#d8b597",
  đen: "#252120", black: "#252120",
  kem: "#e9dec8", cream: "#e9dec8",
  trắng: "#faf8f1", white: "#faf8f1",
  nâu: "#825b46", brown: "#825b46",
}));

export function BundleSelector({
  variants,
  selectedVariantId,
  onSelect,
  locale,
  currency,
  bestVariantId,
  suggestedVariantId,
  perks = {},
}: {
  variants: OfferVariant[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
  locale: string;
  currency?: string;
  bestVariantId?: string;
  suggestedVariantId?: string;
  perks?: Record<string, string>;
}) {
  const groupName = useId();
  const t = useTranslations("ProductOffer");
  const isBundle = variants.some((variant) => variant.pairCount !== null);
  const swatches = variants.map(({ name }) => variantSwatches.get(name.trim().normalize("NFC").toLocaleLowerCase("vi")));
  const useSwatches = !isBundle && swatches.every(Boolean) && new Set(swatches).size === swatches.length;
  const selected = variants.find((variant) => variant.id === selectedVariantId);

  if (isBundle) {
    const sizes = bundleSizes.filter((size) => variants.some((variant) => variant.size === size));
    const sizeVariants = variants.filter((variant): variant is OfferVariant & { pairCount: number } =>
      variant.pairCount !== null && variant.size === (selected?.size ?? null));

    return (
      <div className="grid gap-3">
        {sizes.length > 0 && (
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-sm font-medium">{t("sizeChoice")}</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const available = variants.filter((variant) => variant.size === size && variant.stock > 0);
                const next = available.find((variant) => variant.pairCount === selected?.pairCount) ?? available[0];
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={selected?.size === size}
                    disabled={!next}
                    onClick={() => next && onSelect(next.id)}
                    className={cn(
                      "min-h-10 min-w-11 rounded-sm border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
                      selected?.size === size
                        ? "border-[1.5px] border-primary bg-[var(--pdp-bundle-tint)] text-primary"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <fieldset role="radiogroup" aria-labelledby={`${groupName}-label`} className="min-w-0">
          <legend id={`${groupName}-label`} className="mb-1.5 text-sm font-medium">{t("bundleChoice")}</legend>
          <div className="grid gap-2">
            {sizeVariants.map((variant) => {
              const count = variant.pairCount;
              const isSelected = selectedVariantId === variant.id;
              const badge = variant.id === bestVariantId ? t("bestValue") : variant.id === suggestedVariantId ? t("recommended") : null;
              const smallerBundle = sizeVariants.find((option) =>
                option.pairCount === count - 1 && option.stock > 0);
              const perPairSavings = variant.perPair !== null && smallerBundle?.perPair !== null && smallerBundle?.perPair !== undefined
                ? smallerBundle.perPair - variant.perPair
                : 0;
              const priceNote = variant.savings > 0
                ? t("bundleSavings", { price: formatPrice(variant.savings, locale, currency) })
                : perPairSavings > 0
                  ? t("bundleUnitSavings", { price: formatPrice(perPairSavings, locale, currency), count: count - 1 })
                  : variant.perPair !== null && count > 1
                    ? t("pricePerPair", { price: formatPrice(variant.perPair, locale, currency) })
                    : null;
              const descriptions = variant.stock > 0 ? [priceNote, perks[variant.id]].filter(Boolean) : [];

              return (
                <label key={variant.id} className="relative block">
                  <input type="radio" name={groupName} value={variant.id} checked={isSelected} disabled={variant.stock <= 0}
                    onChange={() => onSelect(variant.id)} className="peer sr-only" />
                  <span className={cn(
                    "flex min-h-14 cursor-pointer items-center justify-between gap-2.5 rounded-[0.75rem] border-[1.5px] px-3 py-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                    isSelected ? "border-primary bg-[var(--pdp-bundle-tint)]" : "border-border hover:border-primary/50",
                  )}>
                    <span className="flex shrink-0 items-center gap-2 text-sm">
                      <span aria-hidden="true" className={cn("grid size-5 shrink-0 place-items-center rounded-full border", isSelected ? "border-primary" : "border-foreground/40")}>
                        {isSelected && <span className="size-2.5 rounded-full bg-primary" />}
                      </span>
                      {t("bundleQuantity", { count })}
                    </span>
                    <span className="grid min-w-0 gap-0.5 text-right">
                      <span className="flex flex-wrap items-baseline justify-end gap-x-1.5">
                        <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatPrice(variant.price, locale, currency)}</span>
                        {variant.stock <= 0 ? (
                          <span className="text-xs text-muted-foreground">{t("outOfStock")}</span>
                        ) : badge && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.6875rem] font-medium text-primary">{badge}</span>
                        )}
                      </span>
                      {descriptions.length > 0 && <span className="text-xs leading-tight text-muted-foreground">{descriptions.join(" · ")}</span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    );
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium text-foreground">
        {t(useSwatches ? "colorChoice" : "variantChoice")}
        {useSwatches && selected && <span className="text-muted-foreground"> · {selected.name}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant, index) => {
          const isSelected = selectedVariantId === variant.id;
          const isOutOfStock = variant.stock <= 0;
          return (
            <button
              key={variant.id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelect(variant.id)}
              aria-label={`${variant.name}${isOutOfStock ? ` · ${t("outOfStock")}` : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-sm border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected ? "border-primary bg-primary/[0.06] font-medium text-primary" : "border-border text-foreground hover:border-primary/50",
                isOutOfStock && "cursor-not-allowed opacity-45",
              )}
            >
              {useSwatches ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative size-5 rounded-full border border-foreground/15",
                    isOutOfStock && "after:absolute after:left-0 after:top-1/2 after:h-px after:w-full after:-rotate-45 after:bg-current",
                  )}
                  style={{ backgroundColor: swatches[index] }}
                />
              ) : (
                <span className={cn("break-words", isOutOfStock && "line-through")}>{variant.name}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DeliveryNotes({ express, returnPolicy, onShowPolicy }: {
  express?: PromotionSettings["expressShipping"];
  returnPolicy?: string;
  onShowPolicy: () => void;
}) {
  const t = useTranslations("ProductOffer");
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-center text-xs text-muted-foreground">
      <span>{t(express ? "quickDelivery" : "homeDelivery")}</span>
      <span aria-hidden="true">·</span>
      <span>{t("discreetPackaging")}</span>
      {returnPolicy && (
        <>
          <span aria-hidden="true">·</span>
          <a href="#product-shipping" className="underline-offset-3 hover:underline focus-visible:underline" onClick={onShowPolicy}>
            {t(/\b7\s+ngày\b/iu.test(returnPolicy) ? "sevenDayReturns" : "returnPolicy")}
          </a>
        </>
      )}
    </p>
  );
}

export function ProductComparisonSection({ comparison }: { comparison: NonNullable<PromotionSettings["comparison"]> }) {
  const t = useTranslations("ProductOffer");
  return (
    <section className="w-full overflow-hidden bg-[var(--pdp-stone)] px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <h2 id="comparison-heading" className="m-0 font-heading text-3xl font-medium leading-tight text-[var(--pdp-ink)] sm:text-4xl">
            {comparison.title}
          </h2>
        </div>

        <div className="overflow-hidden rounded-[4px] border border-[var(--pdp-line)] bg-[var(--pdp-paper)]">
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1fr)] bg-[var(--pdp-stone)] text-xs font-medium text-[var(--pdp-ink)] sm:text-sm">
            <div className="px-3 py-3 sm:px-5">{t("comparisonCriteria")}</div>
            <div className="px-3 py-3 sm:px-5">Auria</div>
            <div className="px-3 py-3 sm:px-5">{t("comparisonAlternative")}</div>
          </div>
          {comparison.rows.map(({ label, auria, alternative }, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1fr)] break-words border-t border-[var(--pdp-line)] text-xs leading-4 sm:text-sm sm:leading-5">
              <div className="flex items-center px-3 py-4 font-medium text-[var(--pdp-ink)] sm:px-5">{label}</div>
              <div className="flex items-start gap-2 px-3 py-4 text-[var(--pdp-ink)] sm:px-5">
                <CheckCircle2 className="mt-0.5 hidden size-4 shrink-0 text-[var(--pdp-muted)] sm:block" aria-hidden="true" />
                <span>{auria}</span>
              </div>
              <div className="px-3 py-4 text-[var(--pdp-muted)] sm:px-5">{alternative}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
