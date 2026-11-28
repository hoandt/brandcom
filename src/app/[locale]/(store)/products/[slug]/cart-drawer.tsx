"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn, formatPrice } from "@/lib/utils";
import type { CartItem } from "@/stores/cart-store";
import palette from "@/components/storefront/product-palette.module.css";
import type { OfferVariant } from "./cro-product-offer";

export function CartDrawer({
  open, onOpenChange, items, offers, currency, subtotal, savings, fromOffer, upgradeOffer, upgradePerk, gift, onUpgrade, onCheckout, onQuantityChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  offers: OfferVariant[];
  currency: string;
  subtotal: number;
  savings: number;
  fromOffer?: OfferVariant;
  upgradeOffer?: OfferVariant;
  upgradePerk?: string;
  gift?: { name: string; quantity: number };
  onUpgrade: () => void;
  onCheckout: () => void;
  onQuantityChange: (variantId: string, delta: number) => void;
}) {
  const t = useTranslations("ProductOffer");
  const locale = useLocale();
  const money = (amount: number) => formatPrice(amount, locale, currency);
  const nextPrice = upgradeOffer && fromOffer
    ? upgradeOffer.price - (items.find((item) => item.variantId === fromOffer.id)?.price ?? fromOffer.price)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn(palette.theme, palette.quiet, "h-dvh max-w-md gap-0 border-border bg-background data-[side=right]:w-full sm:max-w-md")}>
        <SheetHeader className="border-b border-border px-5 py-5 pr-14">
          <SheetTitle className="m-0 text-2xl font-normal">{t("cartTitle")}</SheetTitle>
          <SheetDescription className="sr-only">{t("cartDescription")}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {items.length === 0 && <p className="py-6 text-muted-foreground">{t("cartEmpty")}</p>}
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const offer = offers.find((variant) => variant.id === item.variantId);
              return (
                <li key={item.variantId} className="flex gap-3 py-4">
                  <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-[0.5rem] bg-[var(--pdp-stone)]">
                    {item.image && <Image src={item.image} alt="" fill loading="eager" sizes="72px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    {offer ? (
                      <div className="inline-flex h-9 items-center rounded-full border border-border" aria-label={t("quantity")}>
                        <button type="button" className="h-full w-9 rounded-full hover:bg-muted" aria-label={t("decreaseQuantity")}
                          onClick={() => onQuantityChange(item.variantId, -1)}>−</button>
                        <span className="min-w-6 text-center tabular-nums">{item.quantity}</span>
                        <button type="button" className="h-full w-9 rounded-full hover:bg-muted disabled:opacity-40" aria-label={t("increaseQuantity")}
                          disabled={item.quantity >= offer.stock} onClick={() => onQuantityChange(item.variantId, 1)}>+</button>
                      </div>
                    ) : <p className="text-xs tabular-nums text-muted-foreground">× {item.quantity}</p>}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{money(item.price * item.quantity)}</span>
                </li>
              );
            })}
            {gift && (
              <li className="flex items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-medium">{gift.name} <span className="text-muted-foreground">× {gift.quantity}</span></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("includedGift")}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{money(0)}</span>
              </li>
            )}
          </ul>

          {fromOffer?.pairCount && upgradeOffer?.pairCount && (
            <div className="my-4 flex items-center justify-between gap-3 rounded-[0.75rem] border border-border bg-[var(--pdp-bundle-tint)] p-3">
              <div className="text-sm">
                <p className="font-medium">
                  {t("bundleUpgrade", { count: upgradeOffer.pairCount - fromOffer.pairCount, price: money(nextPrice) })}
                </p>
                {(upgradePerk || upgradeOffer.savings > 0) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {upgradePerk ?? t("upgradeSavings", { price: money(upgradeOffer.savings) })}
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" onClick={onUpgrade} className="h-10 shrink-0 rounded-full border-primary/30 px-3 text-primary">
                {t("upgradeAction")}
              </Button>
            </div>
          )}
        </div>

        <SheetFooter className="gap-3 border-t border-border bg-background px-5 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {savings > 0 && (
            <div className="flex justify-between gap-3 text-sm text-primary">
              <span>{t("cartSavings")}</span>
              <span className="whitespace-nowrap tabular-nums">{money(savings)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 text-base font-semibold">
            <span>{t("subtotal")}</span>
            <span className="whitespace-nowrap tabular-nums">{money(subtotal)}</span>
          </div>
          <Button type="button" disabled={items.length === 0} onClick={onCheckout} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground hover:bg-[var(--pdp-wine-hover)]">
            {t("checkout")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
