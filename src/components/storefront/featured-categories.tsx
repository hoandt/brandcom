import { prisma } from "@/lib/prisma"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"

export async function FeaturedCategories({ locale }: { locale: string }) {
  const t = await getTranslations("Homepage")
  
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    take: 4,
    orderBy: { position: 'asc' },
  })

  if (categories.length === 0) return null

  return (
    <section className="storefront-container py-12 lg:py-24">
      <div className="flex items-end justify-between mb-8 lg:mb-12">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading uppercase tracking-widest mb-2">Shop by Category</h2>
          <p className="text-muted-foreground font-light">Explore our collections</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
        {categories.map((category) => (
          <Link key={category.id} href={`/${locale}/categories/${category.slug}`} className="group block min-w-0">
            <div className="relative overflow-hidden border bg-muted/30 aspect-square">
              {category.imageUrl ? (
                <Image 
                  src={category.imageUrl} 
                  alt={category.name} 
                  fill 
                  sizes="(max-width: 768px) 50vw, 25vw" 
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" 
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
                  <span className="font-heading text-3xl text-muted-foreground/25">A</span>
                </div>
              )}
            </div>
            <div className="flex items-start justify-between gap-2 border-x border-b border-border/80 px-3 py-3 lg:px-4 lg:py-4">
              <div className="min-w-0">
                <p className="truncate text-xs lg:text-sm font-bold uppercase tracking-[0.08em] group-hover:text-primary transition-colors">
                  {category.name}
                </p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function FeaturedCategoriesSkeleton() {
  return (
    <section className="storefront-container py-12 lg:py-24">
      <div className="flex items-end justify-between mb-8 lg:mb-12">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-secondary/50 animate-pulse rounded-md" />
          <div className="h-4 w-64 bg-secondary/50 animate-pulse rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col">
            <div className="aspect-square bg-secondary/50 animate-pulse border" />
            <div className="h-12 border-x border-b bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  )
}
