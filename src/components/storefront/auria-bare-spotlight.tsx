import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

export async function AuriaBareSpotlight({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Homepage.auriaBareSpotlight" });

  return (
    <section
      id="auria-bare"
      aria-labelledby="auria-bare-title"
      className="scroll-mt-20 bg-gradient-to-br from-[#fdf2f2] to-[#fae8e8]"
    >
      <div className="storefront-container grid gap-5 pb-14 pt-3 md:grid-cols-[300px_minmax(0,1fr)] md:items-center md:gap-12 md:pb-20 md:pt-6">
        <Image
          src="/banners/auria-nipple-cover.jpg"
          alt={t("imageAlt")}
          width={867}
          height={1155}
          sizes="(min-width: 48rem) 300px, (min-width: 40rem) calc(100vw - 3rem), calc(100vw - 2rem)"
          className="block h-auto w-full"
        />

        <div className="min-w-0">
          <h2
            id="auria-bare-title"
            className="m-0 text-pretty text-3xl leading-[1.12] text-[#472132] md:text-[2.5rem]"
          >
            {t("title")}
          </h2>
          <p className="mt-3 max-w-[32rem] text-base leading-[1.7] text-[#58464b]">
            {t("description")}
          </p>
          <Link
            href={`/${locale}/collections/breathable`}
            className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2.5 text-base font-medium leading-snug text-primary hover:text-[#681830] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
          >
            <span className="underline underline-offset-4">{t("cta")}</span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
