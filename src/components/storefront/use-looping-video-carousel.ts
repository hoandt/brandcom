"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"

const desktopLayoutQuery = "(min-width: 40rem)"
const previewCount = 5

export function wrapVideoIndex(index: number, count: number) {
  return count > 0 ? ((index % count) + count) % count : 0
}

function centerOffset(list: HTMLUListElement, slide: Element) {
  const box = slide.getBoundingClientRect()
  return box.left + box.width / 2 - (list.getBoundingClientRect().left + list.clientWidth / 2)
}

function nearestSlide(list: HTMLUListElement) {
  const first = list.children[0]
  const second = list.children[1]
  if (!first || !second) return 0

  const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left
  return step > 0
    ? Math.max(0, Math.min(list.children.length - 1, Math.round(-centerOffset(list, first) / step)))
    : 0
}

function scrollToCenter(list: HTMLUListElement, slide: Element, behavior?: ScrollBehavior) {
  list.scrollTo({ left: list.scrollLeft + centerOffset(list, slide), behavior })
}

function scrollDestination(index: number, count: number, padding: number) {
  // Leave previews visible on both sides of the covers used to cross a seam.
  const first = padding ? padding - 2 : 0
  const last = padding ? padding + count + 1 : count - 1
  return Math.max(first, Math.min(last, index))
}

export function useLoopingVideoCarousel(count: number) {
  const padding = count > 1 ? previewCount : 0
  const track = useRef<HTMLUListElement>(null)
  const scrollTarget = useRef<number | null>(null)
  const initialized = useRef(false)
  const [centered, setCentered] = useState(padding)

  useLayoutEffect(() => {
    const element = track.current
    if (!element || count === 0) return
    const list = element
    scrollTarget.current = null

    if (!initialized.current) {
      initialized.current = true
      if (list.scrollLeft <= 1) {
        const initialIndex = window.matchMedia(desktopLayoutQuery).matches
          ? Math.min(2, Math.floor((count - 1) / 2))
          : 0
        scrollToCenter(list, list.children[padding + initialIndex], "instant")
      }
    }

    let previousCenter = nearestSlide(list)
    let viewportWidth = list.clientWidth
    let frame: number | null = null
    let timer: number | null = null
    let touching = false
    const hasScrollEnd = Reflect.has(list, "onscrollend")

    function finishScroll() {
      if (touching) return
      const visible = nearestSlide(list)
      const canonical = padding + wrapVideoIndex(visible - padding, count)

      if (visible !== canonical) {
        if (scrollTarget.current !== null) scrollTarget.current += canonical - visible

        // Swap the matching poster and video positions before the next paint.
        list.dataset.rebasing = "true"
        scrollToCenter(list, list.children[canonical], "instant")
        flushSync(() => setCentered(canonical))
        list.getBoundingClientRect()
        delete list.dataset.rebasing
      } else {
        setCentered(canonical)
      }
      previousCenter = canonical

      const target = scrollTarget.current
      if (target === canonical) scrollTarget.current = null
      else if (target !== null) {
        scrollToCenter(list, list.children[scrollDestination(target, count, padding)])
      }
    }

    function scheduleFallback() {
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(finishScroll, 130)
    }

    function queuePosition() {
      if (frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null
          previousCenter = nearestSlide(list)
          setCentered(previousCenter)
        })
      }
      if (!hasScrollEnd) scheduleFallback()
    }

    const startTouch = () => { touching = true }
    const endTouch = (event: TouchEvent) => {
      touching = event.touches.length > 0
      if (!touching) scheduleFallback()
    }
    const observer = new ResizeObserver(() => {
      if (viewportWidth !== list.clientWidth) {
        viewportWidth = list.clientWidth
        scrollTarget.current = null
        const canonical = padding + wrapVideoIndex(previousCenter - padding, count)
        scrollToCenter(list, list.children[canonical], "instant")
      }
      queuePosition()
    })
    observer.observe(list)
    list.addEventListener("scroll", queuePosition, { passive: true })
    if (hasScrollEnd) {
      list.addEventListener("scrollend", finishScroll)
    } else {
      list.addEventListener("touchstart", startTouch, { passive: true })
      list.addEventListener("touchend", endTouch, { passive: true })
      list.addEventListener("touchcancel", endTouch, { passive: true })
    }
    setCentered(previousCenter)
    if (previousCenter < padding || previousCenter >= padding + count) scheduleFallback()

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      if (timer !== null) window.clearTimeout(timer)
      observer.disconnect()
      list.removeEventListener("scroll", queuePosition)
      list.removeEventListener("scrollend", finishScroll)
      list.removeEventListener("touchstart", startTouch)
      list.removeEventListener("touchend", endTouch)
      list.removeEventListener("touchcancel", endTouch)
    }
  }, [count, padding])

  function requestSlide(list: HTMLUListElement, index: number) {
    const destination = scrollDestination(index, count, padding)
    const previous = scrollTarget.current
    const slide = list.children[destination]
    if (index === destination && destination >= padding && destination < padding + count &&
        Math.abs(centerOffset(list, slide)) < 1) {
      scrollTarget.current = null
      if (previous !== null) scrollToCenter(list, slide, "instant")
      return
    }
    scrollTarget.current = index
    if (previous !== null && scrollDestination(previous, count, padding) === destination) return
    scrollToCenter(list, slide)
  }

  function move(direction: -1 | 1) {
    const list = track.current
    if (!list || count < 2) return
    requestSlide(list, (scrollTarget.current ?? nearestSlide(list)) + direction)
  }

  function centerIfNeeded(index: number) {
    const list = track.current
    if (!list || nearestSlide(list) === index) return false
    requestSlide(list, index)
    return true
  }

  function resetScrollTarget() {
    scrollTarget.current = null
  }

  return { track, centered, padding, move, centerIfNeeded, resetScrollTarget, scrollTarget }
}
