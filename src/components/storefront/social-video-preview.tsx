"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, ShoppingBag, Volume2, VolumeX, X } from "lucide-react"
import type { SocialVideoFeedItem } from "@/lib/homepage-media"
import styles from "./social-video-preview.module.css"
import { useLoopingVideoCarousel, wrapVideoIndex } from "./use-looping-video-carousel"

type PlaybackOverride = { index: number; mode: "manual" | "paused" }

const mediaGrade = "[filter:saturate(.88)_sepia(.08)_contrast(.97)_brightness(1.025)]"
const cornerIcon = "grid size-7 place-items-center rounded-full border border-white/70 bg-black/15 text-white backdrop-blur-[2px]"
const mediaFocus = "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
const cornerButton = `absolute top-0 right-0 grid size-11 place-items-center ${mediaFocus}`
const navigationButton = "grid size-11 shrink-0 place-items-center rounded-full text-[#684e59] focus-visible:outline-2 focus-visible:outline-offset-2"
const overlayAction = `${styles.overlayAction} rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`
const hoverVisibility = 0.25
const autoplayVisibility = 0.5

export function SocialVideoPreview({ items, heading }: {
  items: SocialVideoFeedItem[]
  heading: string
}) {
  const t = useTranslations("Homepage.media")
  const { track, centered, settledCenter, padding, move, centerIfNeeded, resetScrollTarget } = useLoopingVideoCarousel(items.length)
  const players = useRef<(HTMLVideoElement | null)[]>([])
  const centerControl = useRef<HTMLButtonElement>(null)
  const [playbackOverride, setPlaybackOverride] = useState<PlaybackOverride | null>(null)
  const [unmutedIndex, setUnmutedIndex] = useState<number | null>(null)
  const [failedClip, setFailedClip] = useState<number | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [visibleRatio, setVisibleRatio] = useState(0)
  const [pageVisible, setPageVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const selectedClip = wrapVideoIndex(centered - padding, items.length)
  const centeredOnVideo = centered >= padding && centered < padding + items.length && Boolean(items[selectedClip]?.videoUrl)
  const override = playbackOverride?.index === selectedClip ? playbackOverride.mode : undefined
  const hoverPreview = hoveredSlot === centered && visibleRatio >= hoverVisibility
  const manualIndex = centeredOnVideo && override === "manual" ? selectedClip : undefined
  const previewIndex = centeredOnVideo && centered === settledCenter && !override && failedClip !== selectedClip &&
    pageVisible && !reducedMotion && (visibleRatio >= autoplayVisibility || hoverPreview) ? selectedClip : undefined
  const activeIndex = manualIndex ?? previewIndex

  useEffect(() => {
    setPlaybackOverride((current) => current?.index === selectedClip ? current : null)
  }, [selectedClip])

  useEffect(() => {
    const list = track.current
    if (!list) return

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncMotion = () => setReducedMotion(motion.matches)
    const syncVisibility = () => setPageVisible(!document.hidden)
    syncMotion()
    syncVisibility()
    motion.addEventListener("change", syncMotion)
    document.addEventListener("visibilitychange", syncVisibility)

    const observer = new IntersectionObserver(([entry]) => {
      setVisibleRatio(entry.intersectionRatio)
    }, { threshold: [hoverVisibility, autoplayVisibility] })
    observer.observe(list)

    return () => {
      observer.disconnect()
      motion.removeEventListener("change", syncMotion)
      document.removeEventListener("visibilitychange", syncVisibility)
    }
  }, [track])

  useEffect(() => {
    setUnmutedIndex((current) => current === activeIndex ? current : null)
    if (activeIndex === undefined) return
    const video = players.current[activeIndex]
    if (!video) return

    return () => {
      if (document.activeElement === video) video.blur()
      video.pause()
      video.muted = true
      video.load()
    }
  }, [activeIndex])

  useEffect(() => {
    if (previewIndex === undefined) return
    const video = players.current[previewIndex]
    if (!video) return

    let requested = true
    video.muted = true
    void video.play().catch(() => {
      if (!requested) return
      setPlaybackOverride((current) => current ?? { index: previewIndex, mode: "paused" })
    })
    return () => { requested = false }
  }, [previewIndex])

  useEffect(() => {
    if (manualIndex !== undefined) players.current[manualIndex]?.focus({ preventScroll: true })
  }, [manualIndex])

  useEffect(() => {
    if (manualIndex !== undefined && (!pageVisible || visibleRatio < hoverVisibility)) {
      players.current[manualIndex]?.pause()
    }
  }, [manualIndex, pageVisible, visibleRatio])

  function previewOnHover(slot: number, pointerType: string) {
    if (pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      setHoveredSlot(slot)
    }
  }

  function togglePlayback(index: number, slot: number, isPreviewCopy: boolean) {
    if (centerIfNeeded(slot) || isPreviewCopy) return
    if (manualIndex === index) {
      setPlaybackOverride({ index, mode: "paused" })
      return
    }
    void players.current[index]?.play().catch(() => undefined)
    setFailedClip(null)
    setPlaybackOverride({ index, mode: "manual" })
  }

  function toggleSound(index: number) {
    const video = players.current[index]
    if (!video) return

    const enableSound = video.muted || video.volume === 0
    if (enableSound && video.volume === 0) video.volume = 1
    video.muted = !enableSound
    if (enableSound && previewIndex === index && video.paused) {
      void video.play().catch(() => undefined)
    }
  }

  function handleArrowKey(event: KeyboardEvent<HTMLUListElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    move(event.key === "ArrowLeft" ? -1 : 1)
  }

  return (
    <section
      id="storefront-social-heading"
      aria-label={heading}
      className="scroll-mt-20 bg-gradient-to-br from-[#fdf2f2] to-[#fae8e8]"
    >
      <div className={`${styles.carousel} relative`}>
        <ul
          ref={track}
          id="storefront-social-videos"
          tabIndex={0}
          aria-label={heading}
          onKeyDown={handleArrowKey}
          onPointerDown={resetScrollTarget}
          onWheel={resetScrollTarget}
          className={`${styles.track} grid snap-x snap-mandatory grid-flow-col overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-safe:scroll-smooth`}
        >
          {Array.from({ length: items.length + padding * 2 }, (_, slot) => {
            const index = wrapVideoIndex(slot - padding, items.length)
            const clip = items[index]
            const isPreviewCopy = slot < padding || slot >= padding + items.length
            const isActive = !isPreviewCopy && activeIndex === index
            const isManual = !isPreviewCopy && manualIndex === index
            const isPreview = !isPreviewCopy && previewIndex === index
            const hasSound = unmutedIndex === index
            const offset = slot - centered
            const needsCentering = offset !== 0
            return (
              <li
                key={slot}
                className={`${styles.slide} min-w-0 snap-center`}
                aria-hidden={isPreviewCopy || undefined}
                onMouseDown={isPreviewCopy ? (event) => event.preventDefault() : undefined}
                data-centered={!needsCentering}
                data-distance={Math.min(2, Math.abs(offset))}
                data-side={offset < 0 ? "left" : offset > 0 ? "right" : undefined}
              >
                <div
                  className={`${styles.frame} relative overflow-hidden rounded-[6px] bg-[#e9dedb]`}
                  onPointerEnter={isPreviewCopy || !clip.videoUrl ? undefined : (event) => previewOnHover(slot, event.pointerType)}
                  onPointerLeave={() => setHoveredSlot((current) => current === slot ? null : current)}
                >
                  {clip.videoUrl && !isPreviewCopy ? (
                    <video
                      ref={(element) => { players.current[index] = element }}
                      src={clip.videoUrl}
                      poster={clip.posterUrl}
                      preload="none"
                      aria-label={clip.title}
                      aria-hidden={!isManual || undefined}
                      tabIndex={isManual ? 0 : -1}
                      className={`size-full ${mediaGrade} ${isManual ? "bg-[#261b20] object-contain" : "object-cover object-[center_42%]"}`}
                      controls={isManual}
                      loop={isPreview}
                      muted
                      playsInline
                      onVolumeChange={(event) => {
                        const { muted, volume } = event.currentTarget
                        setUnmutedIndex((current) => {
                          if (isActive && !muted && volume > 0) return index
                          return current === index ? null : current
                        })
                      }}
                      onError={() => {
                        if (!isActive) return
                        setFailedClip(index)
                        setPlaybackOverride((current) => current?.index === index ? null : current)
                      }}
                    />
                  ) : (
                    <Image
                      src={clip.posterUrl}
                      alt={isPreviewCopy ? "" : clip.title}
                      fill
                      unoptimized
                      sizes="(min-width: 40rem) clamp(13.5rem, 22vw, 32rem), min(76vw, 25rem)"
                      className={`object-cover object-[center_42%] ${mediaGrade}`}
                    />
                  )}
                  {clip.videoUrl || isPreviewCopy ? (
                    <button
                      type="button"
                      ref={!isPreviewCopy && !needsCentering ? centerControl : undefined}
                      tabIndex={isPreviewCopy ? -1 : undefined}
                      aria-label={t(isManual ? "closeVideo" : needsCentering || isPreviewCopy ? "selectVideo" : "playVideo", { title: clip.title })}
                      className={isManual ? cornerButton : `group absolute inset-0 ${mediaFocus}`}
                      onClick={() => togglePlayback(index, slot, isPreviewCopy)}
                    >
                      {!isPreview && (
                        <span className={`${cornerIcon} ${isManual ? "" : "absolute top-2 right-2"} ${needsCentering ? "opacity-0 group-focus-visible:opacity-100" : ""}`}>
                          {isManual ? <X className="size-3.5" strokeWidth={1.35} aria-hidden />
                            : clip.videoUrl ? <Play className="size-3" strokeWidth={1.5} aria-hidden />
                              : <ArrowUpRight className="size-3.5" strokeWidth={1.35} aria-hidden />}
                        </span>
                      )}
                    </button>
                  ) : (
                    <a
                      href={clip.socialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t(needsCentering ? "selectVideo" : "openVideo", { title: clip.title })}
                      onClick={(event) => { if (centerIfNeeded(slot)) event.preventDefault() }}
                      className={`absolute inset-0 ${mediaFocus}`}
                    >
                      <span className={`${cornerIcon} absolute top-2 right-2 ${needsCentering ? "opacity-0" : ""}`}>
                        <ArrowUpRight className="size-3.5" strokeWidth={1.35} aria-hidden />
                      </span>
                    </a>
                  )}
                  {isActive && (
                    <button
                      type="button"
                      aria-label={t(hasSound ? "muteVideo" : "unmuteVideo", { title: clip.title })}
                      className={`absolute top-0 right-11 grid size-11 place-items-center ${mediaFocus}`}
                      onClick={() => toggleSound(index)}
                    >
                      <span className={cornerIcon}>
                        {hasSound ? <Volume2 className="size-3.5" strokeWidth={1.5} aria-hidden />
                          : <VolumeX className="size-3.5" strokeWidth={1.5} aria-hidden />}
                      </span>
                    </button>
                  )}
                  {isPreview && (
                    <button
                      type="button"
                      aria-label={t("pauseVideo", { title: clip.title })}
                      className={cornerButton}
                      onClick={() => {
                        setPlaybackOverride({ index, mode: "paused" })
                        centerControl.current?.focus({ preventScroll: true })
                      }}
                    >
                      <span className={cornerIcon}>
                        <Pause className="size-3" strokeWidth={1.5} aria-hidden />
                      </span>
                    </button>
                  )}
                  <div className={styles.productOverlay} data-controls={isManual || undefined}>
                    {clip.product ? (
                      <Link
                        href={clip.productUrl}
                        tabIndex={isPreviewCopy ? -1 : undefined}
                        prefetch={false}
                        className={`${overlayAction} group flex min-w-0 flex-1 items-center gap-2.5`}
                      >
                        <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm bg-[#fef2f2]">
                          {clip.product.image ? (
                            <Image src={clip.product.image} alt="" fill sizes="48px" className="object-cover object-top" />
                          ) : (
                            <ShoppingBag aria-hidden="true" className="size-4 text-primary/65" strokeWidth={1.5} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          {clip.relatedProduct && <span className="block text-[10px] leading-4 text-[#f8dce5]">{t("relatedProduct")}</span>}
                          <span className="line-clamp-2 text-[13px] leading-4">{clip.product.title}</span>
                          <span className="mt-1 block text-xs leading-4 tabular-nums text-[#f8dce5]">{clip.product.price}</span>
                        </span>
                        <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-[#f8dce5] motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" strokeWidth={1.5} />
                      </Link>
                    ) : clip.productUrl ? (
                      <Link href={clip.productUrl} tabIndex={isPreviewCopy ? -1 : undefined} prefetch={false}
                        className={`${overlayAction} flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-[13px] leading-4`}>
                        <span className="line-clamp-2">{clip.title}</span>
                        <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.5} />
                      </Link>
                    ) : (
                      <span className="flex-1 text-[13px] leading-4">{clip.title}</span>
                    )}
                    {!isPreviewCopy && clip.videoUrl && clip.socialUrl && (
                      <a
                        href={clip.socialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("openVideo", { title: clip.title })}
                        className={`${overlayAction} grid size-11 shrink-0 place-items-center text-[#f8dce5] hover:text-white`}
                      >
                        <ArrowUpRight className="size-3.5" strokeWidth={1.35} aria-hidden />
                      </a>
                    )}
                  </div>
                </div>
                {!isPreviewCopy && failedClip === index && <p role="status" className="mt-1 text-xs text-[#642b43]">{t("videoError")}</p>}
              </li>
            )
          })}
        </ul>
        {items.length > 1 && (
          <div className={`${styles.navigation} flex`}>
            <button type="button" aria-label={t("previousVideos")} aria-controls="storefront-social-videos"
              className={navigationButton} onClick={() => move(-1)}>
              <ChevronLeft className="size-4 sm:size-5" strokeWidth={1.35} aria-hidden />
            </button>
            <button type="button" aria-label={t("nextVideos")} aria-controls="storefront-social-videos"
              className={navigationButton} onClick={() => move(1)}>
              <ChevronRight className="size-4 sm:size-5" strokeWidth={1.35} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
