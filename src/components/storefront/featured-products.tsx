import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"

export async function FeaturedProducts({ locale }: { locale: string }) {
  const t = await getTranslations("Homepage")
  
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    take: 4,
    orderBy: { createdAt: 'desc' },
    include: { 
      variants: true,
      images: {
        orderBy: { position: 'asc' },
        take: 1
      }
    }
  })

  return (
    <section className="py-24 px-4 md:px-8 container mx-auto">
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
          return (
            <Link key={product.id} href={`/${locale}/products/${product.slug}`} className="group flex flex-col gap-4">
              <div className="aspect-[4/5] bg-secondary overflow-hidden relative border border-transparent hover:border-border transition-colors">
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
              </div>
              <div className="flex flex-col items-center text-center">
                <h3 className="font-heading uppercase tracking-wider text-sm">{product.name}</h3>
                <p className="text-foreground mt-2 font-light text-sm">
                  ${product.variants[0]?.price?.toString() || "0.00"}
                </p>
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
    <section className="py-24 px-4 md:px-8 container mx-auto">
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
