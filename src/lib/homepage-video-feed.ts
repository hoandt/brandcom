import { getTranslations } from "next-intl/server";
import { auriaEditVideoDirectory, auriaEditVideos } from "@/lib/auria-edit-videos";
import { getDynamicComponent } from "@/lib/dynamic-components";
import { socialVideoSchema, type SocialVideoClip, type SocialVideoFeedItem } from "@/lib/homepage-media";
import { prisma } from "@/lib/prisma";
import { storefrontCache } from "@/lib/storefront-cache";
import { storefrontSiteUrl } from "@/lib/storefront-seo";
import { getStoreSettings } from "@/lib/store-settings";
import { formatPrice, formatStorefrontProductName } from "@/lib/utils";

const storefrontOrigin = new URL(storefrontSiteUrl).origin;

export async function getHomepageVideoContent(locale: string) {
  const config = socialVideoSchema.safeParse(await getDynamicComponent<unknown>("video-social-preview"));
  if (!config.success) return null;

  const t = await getTranslations({ locale, namespace: "Homepage.media" });
  const savedVideoUrls = new Set(config.data.items.map(({ videoUrl }) => videoUrl));
  const bundledClips: SocialVideoClip[] = config.data.includeBundledVideos === false ? [] : auriaEditVideos.flatMap((clip) => {
    const base = `${auriaEditVideoDirectory}/${clip.slug}`;
    const videoUrl = `${base}.mp4`;
    if (savedVideoUrls.has(videoUrl)) return [];
    return [{
      title: t(`clips.${clip.slug}`),
      posterUrl: `${base}.webp`,
      videoUrl,
      socialUrl: "",
      productUrl: `/products/${clip.productSlug}`,
      relatedProduct: clip.relatedProduct,
    }];
  });

  return { heading: config.data.heading || t("socialVideos"), items: [...bundledClips, ...config.data.items] };
}

function getProductSlug(href: string) {
  if (!href) return;
  try {
    const url = new URL(href, storefrontOrigin);
    if (url.origin !== storefrontOrigin) return;
    const slug = /^\/(?:(?:vi|en|th)\/)?products\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    if (slug) return decodeURIComponent(slug);
  } catch {
    return undefined;
  }
}

function localizedLink(href: string, locale: string) {
  return href.startsWith("/") && !/^\/(vi|en|th)(\/|$)/.test(href) ? `/${locale}${href}` : href;
}

export async function getHomepageVideoFeed(locale: string) {
  const content = await getHomepageVideoContent(locale);
  if (!content?.items.length) return null;

  const slugs = Array.from(new Set(content.items.flatMap(({ productUrl }) => {
    const slug = getProductSlug(productUrl);
    return slug ? [slug] : [];
  }))).sort();

  try {
    const [settings, t] = await Promise.all([
      getStoreSettings(),
      getTranslations({ locale, namespace: "Homepage.productSelection" }),
    ]);
    const products = slugs.length === 0 ? [] : await storefrontCache(
      "products:homepage:videos:" + slugs.join(","),
      settings.productCacheSeconds,
      () => prisma.product.findMany({
        where: { slug: { in: slugs }, status: "ACTIVE" },
        select: {
          slug: true,
          name: true,
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
          variants: { where: { isActive: true }, select: { price: true }, orderBy: { price: "asc" } },
        },
      }),
    );
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    const items: SocialVideoFeedItem[] = content.items.map((clip) => {
      const slug = getProductSlug(clip.productUrl);
      const product = slug ? bySlug.get(slug) : undefined;
      const productUrl = localizedLink(clip.productUrl, locale);
      if (!product) return { ...clip, productUrl: slug ? "" : productUrl };

      const minPrice = product.variants[0]?.price;
      const maxPrice = product.variants.at(-1)?.price;
      const amount = minPrice === undefined ? t("contact") : formatPrice(Number(minPrice), locale, settings.currency || undefined);
      return {
        ...clip,
        productUrl,
        product: {
          title: formatStorefrontProductName(product.name, locale),
          image: product.images[0]?.url,
          price: minPrice !== undefined && Number(minPrice) < Number(maxPrice) ? t("fromPrice", { price: amount }) : amount,
        },
      };
    });

    return { heading: content.heading, items };
  } catch (error) {
    console.error("[HOMEPAGE_VIDEO_PRODUCTS]", error);
    return { ...content, items: content.items.map((clip) => ({ ...clip, productUrl: localizedLink(clip.productUrl, locale) })) };
  }
}
