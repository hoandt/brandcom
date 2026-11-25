import type { Metadata, ResolvingMetadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { StaticHero } from "@/components/storefront/static-hero"
import { AuriaBareSpotlight } from "@/components/storefront/auria-bare-spotlight"
import { HomepageMedia } from "@/components/storefront/homepage-media"
import { CollectionExplorer } from "@/components/storefront/collection-explorer"
import { Suspense } from "react"
import { FeaturedProducts, FeaturedProductsSkeleton } from "@/components/storefront/featured-products"
import { homepageHeroImage } from "@/lib/homepage-hero-image"
import { getStoreSettings } from "@/lib/store-settings"
import { storefrontAlternates, storefrontSiteUrl } from "@/lib/storefront-seo"

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale } = await params
  const [{ openGraph }, settings, t] = await Promise.all([
    parent,
    getStoreSettings(),
    getTranslations({ locale, namespace: "Homepage" }),
  ])
  const isDefaultLocale = locale === settings.defaultLocale
  const title = (isDefaultLocale && settings.seoTitle?.trim()) || t("seoTitle")
  const description = (isDefaultLocale && settings.seoDescription?.trim()) || t("seoDescription")
  const alternates = storefrontAlternates(locale)
  const heroImage = {
    url: `${storefrontSiteUrl}${homepageHeroImage.src}`,
    width: homepageHeroImage.width,
    height: homepageHeroImage.height,
    alt: t("heroImageAlt"),
  }

  return {
    title: { absolute: title },
    description,
    alternates,
    openGraph: {
      ...openGraph,
      title,
      description,
      url: alternates.canonical,
      images: [heroImage, ...(openGraph?.images ?? [])],
    },
    twitter: { card: "summary_large_image", title, description, images: [heroImage] },
  }
}

export default async function StorefrontPage() {
  const locale = await getLocale()

  return (
    <div className="bg-[#fbf8f3]">
      <StaticHero />
      <Suspense fallback={null}>
        <HomepageMedia locale={locale} />
      </Suspense>
      <CollectionExplorer locale={locale} />
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts locale={locale} />
      </Suspense>
      <AuriaBareSpotlight locale={locale} />
    </div>
  )
}
