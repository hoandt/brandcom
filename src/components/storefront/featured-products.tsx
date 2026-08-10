import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ProductCard } from "./product-card"

export async function FeaturedProducts({ locale }: { locale: string }) {
  const t = await getTranslations("Homepage")
  
  const [products, storeSettings] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: { where: { isActive: true }, orderBy: { price: "asc" } },
        images: { orderBy: { position: 'asc' }, take: 2 },
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
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            locale={locale}
            currency={currency || undefined}
            imagePlaceholder={t("imagePlaceholder")}
          />
        ))}
        
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
