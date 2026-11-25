import { getTranslations } from "next-intl/server"
import { getDynamicComponent } from "@/lib/dynamic-components"
import { logoMarqueeSchema, socialVideoSchema } from "@/lib/homepage-media"
import { LogoMarquee } from "./logo-marquee"
import { SocialVideoPreview } from "./social-video-preview"

export async function HomepageMedia({ locale }: { locale: string }) {
  const [logoContent, videoContent, t] = await Promise.all([
    getDynamicComponent<unknown>("logo-marquee"),
    getDynamicComponent<unknown>("video-social-preview"),
    getTranslations({ locale, namespace: "Homepage.media" }),
  ])
  const logos = logoMarqueeSchema.safeParse(logoContent)
  const videos = socialVideoSchema.safeParse(videoContent)

  return (
    <>
      {logos.success && logos.data.items.length > 0 && (
        <LogoMarquee content={logos.data} heading={logos.data.heading || t("retailers")} />
      )}
      {videos.success && videos.data.items.length > 0 && (
        <SocialVideoPreview content={videos.data} heading={videos.data.heading || t("socialVideos")} locale={locale} />
      )}
    </>
  )
}
