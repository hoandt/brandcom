"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { explorerCollections, type ExplorerCollection } from "@/lib/collection-explorer"

function ExplorerFrame({ subject, selected, className }: {
  subject: "campaign" | "detail"
  selected: ExplorerCollection
  className: string
}) {
  const sizes = subject === "campaign"
    ? "(min-width: 90rem) 720px, (min-width: 64rem) 52vw, 92vw"
    : "(min-width: 90rem) 265px, (min-width: 64rem) 19vw, 28vw"

  return (
    <div className={className}>
      {explorerCollections.map((collection) => {
        const photo = collection[subject]
        const active = collection.slug === selected.slug

        return (
          <Image
            key={collection.slug}
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={sizes}
            aria-hidden={!active || undefined}
            data-selected={active}
            className="object-cover opacity-0 data-[selected=true]:opacity-100 motion-safe:transition-opacity motion-safe:duration-500"
            style={{ objectPosition: photo.position }}
          />
        )
      })}
    </div>
  )
}

export function CollectionExplorer({ locale }: { locale: string }) {
  const [selected, setSelected] = useState(explorerCollections[0])

  return (
    <section
      id="collection-explorer"
      aria-label="Collection Explorer"
      className="storefront-container grid scroll-mt-20 gap-y-5 bg-[#fbf8f3] py-10 sm:py-12 lg:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-8 lg:gap-y-0 lg:py-16 xl:gap-x-14"
    >
      <ul
        className="flex min-w-0 gap-x-5 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] motion-safe:scroll-smooth lg:col-start-1 lg:row-start-2 lg:flex-col lg:items-start lg:gap-y-3 lg:overflow-visible lg:p-0"
      >
        {explorerCollections.map((collection) => (
          <li key={collection.slug} className="shrink-0">
            <button
              type="button"
              aria-pressed={collection.slug === selected.slug}
              onClick={(event) => {
                setSelected(collection)
                event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })
              }}
              className="min-h-11 cursor-pointer rounded-[3px] border-b border-transparent px-0.5 py-2 text-left font-sans text-sm font-normal leading-tight whitespace-nowrap text-[#73615b] hover:text-[#30201b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67483d] aria-pressed:border-[#67483d] aria-pressed:text-[#30201b] sm:text-base lg:min-h-0 lg:border-0 lg:px-0 lg:py-1.5 lg:text-[clamp(2rem,3.3vw,3.25rem)] lg:tracking-[-0.035em]"
            >
              {collection.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="relative min-w-0 pl-[8%] lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:pl-[15%]">
        <ExplorerFrame
          subject="campaign"
          selected={selected}
          className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-[#f1e5df]"
        />
        <ExplorerFrame
          subject="detail"
          selected={selected}
          className="absolute bottom-[7%] left-0 aspect-[3/4] w-[25%] overflow-hidden rounded-[7px] bg-[#f1e5df] ring-1 ring-[#fbf8f3] lg:bottom-[4%] lg:w-[28%] lg:rounded-[9px]"
        />
      </div>

      <Link
        href={`/${locale}/collections/${selected.slug}`}
        prefetch={false}
        className="inline-flex min-h-11 w-fit max-w-full items-center gap-3 justify-self-start rounded-[4px] border border-[#8d7467] px-4 py-2.5 font-sans text-sm font-medium leading-tight text-[#382921] hover:bg-[#f0e5dc] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#67483d] lg:col-start-1 lg:row-start-3 lg:mt-6"
      >
        <span>{selected.cta}</span>
        <ArrowRight className="size-4 shrink-0" strokeWidth={1.4} aria-hidden />
      </Link>
    </section>
  )
}
