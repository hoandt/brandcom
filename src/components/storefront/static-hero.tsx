"use client";

import { getImageProps } from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { homepageHeroImage } from "@/lib/homepage-hero-image";
import { StorefrontArrowLink } from "./storefront-arrow-link";
import styles from "./static-hero.module.css";

const phonePortraitMedia = "(max-width: 639px) and (orientation: portrait)";

export function StaticHero() {
  const locale = useLocale();
  const t = useTranslations("Homepage");
  const [lead, ...remainingLines] = t("heroTitle").split("\n");
  const imageOptions = { alt: t("heroImageAlt"), fill: true, priority: true, sizes: "100vw" };
  const { props: mobileImage } = getImageProps({
    ...imageOptions,
    src: homepageHeroImage.mobileSrc,
  });
  const { props: tabletImage } = getImageProps({
    ...imageOptions,
    src: homepageHeroImage.tabletSrc,
  });
  const { props: desktopImage } = getImageProps({
    ...imageOptions,
    src: homepageHeroImage.src,
    overrideSrc: homepageHeroImage.src,
    fetchPriority: "high",
    className: "object-cover object-top lg:object-right",
  });

  return (
    <section
      aria-labelledby="homepage-hero-title"
      className="relative isolate grid border-b border-[#e4d5cf] bg-[#fff7f7] lg:aspect-[11/4] lg:items-center"
    >
      <div className={`${styles.art} relative aspect-[16/9] overflow-hidden bg-[#f3c5d2] sm:aspect-[2/1] lg:absolute lg:inset-0 lg:aspect-auto`}>
        <picture className="absolute inset-0">
          <source
            media={phonePortraitMedia}
            sizes={mobileImage.sizes}
            srcSet={mobileImage.srcSet ?? homepageHeroImage.mobileSrc}
          />
          <source
            media="(width < 64rem)"
            sizes={tabletImage.sizes}
            srcSet={tabletImage.srcSet ?? homepageHeroImage.tabletSrc}
          />
          <img {...desktopImage} alt={imageOptions.alt} />
        </picture>
      </div>

      <div className="relative flex min-w-0 flex-col items-start px-6 py-7 max-lg:storefront-blush-gradient sm:px-10 sm:py-9 lg:w-[34%] lg:pb-14 lg:pl-[clamp(2rem,3.5vw,4.5rem)] lg:pr-4 lg:pt-6">
        <p className="mb-3 text-sm font-medium leading-5 text-[#7a5260]">
          Auria Bare · Breathable
        </p>
        <h1
          id="homepage-hero-title"
          className="m-0 text-[clamp(2.75rem,12vw,3.5rem)] leading-[1.15] tracking-[-0.04em] text-[#472132] [font-family:var(--font-heading),var(--font-heading-fallback),serif] sm:text-[3.75rem] lg:text-[clamp(3rem,5.2vw,5.5rem)]"
        >
          <span className="block">{lead}</span>
          {remainingLines.length > 0 && (
            <>
              {"\n"}
              <span className="block whitespace-pre-line text-[0.84em] tracking-[-0.03em] text-[#632b44]">
                {remainingLines.join("\n")}
              </span>
            </>
          )}
        </h1>
        <p className="mt-6 max-w-[26rem] text-pretty text-base leading-relaxed tracking-[0.025em] text-[#58464b]">
          {t("heroSubtitle")}
        </p>
        <StorefrontArrowLink href={`/${locale}/collections/breathable`} className="mt-5">
          {t("shopBreathable")}
        </StorefrontArrowLink>
      </div>
    </section>
  );
}
