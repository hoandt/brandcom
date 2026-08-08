import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Star } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { formatPrice } from "@/lib/utils"

export async function FeaturedProducts({ locale }: { locale: string }) {
  const t = await getTranslations("Homepage")
  
  const [products, storeSettings] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: { where: { isActive: true }, orderBy: { price: "asc" } },
        images: { orderBy: { position: 'asc' }, take: 1 },
        categories: { where: { isActive: true }, orderBy: [{ position: "asc" }, { name: "asc" }], take: 1 },
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      }
    }),
    prisma.storeSettings.findFirst({ select: { currency: true } }),
  ])

  const currency = storeSettings?.currency

  return (
    <section className="storefront-container py-24">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading uppercase tracking-widest mb-2">{t("newArrivals")}</h2>
          <p className="text-muted-foreground font-light">{t("newArrivalsSubtitle")}</p>
        </div>
        <Link href={`/${locale}/collections/all`} className="hidden md:flex items-center text-sm font-heading uppercase tracking-widest font-medium hover:text-foreground/70 transition-colors">
          {t("viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => {
          const mainImage = product.images[0]?.url
          const primaryVariant = product.variants[0]
          const price = primaryVariant ? Number(primaryVariant.price) : 0
          const comparePrice = primaryVariant?.comparePrice ? Number(primaryVariant.comparePrice) : null
          const isOnSale = comparePrice !== null && comparePrice > price
          const ratingCount = product.reviews.length
          const averageRating = ratingCount > 0
            ? product.reviews.reduce((total, review) => total + review.rating, 0) / ratingCount
            : 0
          const categoryName = product.categories[0]?.name || (locale === "vi" ? "Sản phẩm mới" : "New arrival")

          return (
            <Link key={product.id} href={`/${locale}/products/${product.slug}`} className="group flex min-w-0 flex-col">
              <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {isOnSale && (
                  <span className="absolute left-3 top-3 z-10 bg-primary px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
                    {locale === "vi" ? "Ưu đãi" : "Sale"}
                  </span>
                )}
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-secondary flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                     <span className="text-muted-foreground font-heading uppercase tracking-widest text-xs">{t("imagePlaceholder")}</span>
                  </div>
                )}
                <span className="absolute inset-x-3 bottom-3 z-10 flex translate-y-2 items-center justify-between bg-background/95 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  {locale === "vi" ? "Xem sản phẩm" : "View product"}
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </span>
              </div>
              <div className="flex flex-col border-x border-b border-border/60 px-3 py-3.5 text-left sm:px-4">
                <span className="mb-1.5 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80">
                  {categoryName}
                </span>
                <h3 className="line-clamp-2 min-h-[2.5rem] font-heading text-sm font-medium uppercase leading-5 tracking-[0.07em] text-foreground transition-colors group-hover:text-primary">
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
                  <span className="text-sm font-extrabold tracking-tight text-primary">
                    {product.variants.length > 1 && <span className="mr-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{locale === "vi" ? "Từ" : "From"}</span>}
                    {formatPrice(price, locale, currency)}
                  </span>
                  {isOnSale && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      {formatPrice(comparePrice!, locale, currency)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
        
        {products.length === 0 && (
          <div className="col-span-full text-center py-32 text-muted-foreground border border-dashed">
            <span className="font-heading uppercase tracking-widest">{t("noProducts")}</span>
          </div>
        )}
      </div>
      
      <div className="mt-12 md:hidden flex justify-center">
        <Button
          variant="outline"
          className="w-full"
          render={<Link href={`/${locale}/collections/all`} />}
        >
          {t("viewAll")}
        </Button>
      </div>
    </section>
  )
}

export function FeaturedProductsSkeleton() {
  return (
    <section className="storefront-container py-24">
      <div className="flex items-end justify-between mb-12">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-secondary/50 animate-pulse rounded-md" />
          <div className="h-4 w-64 bg-secondary/50 animate-pulse rounded-md" />
        </div>
        <div className="hidden md:block h-4 w-24 bg-secondary/50 animate-pulse rounded-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-4">
            <div className="aspect-[4/5] bg-secondary/50 animate-pulse rounded-md" />
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-4 w-32 bg-secondary/50 animate-pulse rounded-md" />
              <div className="h-4 w-16 bg-secondary/50 animate-pulse rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
