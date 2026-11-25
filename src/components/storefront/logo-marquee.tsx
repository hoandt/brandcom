"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Pause, Play } from "lucide-react"
import type { LogoMarqueeContent } from "@/lib/homepage-media"
import styles from "./logo-marquee.module.css"

type Retailer = LogoMarqueeContent["items"][number]

function RetailerWordmark({ name, imageUrl, crop }: Retailer) {
  return (
    <span
      className={styles.wordmark}
      data-cropped={crop ? "true" : undefined}
      style={crop ? {
        aspectRatio: `${crop.width} / ${crop.height}`,
        width: `min(100%, 9.5rem, ${Math.round(crop.width / crop.height * crop.displayHeight)}px)`,
      } : undefined}
    >
      <Image
        src={imageUrl}
        alt={name}
        width={crop?.sourceWidth ?? 160}
        height={crop?.sourceHeight ?? 48}
        unoptimized
        className={styles.logo}
        style={crop ? {
          width: `${crop.sourceWidth / crop.width * 100}%`,
          height: `${crop.sourceHeight / crop.height * 100}%`,
          left: `${-crop.left / crop.width * 100}%`,
          top: `${-crop.top / crop.height * 100}%`,
        } : undefined}
      />
    </span>
  )
}

export function LogoMarquee({ content, heading }: { content: LogoMarqueeContent; heading: string }) {
  const t = useTranslations("Homepage.media")
  const [paused, setPaused] = useState(false)
  const animated = content.items.length > 1

  return (
    <section aria-labelledby="storefront-retailer-heading" className="relative bg-[#fbf8f3]">
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <filter id="storefront-retailer-ink" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 0 1"
              result="ink"
            />
            <feComposite in="ink" in2="SourceAlpha" operator="in" result="logoAlpha" />
            <feFlood floodColor="#472132" result="plum" />
            <feComposite in="plum" in2="logoAlpha" operator="in" />
          </filter>
        </defs>
      </svg>
      <div className="storefront-container py-6 sm:py-8">
        <div className="relative px-11">
          <h2 id="storefront-retailer-heading" className="m-0 text-center font-sans text-[11px] font-semibold leading-5 tracking-[0.24em] text-[#684e59] uppercase">
            {heading}
          </h2>
          {animated && (
            <button
              type="button"
              aria-controls="storefront-retailer-logos"
              aria-label={paused ? t("resumeLogos") : t("pauseLogos")}
              className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-full text-[#684e59] hover:bg-[#f2e8e8] focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:hidden"
              onClick={() => setPaused((previous) => !previous)}
            >
              {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            </button>
          )}
        </div>
        <div
          id="storefront-retailer-logos"
          className={styles.viewport}
          data-animated={animated}
          data-paused={paused}
        >
          <div className={styles.track}>
            {(animated ? [false, true] : [false]).map((duplicate) => (
              <ul
                key={String(duplicate)}
                className={styles.logos}
                aria-hidden={duplicate || undefined}
                role="list"
              >
                {content.items.map((item, index) => {
                  const wordmark = <RetailerWordmark {...item} name={duplicate ? "" : item.name} />
                  return (
                    <li key={index} className={styles.item}>
                      {item.href ? (
                        <a
                          href={item.href}
                          tabIndex={duplicate ? -1 : undefined}
                          className="flex min-h-11 w-full items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          {wordmark}
                        </a>
                      ) : wordmark}
                    </li>
                  )
                })}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
