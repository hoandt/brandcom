"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { isProductDetailsPath } from "./product-urgency"

interface TopbarProps {
  data?: {
    text?: string
    href?: string
    backgroundColor?: string
    textColor?: string
    speed?: number
  } | null
}

export function Topbar({ data }: TopbarProps) {
  const pathname = usePathname()
  const locale = useLocale()
  if (!data || !data.text) return null

  if (pathname === `/${locale}` || pathname === "/" || isProductDetailsPath(pathname)) {
    const className = "block w-full bg-[#faedf0] px-4 py-1.5 text-center text-[0.8125rem] leading-4 text-[#693448]"

    return data.href ? (
      <Link href={data.href} className={className}>{data.text}</Link>
    ) : (
      <p className={className}>{data.text}</p>
    )
  }

  const backgroundColor =
    !data.backgroundColor || data.backgroundColor.toLowerCase() === "#e11d48"
      ? "var(--primary)"
      : data.backgroundColor
  const textColor = data.textColor || "#ffffff"
  const speed = data.speed || 20
  
  // Create an array to repeat the text so it fills the screen for continuous scrolling
  const repeatCount = 10
  const items = Array.from({ length: repeatCount }, (_, i) => i)

  const content = (
    <div className="flex w-full overflow-hidden" style={{ backgroundColor, color: textColor }}>
      <div className="flex shrink-0 min-w-full justify-around gap-8 animate-marquee py-2 text-xs font-semibold tracking-wider uppercase pl-8" style={{ animationDuration: `${speed}s` }}>
        {items.map((i) => (
          <span key={i}>{data.text}</span>
        ))}
      </div>
      <div className="flex shrink-0 min-w-full justify-around gap-8 animate-marquee py-2 text-xs font-semibold tracking-wider uppercase pl-8" aria-hidden="true" style={{ animationDuration: `${speed}s` }}>
        {items.map((i) => (
          <span key={i}>{data.text}</span>
        ))}
      </div>
    </div>
  )

  if (data.href) {
    return (
      <Link href={data.href} className="block w-full relative z-[60] overflow-hidden group animate-in fade-in slide-in-from-top-4 duration-500">
        {content}
      </Link>
    )
  }

  return <div className="w-full relative z-[60] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">{content}</div>
}
