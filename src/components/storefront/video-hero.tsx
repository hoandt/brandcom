"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface VideoHeroProps {
  desktopVideoUrl: string;
  mobileVideoUrl: string;
  locale: string;
}

export function VideoHero({ desktopVideoUrl, mobileVideoUrl, locale }: VideoHeroProps) {
  const t = useTranslations("Homepage");

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden bg-secondary">
      {/* Mobile Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover md:hidden"
        src={mobileVideoUrl}
      />
      {/* Desktop Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover hidden md:block"
        src={desktopVideoUrl}
      />
      
      {/* Subtle overlay gradient to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* Content - Positioned Bottom Left like Uniqlo */}
      <div className="storefront-container absolute inset-0 flex items-end pb-16 md:pb-24">
        <div className="relative z-10 max-w-2xl text-left">
          <div className="inline-block mb-4 px-3 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-full">
            Trending
          </div>

          <h1 className="text-4xl font-light tracking-[0.05em] text-white md:text-5xl lg:text-6xl font-heading drop-shadow-lg">
            {t("heroTitle")}
          </h1>

          <p className="mt-4 max-w-xl text-base md:text-lg leading-relaxed text-white/90 drop-shadow-md font-light">
            {t("heroSubtitle")} - Thoughtfully designed essentials that feel effortless, comfortable and beautifully invisible.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              className="px-8 bg-white text-primary hover:bg-white/90 border-none shadow-lg rounded-full"
              render={<Link href={`/${locale}/collections/all`} />}
            >
              {t("shopNow")}
            </Button>
            <Button
              variant="outline"
              className="px-8 border-white text-white hover:bg-white hover:text-primary shadow-lg rounded-full bg-transparent"
              render={<Link href={`/${locale}/pages/about-us`} />}
            >
              {t("learnMore")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
