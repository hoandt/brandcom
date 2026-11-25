import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { StorefrontArrowLink } from "./storefront-arrow-link";

export async function AuriaBareSpotlight({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Homepage.auriaBareSpotlight" });

  return (
    <section
      id="auria-bare"
      aria-labelledby="auria-bare-title"
      className="grid scroll-mt-20 bg-white md:grid-cols-[min(42%,32rem)_minmax(0,1fr)]"
    >
      <div className="relative aspect-[9/10] w-full">
        <Image
          src="/banners/auria-nipple-cover.jpg"
          alt={t("imageAlt")}
          fill
          sizes="(min-width: 76.2rem) 512px, (min-width: 48rem) 42vw, 100vw"
          className="object-cover object-top"
        />
      </div>

      <div className="min-w-0 self-center px-6 py-9 sm:px-8 md:px-[clamp(2rem,6vw,7rem)] md:py-12">
        <h2
          id="auria-bare-title"
          className="m-0 text-pretty text-3xl leading-[1.12] text-[#472132] md:text-[2.5rem]"
        >
          {t("title")}
        </h2>
        <p className="mt-4 max-w-[32rem] text-base leading-[1.7] text-[#58464b]">
          {t("description")}
        </p>
        <StorefrontArrowLink href={`/${locale}/collections/breathable`} className="mt-5">
          {t("cta")}
        </StorefrontArrowLink>
      </div>
    </section>
  );
}
