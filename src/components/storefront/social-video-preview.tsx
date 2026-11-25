"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Play, X } from "lucide-react"
import type { SocialVideoContent } from "@/lib/homepage-media"

type Playback = { index: number; mode: "preview" | "manual" }

const mediaGrade = "[filter:saturate(.88)_sepia(.08)_contrast(.97)_brightness(1.025)]"
const cornerIcon = "grid size-7 place-items-center rounded-full border border-white/70 bg-black/15 text-white backdrop-blur-[2px]"
const mediaFocus = "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
const navigationButton = "grid size-11 shrink-0 place-items-center rounded-full text-[#684e59] enabled:hover:bg-[#f0e7e4] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-30"

export function SocialVideoPreview({ content, heading, locale }: {
  content: SocialVideoContent
  heading: string
  locale: string
}) {
  const t = useTranslations("Homepage.media")
  const track = useRef<HTMLUListElement>(null)
  const player = useRef<HTMLVideoElement>(null)
  const [playback, setPlayback] = useState<Playback | null>(null)
  const [failedClip, setFailedClip] = useState<number | null>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const activeIndex = playback?.index
  const manualPlayback = playback?.mode === "manual"

  useEffect(() => {
    const list = track.current
    if (!list) return

    const updateEdges = () => {
      const start = list.scrollLeft <= 1
      const end = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1
      setEdges((previous) => previous.start === start && previous.end === end ? previous : { start, end })
    }
    const observer = new ResizeObserver(updateEdges)
    observer.observe(list)
    list.addEventListener("scroll", updateEdges, { passive: true })
    updateEdges()
    return () => {
      observer.disconnect()
      list.removeEventListener("scroll", updateEdges)
    }
  }, [])

  useEffect(() => {
    const video = player.current
    if (!video || activeIndex === undefined) return

    if (manualPlayback) video.focus({ preventScroll: true })
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.25) return
      video.pause()
      if (!manualPlayback) {
        setPlayback((current) => current?.index === activeIndex && current.mode === "preview" ? null : current)
      }
    }, { threshold: 0.25 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [activeIndex, manualPlayback])

  function preview(index: number, pointerType: string) {
    if (!content.items[index].videoUrl || failedClip === index || pointerType !== "mouse" ||
        !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
      return
    }
    setPlayback((current) => current?.mode === "manual" ? current : { index, mode: "preview" })
  }

  function stopPreview(index: number) {
    setPlayback((current) => current?.index === index && current.mode === "preview" ? null : current)
  }

  function togglePlayback(index: number) {
    if (activeIndex === index && manualPlayback) {
      setPlayback(null)
      return
    }
    if (activeIndex === index) void player.current?.play().catch(() => undefined)
    setFailedClip(null)
    setPlayback({ index, mode: "manual" })
  }

  function move(direction: -1 | 1) {
    const list = track.current
    if (!list || list.children.length < 2) return
    const step = list.children[1].getBoundingClientRect().left - list.children[0].getBoundingClientRect().left
    list.scrollBy({ left: direction * step })
  }

  return (
    <section
      id="storefront-social-heading"
      aria-label={heading}
      className="scroll-mt-20 bg-gradient-to-br from-[#fdf2f2] to-[#fae8e8]"
    >
      <div className="storefront-container py-8 sm:py-10 lg:py-12">
        <ul
          ref={track}
          id="storefront-social-videos"
          className="grid snap-x snap-mandatory auto-cols-[min(74vw,16rem)] grid-flow-col gap-5 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] motion-safe:scroll-smooth sm:auto-cols-[calc((100%-3rem)/3)] sm:gap-6 lg:auto-cols-[calc((100%-6rem)/4)] lg:gap-8"
        >
          {content.items.map((clip, index) => {
            const isActive = activeIndex === index
            const isManual = isActive && manualPlayback
            const isPreview = isActive && !isManual
            const productHref = clip.productUrl.startsWith("/") && !/^\/(vi|en|th)(\/|$)/.test(clip.productUrl)
              ? `/${locale}${clip.productUrl}`
              : clip.productUrl

            return (
              <li key={index} className="min-w-0 snap-start">
                <div
                  className="relative aspect-[3/4] overflow-hidden rounded-[6px] bg-[#e9dedb]"
                  onPointerEnter={(event) => preview(index, event.pointerType)}
                  onPointerLeave={() => stopPreview(index)}
                >
                  {isActive ? (
                    <video
                      ref={player}
                      src={clip.videoUrl}
                      poster={clip.posterUrl}
                      aria-label={clip.title}
                      aria-hidden={!isManual || undefined}
                      tabIndex={isManual ? 0 : -1}
                      className={`size-full ${mediaGrade} ${isManual ? "bg-[#261b20] object-contain" : "object-cover object-[center_42%]"}`}
                      autoPlay
                      controls={isManual}
                      loop={!isManual}
                      muted
                      playsInline
                      onError={() => {
                        setFailedClip(index)
                        setPlayback((current) => current?.index === index ? null : current)
                      }}
                    />
                  ) : (
                    <Image
                      src={clip.posterUrl}
                      alt={clip.title}
                      fill
                      unoptimized
                      sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 74vw"
                      className={`object-cover object-[center_42%] ${mediaGrade}`}
                    />
                  )}
                  {clip.videoUrl ? (
                    <button
                      type="button"
                      aria-label={t(isManual ? "closeVideo" : "playVideo", { title: clip.title })}
                      className={`group absolute ${isManual ? "top-0 right-0 grid size-11 place-items-center" : "inset-0"} ${mediaFocus}`}
                      onClick={() => togglePlayback(index)}
                    >
                      <span className={`${cornerIcon} ${isManual ? "" : "absolute top-2 right-2"} ${isPreview ? "opacity-0 group-focus-visible:opacity-100" : ""}`}>
                        {isManual ? <X className="size-3.5" strokeWidth={1.35} aria-hidden /> : <Play className="size-3" strokeWidth={1.5} aria-hidden />}
                      </span>
                    </button>
                  ) : (
                    <a
                      href={clip.socialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("openVideo", { title: clip.title })}
                      className={`absolute inset-0 ${mediaFocus}`}
                    >
                      <span className={`${cornerIcon} absolute top-2 right-2`}>
                        <ArrowUpRight className="size-3.5" strokeWidth={1.35} aria-hidden />
                      </span>
                    </a>
                  )}
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <h3 className="m-0 min-w-0 flex-1 text-pretty font-sans text-[10px] font-medium leading-relaxed tracking-[0.09em] text-[#5e4c54] uppercase sm:text-[11px]">
                    {productHref ? (
                      <Link href={productHref} className="flex min-h-6 items-start justify-between gap-2 hover:text-[#472132] focus-visible:outline-2 focus-visible:outline-offset-2">
                        <span>{clip.title}</span>
                        <ArrowRight className="mt-px size-3.5 shrink-0 text-[#806e75]" strokeWidth={1.35} aria-hidden />
                      </Link>
                    ) : clip.title}
                  </h3>
                  {clip.videoUrl && clip.socialUrl && (
                    <a
                      href={clip.socialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("openVideo", { title: clip.title })}
                      className="shrink-0 text-[#806e75] hover:text-[#472132] focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <ArrowUpRight className="mt-px size-3.5" strokeWidth={1.35} aria-hidden />
                    </a>
                  )}
                </div>
                {failedClip === index && <p role="status" className="mt-1 text-xs text-[#642b43]">{t("videoError")}</p>}
              </li>
            )
          })}
        </ul>
        {(!edges.start || !edges.end) && (
          <div className="mt-1 flex justify-end">
            <button type="button" aria-label={t("previousVideos")} aria-controls="storefront-social-videos"
              className={navigationButton} disabled={edges.start} onClick={() => move(-1)}>
              <ChevronLeft className="size-4" strokeWidth={1.35} aria-hidden />
            </button>
            <button type="button" aria-label={t("nextVideos")} aria-controls="storefront-social-videos"
              className={navigationButton} disabled={edges.end} onClick={() => move(1)}>
              <ChevronRight className="size-4" strokeWidth={1.35} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
