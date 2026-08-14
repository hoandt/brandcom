import { getLocale } from "next-intl/server"
import { VideoHero } from "@/components/storefront/video-hero"
import { Suspense } from "react"
import { FeaturedProducts, FeaturedProductsSkeleton } from "@/components/storefront/featured-products"
import { FeaturedCategories, FeaturedCategoriesSkeleton } from "@/components/storefront/featured-categories"

export default async function StorefrontPage() {
  const locale = await getLocale()

  return (
    <div className="flex flex-col -mt-20">
      {/* Hero Section */}
      <VideoHero 
        desktopVideoUrl="https://image.uniqlo.com/UQ/CMS/video/jp/2026/HOME/GL_Aseets/Campaign/Inner/inner-w-movie01-pc-2-1.mp4"
        mobileVideoUrl="https://image.uniqlo.com/UQ/CMS/video/jp/2026/HOME/GL_Aseets/Campaign/Inner/inner-w-movie01-sp-1-1.mp4"
        locale={locale}
      />

      {/* Featured Categories */}
      <Suspense fallback={<FeaturedCategoriesSkeleton />}>
        <FeaturedCategories locale={locale} />
      </Suspense>

      {/* Featured Products */}
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts locale={locale} />
      </Suspense>
    </div>
  )
}
