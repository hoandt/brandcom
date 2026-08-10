import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ProductCardHoverVideo } from "./product-card-hover-video";

type NumericValue = number | string | { toString(): string };

export type StorefrontProductCardData = {
  id: string;
  name: string;
  slug: string;
  images: { url: string }[];
  variants: { price: NumericValue; comparePrice?: NumericValue | null; stock?: number }[];
  categories?: { name: string }[];
  reviews?: { rating: number }[];
  cardHoverVideoUrl?: string | null;
  cardHoverImageUrl?: string | null;
};

type ProductCardProps = {
  product: StorefrontProductCardData;
  locale: string;
  currency?: string;
  imagePlaceholder?: string;
};

export function ProductCard({ product, locale, currency, imagePlaceholder = "No image" }: ProductCardProps) {
  const mainImage = product.images[0]?.url;
  const alternateImage = product.cardHoverImageUrl || product.images[1]?.url;
  const hoverVideo = product.cardHoverVideoUrl;
  const hasHoverMedia = Boolean(hoverVideo || alternateImage);
  const sortedVariants = [...product.variants].sort((a, b) => Number(a.price) - Number(b.price));
  const primaryVariant = sortedVariants[0];
  const price = primaryVariant ? Number(primaryVariant.price) : null;
  const comparePrice = primaryVariant?.comparePrice ? Number(primaryVariant.comparePrice) : null;
  const isOnSale = price !== null && comparePrice !== null && comparePrice > price;
  const isSoldOut = product.variants.length > 0 && product.variants.every((variant) => (variant.stock ?? 1) <= 0);
  const reviews = product.reviews ?? [];
  const ratingCount = reviews.length;
  const averageRating = ratingCount > 0
    ? reviews.reduce((total, review) => total + review.rating, 0) / ratingCount
    : 0;
  const categoryName = product.categories?.[0]?.name || (locale === "vi" ? "Sản phẩm mới" : "New arrival");

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="group flex min-w-0 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {(isSoldOut || isOnSale) && (
          <span className={`absolute left-3 top-3 z-10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${isSoldOut ? "bg-background text-foreground" : "bg-primary text-primary-foreground"}`}>
            {isSoldOut ? (locale === "vi" ? "Hết hàng" : "Sold out") : (locale === "vi" ? "Ưu đãi" : "Sale")}
          </span>
        )}
        {mainImage ? (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-all duration-700 group-hover:scale-[1.025] ${hasHoverMedia ? "group-hover:opacity-0" : ""}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary transition-transform duration-700 group-hover:scale-[1.035]">
            <span className="px-4 text-center font-heading text-xs uppercase tracking-widest text-muted-foreground">{imagePlaceholder}</span>
          </div>
        )}
        {hoverVideo ? <ProductCardHoverVideo src={hoverVideo} poster={alternateImage || mainImage} /> : alternateImage && (
          <Image
            src={alternateImage}
            alt={`${product.name} alternate view`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover opacity-0 transition-all duration-700 group-hover:scale-[1.025] group-hover:opacity-100"
          />
        )}
        <span className="absolute inset-x-3 bottom-3 z-10 flex translate-y-2 items-center justify-between bg-background/95 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          {isSoldOut
            ? (locale === "vi" ? "Xem chi tiết" : "View details")
            : (locale === "vi" ? "Chọn tùy chọn" : "Select options")}
          <ArrowUpRight className="h-4 w-4 text-primary" />
        </span>
      </div>

      <div className="flex flex-1 flex-col border-x border-b border-border/60 px-3 py-3.5 text-left sm:px-4">
        <span className="mb-1.5 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80">{categoryName}</span>
        <h3 className="line-clamp-2 min-h-10 font-heading text-sm font-medium uppercase leading-5 tracking-[0.07em] text-foreground transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        <div className="mt-2 flex min-h-4 items-center gap-1.5 text-[10px]">
          <span className="flex items-center gap-1 font-semibold text-foreground/75">
            <Star className={`h-3.5 w-3.5 ${ratingCount > 0 ? "fill-primary text-primary" : "fill-muted text-muted-foreground/40"}`} />
            {ratingCount > 0 ? averageRating.toFixed(1) : (locale === "vi" ? "Mới" : "New")}
          </span>
          {ratingCount > 0 && <span className="text-muted-foreground">({ratingCount})</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {price === null ? (
            <span className="text-xs font-medium text-muted-foreground">{locale === "vi" ? "Liên hệ" : "Contact us"}</span>
          ) : (
            <>
              <span className="text-sm font-extrabold tracking-tight text-primary">
                {sortedVariants.length > 1 && <span className="mr-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{locale === "vi" ? "Từ" : "From"}</span>}
                {formatPrice(price, locale, currency)}
              </span>
              {isOnSale && <span className="text-[11px] text-muted-foreground line-through">{formatPrice(comparePrice!, locale, currency)}</span>}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
