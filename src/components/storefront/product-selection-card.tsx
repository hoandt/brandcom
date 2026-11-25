"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCartStore } from "@/stores/cart-store";
import styles from "./product-selection-card.module.css";

export type ProductGroup = "ao-dan" | "mieng-dan-nguc";

type SelectionVariant = {
  id: string;
  name: string;
  sku: string;
  amount: number;
  price: string;
  stock: number;
  image?: string;
  color?: string;
};

export type SelectionProduct = {
  id: string;
  slug: string;
  name: string;
  title: string;
  details: string;
  price: string;
  image?: string;
  framing?: { width: number; centerX?: number; centerY?: number; shadowTop?: number };
  badge?: "new" | "bestseller";
  swatches: { id: string; label: string; hex: string }[];
  variants: SelectionVariant[];
  groups: ProductGroup[];
};

const imageSizes = "(min-width: 90rem) 320px, (min-width: 64rem) 25vw, 50vw";
const addButton = `${styles.quickAdd} group/add grid size-11 place-items-center rounded-full text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`;

export function ProductSelectionCard({ product, locale }: { product: SelectionProduct; locale: string }) {
  const t = useTranslations("Homepage.productSelection");
  const tHome = useTranslations("Homepage");
  const tProduct = useTranslations("Product");
  const [color, setColor] = useState<string>();
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState<string>();
  const [feedback, setFeedback] = useState<{ kind: "added" | "stockLimit" }>();

  const href = `/${locale}/products/${product.slug}`;
  const variants = color ? product.variants.filter((variant) => variant.color === color) : product.variants;
  const singleVariant = product.variants.length === 1 ? product.variants[0] : undefined;
  const canQuickAdd = product.variants.some((variant) => variant.stock > 0);
  const selected = variants.find((variant) => variant.id === variantId);
  const selectedQuantity = useCartStore((state) => state.items.find((item) => item.variantId === variantId)?.quantity ?? 0);
  const atStockLimit = Boolean(selected && selectedQuantity >= selected.stock);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(undefined), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function addVariant(variant: SelectionVariant) {
    const cart = useCartStore.getState();
    const quantity = cart.items.find((item) => item.variantId === variant.id)?.quantity ?? 0;
    if (quantity >= variant.stock) {
      setFeedback({ kind: "stockLimit" });
      return;
    }

    cart.addItem({
      variantId: variant.id,
      variantName: variant.name,
      sku: variant.sku,
      productName: product.name,
      productSlug: product.slug,
      price: variant.amount,
      quantity: 1,
      image: variant.image ?? product.image,
    });
    setFeedback({ kind: "added" });
    setOpen(false);
  }

  const quickAddLabel = t("quickAddFor", { product: product.title });
  const AddIcon = feedback?.kind === "added" ? Check : Plus;
  const quickAddIcon = (
    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border border-primary/10 bg-white/95 shadow-sm group-hover/add:bg-primary group-hover/add:text-primary-foreground">
      <AddIcon className="size-4" />
    </span>
  );
  const framing = product.framing;
  const framingStyle = framing ? {
    "--packshot-width": `${framing.width}%`,
    "--packshot-x": `-${framing.centerX ?? 50}%`,
    "--packshot-y": `-${framing.centerY ?? 50}%`,
    "--packshot-shadow-top": framing.shadowTop ? `${framing.shadowTop}%` : undefined,
  } as CSSProperties : undefined;

  return (
    <li className={`${styles.card} flex min-w-0 flex-col`}>
      <div className={styles.frame}>
        <Link href={href} aria-label={product.name} className={`${styles.imageLink} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}>
          <div className={styles.imageLayer} style={framingStyle}>
            {product.image ? (
              framing ? (
                <Image src={product.image} alt={product.name} width={900} height={1200} sizes={imageSizes} className={styles.packshot} />
              ) : (
                <Image src={product.image} alt={product.name} fill sizes={imageSizes} className={styles.fallbackImage} />
              )
            ) : (
              <span className="absolute inset-0 grid place-items-center px-3 text-center text-sm text-muted-foreground">{tHome("imagePlaceholder")}</span>
            )}
            {framing?.shadowTop && <span aria-hidden="true" className={styles.contactShadow} />}
          </div>
        </Link>
        {product.badge && (
          <span className="pointer-events-none absolute top-3 left-3 font-sans text-[9px] font-medium tracking-[0.16em] text-primary uppercase">
            {t(product.badge)}
          </span>
        )}

        {canQuickAdd && (singleVariant ? (
          <button type="button" className={addButton} title={quickAddLabel} aria-label={quickAddLabel} onClick={() => addVariant(singleVariant)}>
            {quickAddIcon}
          </button>
        ) : (
          <Dialog open={open} onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) setVariantId(variants.length === 1 && variants[0].stock > 0 ? variants[0].id : undefined);
          }}>
            <DialogTrigger className={addButton} title={quickAddLabel} aria-label={quickAddLabel}>
              {quickAddIcon}
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-4 overflow-y-auto rounded-md bg-[#fbf8f3] p-5 sm:max-w-md sm:p-6">
              <div className="pr-8">
                <DialogTitle className="text-2xl leading-tight text-primary">{product.title}</DialogTitle>
                <DialogDescription className="mt-1.5">{tProduct("variantLabel")}</DialogDescription>
              </div>
              <DialogClose render={<button type="button" aria-label={t("closeOptions")} className="absolute top-3 right-3 grid size-10 place-items-center rounded-sm text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary" />}>
                <X aria-hidden="true" className="size-4" />
              </DialogClose>
              <div role="group" aria-label={tProduct("variantLabel")} className="grid gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={variant.id === variantId}
                    disabled={variant.stock <= 0}
                    onClick={() => setVariantId(variant.id)}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-sm border border-primary/15 px-3 py-2 text-left text-sm text-foreground hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/5 disabled:opacity-55"
                  >
                    <span>{variant.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-primary">{variant.stock > 0 ? variant.price : tProduct("outOfStock")}</span>
                  </button>
                ))}
              </div>
              {atStockLimit && <p role="status" className="text-sm text-muted-foreground">{t("stockLimit")}</p>}
              <button
                type="button"
                disabled={!selected || atStockLimit}
                onClick={() => { if (selected) addVariant(selected); }}
                className="min-h-11 rounded-sm bg-primary px-4 py-2 font-sans text-sm text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45"
              >
                {tProduct("addToBag")}
              </button>
            </DialogContent>
          </Dialog>
        ))}
        <span role="status" className={feedback ? "pointer-events-none absolute bottom-3.5 left-2 z-10 max-w-[calc(100%-3.5rem)] rounded-sm bg-white px-2 py-1 text-xs leading-tight text-primary shadow-sm" : "sr-only"}>
          {feedback && t(feedback.kind)}
        </span>
      </div>

      <div className="mt-4 flex flex-1 flex-col lg:mt-5">
        <Link href={href} title={product.name} className="block min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <h3 className="m-0 line-clamp-2 break-words font-sans text-[13px] leading-5 font-normal text-foreground hover:text-primary sm:text-sm">
            {product.title}
          </h3>
          {product.details && <p title={product.details} className="mt-1.5 truncate text-xs leading-[1.4] text-muted-foreground">{product.details}</p>}
        </Link>

        {product.swatches.length > 1 && (
          <div role="group" aria-label={t("colorsLabel")} className="mt-1 flex flex-wrap gap-x-0.5">
            {product.swatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                title={swatch.label}
                aria-label={swatch.label}
                aria-pressed={color === swatch.id}
                onClick={() => setColor(color === swatch.id ? undefined : swatch.id)}
                className="grid size-7 place-items-center rounded-full border border-transparent focus-visible:outline-2 focus-visible:outline-primary aria-pressed:border-primary/70"
              >
                <span aria-hidden="true" className="size-3 rounded-full border border-foreground/15" style={{ backgroundColor: swatch.hex }} />
              </button>
            ))}
          </div>
        )}

        <p className="mt-auto pt-3 font-sans text-sm leading-5 font-[300] tabular-nums text-[#642b43]">{product.price}</p>
      </div>
    </li>
  );
}
