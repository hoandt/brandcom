import { z } from "zod"

export const homepageMediaNames = {
  "logo-marquee": "Logo Marquee",
  "video-social-preview": "Social Video Preview",
} as const

export type HomepageMediaType = keyof typeof homepageMediaNames

export function isHomepageMediaType(value: unknown): value is HomepageMediaType {
  return value === "logo-marquee" || value === "video-social-preview"
}

function isPublicUrl(value: string) {
  if (/[\\\s]/u.test(value)) return false
  if (value.startsWith("/")) return !value.startsWith("//")
  if (!/^https:\/\//i.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

const publicUrl = z.string().trim().max(2048).refine(isPublicUrl, {
  message: "Use an HTTPS URL or a path starting with /.",
})
const optionalUrl = z.union([z.literal(""), publicUrl]).default("")
const heading = z.string().trim().max(120).default("")
const dimension = z.number().int().positive()
const logoCrop = z.object({
  left: z.number().int().nonnegative(),
  top: z.number().int().nonnegative(),
  width: dimension,
  height: dimension,
  sourceWidth: dimension,
  sourceHeight: dimension,
  displayHeight: dimension,
}).refine(({ left, top, width, height, sourceWidth, sourceHeight }) =>
  left + width <= sourceWidth && top + height <= sourceHeight, {
  message: "The logo crop must fit within the image.",
})

export const logoMarqueeSchema = z.object({
  heading,
  items: z.array(z.object({
    name: z.string().trim().min(1, "Enter a retailer name.").max(100),
    imageUrl: publicUrl,
    href: optionalUrl,
    crop: logoCrop.optional(),
  })).default([]),
})

export const socialVideoSchema = z.object({
  heading,
  includeBundledVideos: z.boolean().optional(),
  items: z.array(z.object({
    title: z.string().trim().min(1, "Enter a video title.").max(120),
    posterUrl: publicUrl,
    videoUrl: optionalUrl,
    socialUrl: optionalUrl,
    productUrl: optionalUrl,
  }).refine(({ videoUrl, socialUrl }) => Boolean(videoUrl || socialUrl), {
    message: "Add a direct video URL or a link to the social post.",
    path: ["videoUrl"],
  })).default([]),
})

export type LogoMarqueeContent = z.infer<typeof logoMarqueeSchema>
export type SocialVideoContent = z.infer<typeof socialVideoSchema>
export type SocialVideoClip = SocialVideoContent["items"][number] & { relatedProduct?: boolean }

export type SocialVideoFeedItem = SocialVideoClip & {
  product?: { title: string; image?: string; price: string }
}

export function validateHomepageMedia(code: string, type: unknown, content: unknown) {
  if (code !== type || !isHomepageMediaType(type)) {
    return { error: "The homepage component type must match its component code." }
  }

  const schema = type === "logo-marquee" ? logoMarqueeSchema : socialVideoSchema
  const result = schema.safeParse(content)
  if (result.success) return { content: result.data }

  const issue = result.error.issues[0]
  const field = issue.path.join(".")
  return { error: field ? `${field} — ${issue.message}` : issue.message }
}
