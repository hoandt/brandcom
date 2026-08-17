import Link from "next/link"

interface TopbarProps {
  data: any
}

export function Topbar({ data }: TopbarProps) {
  if (!data || !data.text) return null

  const backgroundColor = data.backgroundColor || "var(--primary)"
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
