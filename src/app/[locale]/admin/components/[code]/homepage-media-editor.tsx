"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { HomepageMediaType, LogoMarqueeContent, SocialVideoContent } from "@/lib/homepage-media"
import { ArrowDown, ArrowUp, Plus, Trash } from "lucide-react"
import { useTranslations } from "next-intl"

type Logo = LogoMarqueeContent["items"][number]
type Clip = SocialVideoContent["items"][number]
type MediaField = keyof Logo | keyof Clip
type EditorValue = {
  heading?: string
  includeBundledVideos?: boolean
  items?: (Logo | Clip)[]
}

function UrlField({ label, value, onChange, onUpload, video }: {
  label: string
  value: string
  onChange: (url: string) => void
  onUpload?: (file: File) => Promise<string>
  video?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="grid gap-2 text-sm font-medium">
        {label}
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={video ? "https://…/clip.mp4" : "https://… or /path"}
        />
      </label>
      {onUpload && (
        <Input
          type="file"
          aria-label={video ? "Upload video" : `Upload ${label.toLowerCase()}`}
          accept={video ? "video/mp4,video/webm" : "image/png,image/jpeg,image/webp,image/svg+xml,image/avif"}
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ""
            if (!file) return
            try {
              onChange(await onUpload(file))
            } catch {
              // The form reports the upload error next to the save controls.
            }
          }}
        />
      )}
    </div>
  )
}

export function HomepageMediaEditor({ type, value, onChange, onUpload }: {
  type: HomepageMediaType
  value: EditorValue | null
  onChange: (value: EditorValue) => void
  onUpload: (file: File) => Promise<string>
}) {
  const isLogo = type === "logo-marquee"
  const t = useTranslations("Homepage.media")
  const items = Array.isArray(value?.items) ? value.items : []
  const itemLabel = isLogo ? "logo" : "video"

  function setItems(nextItems: EditorValue["items"]) {
    onChange({ ...value, items: nextItems })
  }

  function updateItem(index: number, field: MediaField, fieldValue: string) {
    setItems(items.map((item, position) => {
      if (position !== index) return item
      if (field === "imageUrl" && "imageUrl" in item && fieldValue !== item.imageUrl) {
        return { ...item, imageUrl: fieldValue, crop: undefined }
      }
      return { ...item, [field]: fieldValue }
    }))
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextItems = [...items]
    const [item] = nextItems.splice(index, 1)
    nextItems.splice(index + direction, 0, item)
    setItems(nextItems)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="homepage-media-heading">Heading (optional)</Label>
          <Input
            id="homepage-media-heading"
            value={value?.heading ?? ""}
            placeholder={isLogo ? "Cửa hàng offline" : "The Auria Edit"}
            maxLength={120}
            onChange={(event) => onChange({ ...value, heading: event.target.value })}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLogo
          ? "Add retailer names and logo images. A destination link is optional."
          : "Use a vertical cover image for each clip. Upload an MP4 or WebM for inline playback, or link to a social post."}
      </p>

      {!isLogo && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={value?.includeBundledVideos !== false}
            onChange={(event) => onChange({ ...value, includeBundledVideos: event.target.checked })}
            className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          {t("includeBundledVideos")}
        </label>
      )}

      {items.map((item, index) => (
        <div key={index} className="space-y-4 border bg-muted/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold capitalize">{itemLabel} {index + 1}</h3>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label={`Move ${itemLabel} ${index + 1} up`}
                disabled={index === 0} onClick={() => moveItem(index, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Move ${itemLabel} ${index + 1} down`}
                disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>
                <ArrowDown className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="text-destructive"
                aria-label={`Remove ${itemLabel} ${index + 1}`}
                onClick={() => setItems(items.filter((_, position) => position !== index))}>
                <Trash className="size-4" />
              </Button>
            </div>
          </div>

          {"imageUrl" in item ? (
            <>
              <label className="grid gap-2 text-sm font-medium">
                Retailer name
                <Input value={item.name} maxLength={100} required onChange={(event) => updateItem(index, "name", event.target.value)} />
              </label>
              <UrlField label="Logo image" value={item.imageUrl} onChange={(url) => updateItem(index, "imageUrl", url)} onUpload={onUpload} />
              <UrlField label="Destination link (optional)" value={item.href} onChange={(url) => updateItem(index, "href", url)} />
            </>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-medium">
                Video title
                <Input value={item.title} maxLength={120} required onChange={(event) => updateItem(index, "title", event.target.value)} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <UrlField label="Cover image" value={item.posterUrl} onChange={(url) => updateItem(index, "posterUrl", url)} onUpload={onUpload} />
                <UrlField label="Direct video URL" value={item.videoUrl} onChange={(url) => updateItem(index, "videoUrl", url)} onUpload={onUpload} video />
                <UrlField label="Social post link" value={item.socialUrl} onChange={(url) => updateItem(index, "socialUrl", url)} />
                <UrlField label="Product link (optional)" value={item.productUrl} onChange={(url) => updateItem(index, "productUrl", url)} />
              </div>
            </>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setItems([...items, isLogo
          ? { name: "", imageUrl: "", href: "" }
          : { title: "", posterUrl: "", videoUrl: "", socialUrl: "", productUrl: "" }])}
      >
        <Plus className="mr-2 size-4" /> Add {itemLabel}
      </Button>
    </div>
  )
}
