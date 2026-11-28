"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt?: string | null };

export function ProductGallery({ images, name, index, onIndexChange, onZoom }: {
  images: GalleryImage[];
  name: string;
  index: number;
  onIndexChange: (index: number) => void;
  onZoom: () => void;
}) {
  const t = useTranslations("ProductOffer");
  const start = useRef<{ x: number; y: number } | null>(null);
  const lastSwipe = useRef(-Infinity);
  const currentIndex = images[index] ? index : 0;
  const current = images[currentIndex];
  const hasNavigation = images.length > 1;
  const firstThumbnail = Math.max(0, Math.min(currentIndex - 2, images.length - 5));

  const change = (step: number) => onIndexChange((currentIndex + step + images.length) % images.length);

  return (
    <section className={cn("w-full min-w-0", hasNavigation && "lg:grid lg:grid-cols-[3.5rem_minmax(0,1fr)] lg:items-start lg:gap-3")} aria-label={t("gallery")}>
      {hasNavigation && (
        <div data-pdp-thumbnail-rail className="hidden gap-2 lg:grid">
          {images.slice(firstThumbnail, firstThumbnail + 5).map((image, offset) => {
            const imageIndex = firstThumbnail + offset;
            return (
              <button
                key={image.url}
                type="button"
                aria-label={t("showPhoto", { index: imageIndex + 1 })}
                aria-current={imageIndex === currentIndex}
                onClick={() => onIndexChange(imageIndex)}
                className={cn("relative size-14 overflow-hidden rounded-[0.5rem] border bg-[var(--pdp-stone)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  imageIndex === currentIndex ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/60")}
              >
                <Image src={image.url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            );
          })}
        </div>
      )}
      <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[1rem] bg-muted">
        {current && (
          <button
            type="button"
            onClick={(event) => {
              if (event.detail > 0 && performance.now() - lastSwipe.current < 350) return;
              onZoom();
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              start.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const origin = start.current;
              start.current = null;
              if (!origin || images.length < 2) return;
              const touch = event.changedTouches[0];
              const x = touch.clientX - origin.x;
              const y = touch.clientY - origin.y;
              if (Math.abs(x) < 35 || Math.abs(x) <= Math.abs(y)) return;
              lastSwipe.current = performance.now();
              change(x < 0 ? 1 : -1);
            }}
            onTouchCancel={() => { start.current = null; }}
            onKeyDown={(event) => {
              if (images.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              change(event.key === "ArrowLeft" ? -1 : 1);
            }}
            aria-label={t("zoomPhoto", { index: currentIndex + 1 })}
            className="absolute inset-0 w-full cursor-zoom-in touch-pan-y focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary"
          >
            <Image
              src={current.url}
              alt={current.alt || name}
              fill
              priority={currentIndex === 0}
              sizes="(min-width: 1024px) 470px, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
              className="pointer-events-none h-full w-full object-cover"
            />
          </button>
        )}
        {hasNavigation && ([-1, 1] as const).map((step) => {
          const Icon = step < 0 ? ChevronLeft : ChevronRight;
          return (
            <button
              key={step}
              type="button"
              aria-label={t(step < 0 ? "previousPhoto" : "nextPhoto")}
              className={cn("absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 text-foreground transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100", step < 0 ? "left-3" : "right-3")}
              onClick={() => change(step)}
            >
              <Icon className="size-5" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {hasNavigation && (
        <div className="flex flex-wrap justify-center lg:hidden">
          {images.map((image, imageIndex) => (
            <button
              key={image.url}
              type="button"
              aria-label={t("showPhoto", { index: imageIndex + 1 })}
              aria-current={imageIndex === currentIndex}
              className="grid size-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => onIndexChange(imageIndex)}
            >
              <span className={cn("size-1.5 rounded-full", imageIndex === currentIndex ? "bg-primary" : "bg-foreground/25")} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
